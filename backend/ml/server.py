"""SmartLoc ML inference service.

Loads the trained XGBoost model (smartloc_xgb_model.joblib, R²=0.8447 on test),
generates per-month suitability scores for a chosen business type, then composites
that with price/competition/footfall data to rank Nuwara Eliya areas.

Run:
    cd backend/ml
    pip install -r requirements.txt
    uvicorn server:app --port 8001 --reload
"""

from __future__ import annotations

from pathlib import Path

import os
import time

import joblib
import numpy as np
import requests
import shap
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from features import (
    AVG_PROFIT_PER_CUSTOMER_LKR,
    BUSINESS_MEDIANS,
    FEATURE_ORDER,
    MONTH_NAMES,
    MONTHLY_FEATURES,
    NUWARA_ELIYA_AREAS,
    NUWARA_ELIYA_AREAS_FALLBACK,
)

# Plain-English labels for the 24 raw feature names so the UI can show
# "Walk-in customer demand" rather than "est_daily_visitors".
FEATURE_DISPLAY_NAMES: dict[str, str] = {
    "category_encoded": "Business category",
    "rating": "Customer rating",
    "review_log": "Review volume",
    "confidence_score": "Reputation strength",
    "rating_vs_type": "Rating vs. peers",
    "review_popularity": "Online popularity",
    "is_above_median_rating": "Above-average rating",
    "competition_density": "Similar businesses nearby",
    "digital_presence": "Online presence",
    "month": "Month of year",
    "is_peak": "Peak season",
    "is_monsoon": "Monsoon season",
    "off_peak_severity": "Off-peak drop",
    "avg_temp": "Temperature",
    "precip_mm": "Rainfall",
    "humidity": "Humidity",
    "rainy_days": "Rainy days",
    "sun_hours": "Sunshine hours",
    "avg_arrivals": "Tourist arrivals",
    "std_arrivals": "Tourist volatility",
    "events_count": "Local events",
    "event_impact": "Event tourism impact",
    "est_daily_visitors": "Walk-in customer demand",
    "seasonality_index": "Seasonality strength",
}

MODEL_PATH = Path(__file__).parent / "smartloc_xgb_model.joblib"


# ----------------------------- schemas -----------------------------

class PredictRequest(BaseModel):
    business_type: str = Field(alias="businessType")
    land_intent: str = Field("rent", alias="landIntent")
    amount: float = 0
    preferred_area: str | None = Field(default=None, alias="preferredArea")
    # Optional opening-month override (1..12). When provided, area ranking uses
    # that month's monthly features instead of the model's auto-detected peak
    # month. Used by the what-if simulator's "Open in May / December / ..." chips
    # and by future Phase 5 mode tabs.
    month: int | None = Field(default=None, ge=1, le=12)

    model_config = {"populate_by_name": True}


class MonthlyScore(BaseModel):
    month: int
    name: str
    score: float
    is_peak: bool
    is_monsoon: bool


class BudgetFit(BaseModel):
    score: int           # 0..100 affordability score (NOT a model feature)
    status: str          # "Within budget" / "Slightly above budget" / "Stretch option" / "Unaffordable"
    message: str


class StartupRisk(BaseModel):
    level: str           # "Low" / "Medium" / "High"
    message: str


class BreakEven(BaseModel):
    monthly_customers: int
    daily_customers: int
    avg_profit_per_customer: int
    message: str


class Confidence(BaseModel):
    level: str           # "High" / "Medium" / "Low"
    reason: str


class Economics(BaseModel):
    typical_rent_lkr: int
    typical_purchase_lkr: int
    budget_delta_pct: float
    budget_fit: BudgetFit


class Advisory(BaseModel):
    customer_types: list[str] = []
    best_for: list[str] = []
    main_risk: str = ""
    strategy: str = ""
    recommended_action: str = ""
    startup_risk: StartupRisk
    break_even: BreakEven
    confidence: Confidence


class Scores(BaseModel):
    overall_match: int       # composite (0.7 model + 0.2 budget + 0.1 preference)
    model_score: float       # XGBoost-driven score (same as flat `score` for back-compat)
    budget_fit_score: int    # affordability score (mirrors economics.budget_fit.score)
    preference_score: int    # 100 if matches preferred area or no preference set, 70 otherwise


class AreaRecommendation(BaseModel):
    rank: int                   # displayed rank (after preferred-area pin)
    model_rank: int = 0         # pure XGBoost rank (ignoring preference pin)
    is_preferred_pin: bool = False  # True only when this card was promoted to #1 by the pin
    area: str
    score: float                # clipped+adjusted XGBoost output (0..100)
    model_score: float          # raw model.predict() output (matches SHAP math)
    shap_top_drivers: list["ShapDriver"] = []  # per-area SHAP, top 4 by |impact|
    # Legacy flat fields kept for backward compatibility . frontend currently reads these.
    # New code should prefer the nested `economics`, `advisory`, `scores` objects below.
    budget_fit: float
    footfall_score: float
    competition_score: float
    tags: list[str]
    reasoning: str
    # Structured 4-line reasoning for SME-friendly card rendering.
    reasoning_structured: dict | None = None
    typical_rent_lkr: int
    typical_purchase_lkr: int
    budget_delta_pct: float
    # Nested SME advisory layer (Phase 1+).
    economics: Economics | None = None
    advisory: Advisory | None = None
    scores: Scores | None = None
    # Phase 3: how this area's SHAP differs from the model's #1 area.
    # Empty for the model's top area; up to 3 entries for others.
    main_differences: list[dict] = []
    main_differences_top1_area: str = ""
    # Phase 4: most similar OTHER areas by scaled cosine over area-only features.
    similar_to: list[dict] = []
    # Per-card SHAP audit data . exposed for the expert/professional layer
    # ("Technical details" collapsible on each card). Identity holds:
    # base_value + sum_shap == model_output  ⇒  residual ≈ 0 ⇒ real SHAP.
    shap_math: dict | None = None
    # Full 24-feature SHAP map for this card. Frontend renders top 8 by |impact|
    # inside the technical-details panel for auditing the explanation.
    shap_full: dict[str, float] = {}


class ShapDriver(BaseModel):
    feature: str           # raw feature name (e.g. "est_daily_visitors")
    label: str             # display label (e.g. "Walk-in customer demand")
    shap_value: float      # signed contribution to the predicted score
    feature_value: float   # the input feature value used for this prediction
    direction: str         # "positive" if it raised the score, "negative" if it lowered it


class ShapMeta(BaseModel):
    """Provenance + math-identity check for the SHAP values shown in the UI.

    The drivers themselves live ON each AreaRecommendation (per-area SHAP).
    This block only carries:
      - the library/version/explainer (so the UI can show a "Verified by SHAP" chip)
      - base_value, sum_shap, model_output, residual for the #1 area, so the
        frontend can re-derive (base + Σ shap == model_output) and prove SHAP
        is real (residual should be essentially zero).
    """
    library: str
    library_version: str
    explainer: str
    base_value: float
    sum_shap: float
    model_output: float
    residual: float


class PredictResponse(BaseModel):
    business_type: str
    overall_score: float
    peak_score: float
    low_season_score: float
    best_months: list[int]
    worst_months: list[int]
    monthly_scores: list[MonthlyScore]
    recommendations: list[AreaRecommendation]
    shap_meta: ShapMeta | None = None


# ----------------------------- app -----------------------------

app = FastAPI(title="SmartLoc ML", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----------------------------- areas data source -----------------------------
#
# Areas can be edited by admins through the Laravel admin panel (PUT
# /api/admin/areas/{id}). We fetch them at predict time with a 5-minute
# TTL cache. Laravel's admin controller pings POST /api/ml/refresh_areas
# after every write so the cache flushes immediately on edits.
#
# If Laravel is unreachable, we fall back to NUWARA_ELIYA_AREAS_FALLBACK
# (the static constants in features.py) so /predict never crashes when
# the PHP service is down.

LARAVEL_BASE = os.environ.get("LARAVEL_API_URL", "http://127.0.0.1:8000").rstrip("/")
AREAS_CACHE_TTL_SEC = 300

_areas_cache: list[dict] | None = None
_areas_cache_ts: float = 0.0


def _load_areas() -> list[dict]:
    """Return Nuwara Eliya areas from Laravel, with TTL cache + fallback.

    The first call after process start (or after a refresh ping) hits Laravel.
    Subsequent calls within AREAS_CACHE_TTL_SEC return the cached snapshot.
    On any failure we log and fall back to features.py constants so the
    ML service remains usable even without Laravel running.
    """
    global _areas_cache, _areas_cache_ts
    now = time.time()
    if _areas_cache is not None and (now - _areas_cache_ts) < AREAS_CACHE_TTL_SEC:
        return _areas_cache

    try:
        resp = requests.get(f"{LARAVEL_BASE}/api/areas", timeout=2.0)
        resp.raise_for_status()
        body = resp.json()
        rows = body.get("data") if isinstance(body, dict) else body
        if not isinstance(rows, list) or not rows:
            raise RuntimeError("empty areas list from Laravel")
        _areas_cache = rows
        _areas_cache_ts = now
        return _areas_cache
    except Exception as e:
        # Cache the fallback for a much shorter window so we retry Laravel sooner.
        print(f"[areas] Laravel fetch failed ({e}); using features.py fallback")
        _areas_cache = list(NUWARA_ELIYA_AREAS_FALLBACK)
        _areas_cache_ts = now - (AREAS_CACHE_TTL_SEC - 30)  # retry in 30s
        return _areas_cache


@app.on_event("startup")
def _warm_areas_cache_on_startup():
    """Pre-warm so the first /predict request doesn't pay the HTTP round-trip."""
    try:
        _load_areas()
    except Exception:
        pass


@app.post("/api/ml/refresh_areas")
def refresh_areas():
    """Cache-invalidation hook called by Laravel's admin controller after
    a successful create/update/delete on the areas table. Forces the next
    _load_areas() call to re-fetch. Idempotent and safe to call repeatedly."""
    global _areas_cache, _areas_cache_ts
    _areas_cache = None
    _areas_cache_ts = 0.0
    fresh = _load_areas()
    return {"ok": True, "n_areas": len(fresh) if fresh else 0}


_model = None
_explainer = None


def get_model():
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise RuntimeError(f"Model not found at {MODEL_PATH}")
        _model = joblib.load(MODEL_PATH)
    return _model


def get_explainer():
    """Lazy-build a SHAP TreeExplainer over the loaded XGBoost model.

    TreeExplainer is exact for tree ensembles, so for any input row X:
        model.predict(X)  ==  expected_value + sum(shap_values)
    The frontend re-checks this identity and prints the residual as proof.
    """
    global _explainer
    if _explainer is None:
        _explainer = shap.TreeExplainer(get_model())
    return _explainer


def _explain_prediction(X: np.ndarray) -> dict:
    """Compute the per-feature SHAP contributions for a single prediction.

    Returns a dict matching the ShapExplanation pydantic schema (minus model
    metadata, which the caller fills in).
    """
    explainer = get_explainer()
    raw_values = explainer.shap_values(X)  # shape (1, n_features) for XGBoost regression
    if isinstance(raw_values, list):  # multi-output (defensive . shouldn't trigger here)
        raw_values = raw_values[0]
    sv = np.asarray(raw_values).reshape(-1)  # 1D array of n_features

    base = float(np.asarray(explainer.expected_value).reshape(-1)[0])
    model_out = float(get_model().predict(X)[0])
    sum_shap = float(np.sum(sv))
    residual = base + sum_shap - model_out

    feature_values = X.reshape(-1).tolist()
    drivers = []
    for name, val, fval in zip(FEATURE_ORDER, sv, feature_values):
        drivers.append({
            "feature": name,
            "label": FEATURE_DISPLAY_NAMES.get(name, name),
            "shap_value": float(val),
            "feature_value": float(fval),
            "direction": "positive" if val >= 0 else "negative",
        })
    drivers.sort(key=lambda d: abs(d["shap_value"]), reverse=True)

    return {
        "library": "shap",
        "library_version": shap.__version__,
        "explainer": "TreeExplainer",
        "base_value": round(base, 4),
        "sum_shap": round(sum_shap, 4),
        "model_output": round(model_out, 4),
        "residual": round(residual, 6),
        "top_drivers": drivers[:6],  # return top 6 by absolute impact
    }


# Rule-based adjustments (same 7 rules as in the training notebook):
#   zoning +1, property cost -3, telecom +2, demographics -1, disaster -2,
#   municipal -1, parking +1  =>  net -3
_RULE_ADJUSTMENT = -3


def _feature_vector(business_features: dict, monthly_features: dict) -> np.ndarray:
    combined = {**business_features, **monthly_features}
    row = [combined[k] for k in FEATURE_ORDER]
    return np.asarray(row, dtype=np.float32).reshape(1, -1)


def _area_feature_vector(business_features: dict, monthly_features: dict, area: dict) -> np.ndarray:
    """Build a feature vector specialised for ONE area.

    Several of the 24 model features sensibly vary across Nuwara Eliya
    neighbourhoods. We override them with values derived from the area's real
    profile (footfall_weight, competition_weight) so the XGBoost model can
    distinguish areas . without that substitution, the trees dominate on
    constant business + month features and every area collapses to the same
    leaf, giving identical predictions.
    """
    fw = float(area["footfall_weight"])      # 0..1 . how busy walk-in traffic is
    cw = float(area["competition_weight"])   # 0..1 . how saturated with similar businesses

    # Competition: 0..1 → 30..230 . comparable to training-data spread per category.
    competition_for_area = 30.0 + cw * 200.0

    # Visitors: scale the month's baseline by the area's footfall weight (0.5 = par).
    visitors_for_area = float(monthly_features["est_daily_visitors"]) * (fw / 0.5)

    # Areas with a strong tourism footprint are also where similar businesses have
    # established online presence and higher review activity. We modulate four
    # business-level features so the model has more signal to differentiate areas.
    # All values stay within the ranges the model saw at training time.
    rating_base = float(business_features.get("rating", 4.0))
    review_log_base = float(business_features.get("review_log", 2.5))
    review_pop_base = float(business_features.get("review_popularity", 0.5))

    overrides = {
        "competition_density": competition_for_area,
        "est_daily_visitors": visitors_for_area,
        # High-footfall areas attract more reviews per business
        "review_log": review_log_base * (0.6 + fw * 0.8),
        "review_popularity": min(1.0, review_pop_base * (0.5 + fw)),
        # Above-median rating is more common where competition is high (selection effect)
        "is_above_median_rating": 1.0 if cw > 0.5 else 0.0,
        # Digital presence tracks urban/tourist density
        "digital_presence": 1.0 if fw > 0.5 else 0.0,
        # Confidence in the local average is higher where there are more businesses
        "confidence_score": 1.0 + cw * 2.5,  # 1.0..3.5
    }
    combined = {**business_features, **monthly_features, **overrides}
    row = [combined[k] for k in FEATURE_ORDER]
    return np.asarray(row, dtype=np.float32).reshape(1, -1)


def _score_business_across_months(business_type_key: str) -> list[dict]:
    """Run the XGBoost model for this business type across all 12 months."""
    medians = BUSINESS_MEDIANS[business_type_key]
    model = get_model()
    out = []
    for month in MONTHLY_FEATURES:
        X = _feature_vector(medians, month)
        raw = float(model.predict(X)[0])
        adjusted = float(np.clip(raw + _RULE_ADJUSTMENT, 5, 95))
        out.append({
            "month": int(month["month"]),
            "name": MONTH_NAMES[int(month["month"]) - 1],
            "score": round(adjusted, 2),
            "is_peak": bool(month["is_peak"]),
            "is_monsoon": bool(month["is_monsoon"]),
        })
    return out


# Features that ACTUALLY vary per Nuwara Eliya neighbourhood.
# These are the only features whose SHAP values can differentiate one area
# from another . every other feature is either business-type-fixed or
# month-fixed, so its SHAP value is essentially the same across all areas.
# Surfacing only these in `shap_top_drivers` is what makes each card's
# explanation genuinely about why THIS area got the score it did, instead
# of a global "December cafes are popular" story repeated 12 times.
AREA_VARYING_FEATURES = {
    "competition_density",
    "est_daily_visitors",
    "review_log",
    "review_popularity",
    "is_above_median_rating",
    "digital_presence",
    "confidence_score",
}


def _shap_for_vector(X: np.ndarray) -> tuple[list[dict], dict, dict]:
    """Run SHAP on one feature vector and return (area-varying top drivers, math_check, all_shap_by_feature).

    `top_drivers` is filtered to AREA_VARYING_FEATURES only . those are the
    features whose values differ across neighbourhoods, so their SHAP values
    are what actually explain "why area X beat area Y" rather than "why
    December scores higher than May" (which would be true for every area).

    `math_check` is computed over ALL 24 features (base + Σ shap == model_output)
    so the SHAP identity still holds and proves these are real SHAP values.

    `all_shap_by_feature` is a dict {feature_name: shap_value} over all 24
    features . used by Phase 3 (`_compute_main_differences`) to compute
    cross-area deltas without re-running SHAP.
    """
    explainer = get_explainer()
    raw_values = explainer.shap_values(X)
    if isinstance(raw_values, list):
        raw_values = raw_values[0]
    sv = np.asarray(raw_values).reshape(-1)
    base = float(np.asarray(explainer.expected_value).reshape(-1)[0])
    model_out = float(get_model().predict(X)[0])
    sum_shap = float(np.sum(sv))  # ← still sums over ALL 24 features

    feature_values = X.reshape(-1).tolist()
    all_shap_by_feature: dict[str, float] = {}
    drivers = []
    for name, val, fval in zip(FEATURE_ORDER, sv, feature_values):
        all_shap_by_feature[name] = float(val)
        if name not in AREA_VARYING_FEATURES:
            continue
        drivers.append({
            "feature": name,
            "label": FEATURE_DISPLAY_NAMES.get(name, name),
            "shap_value": float(val),
            "feature_value": float(fval),
            "direction": "positive" if val >= 0 else "negative",
        })
    drivers.sort(key=lambda d: abs(d["shap_value"]), reverse=True)

    math_check = {
        "base_value": round(base, 4),
        "sum_shap": round(sum_shap, 4),
        "model_output": round(model_out, 4),
        "residual": round(base + sum_shap - model_out, 6),
    }
    return drivers[:4], math_check, all_shap_by_feature  # top 4 area-varying drivers per card


# ----------------------------- SME advisory helpers -----------------------------
#
# These translate raw model + area data into SME-friendly business signals.
# They run AFTER XGBoost+SHAP, so the model's prediction is unaffected . they
# add a separate "advisory layer" the frontend renders on each card.

def _compute_budget_fit(amount: float, typical: float) -> dict:
    """How well the user's budget covers this area's typical rent / purchase price.

    Returns a 0..100 score plus a plain-English status the card surfaces directly.
    Budget is NOT an XGBoost feature . this lives outside the model.
    """
    if amount <= 0 or typical <= 0:
        return {"score": 50, "status": "Unknown", "message": "Budget information is not available."}
    ratio = amount / typical
    gap = int(typical - amount)
    if ratio >= 1.0:
        return {"score": 100, "status": "Within budget",
                "message": "This area is within your stated budget."}
    if ratio >= 0.85:
        return {"score": 80, "status": "Slightly above budget",
                "message": f"This area is about LKR {gap:,} above your budget."}
    if ratio >= 0.55:
        return {"score": 50, "status": "Stretch option",
                "message": f"This area is LKR {gap:,} above your budget. Possible only with rent negotiation or strong daily sales."}
    return {"score": 20, "status": "Unaffordable",
            "message": f"This area is LKR {gap:,} above your budget. Significantly out of range."}


def _compute_startup_risk(competition_weight: float, budget_status: str, footfall_weight: float) -> dict:
    """Combine competition saturation, budget pressure, and demand strength into
    a Low / Medium / High risk label with a one-line plain-English explanation.
    Rule-based so it's transparent and deterministic.
    """
    risk = 0
    if competition_weight >= 0.75:
        risk += 2
    elif competition_weight >= 0.5:
        risk += 1
    if budget_status == "Slightly above budget":
        risk += 1
    elif budget_status == "Stretch option":
        risk += 2
    elif budget_status == "Unaffordable":
        risk += 3
    if footfall_weight <= 0.35:
        risk += 2
    elif footfall_weight <= 0.55:
        risk += 1

    if risk >= 5:
        return {"level": "High",
                "message": "This area combines cost, competition or demand pressure that creates real early stage risk."}
    if risk >= 3:
        return {"level": "Medium",
                "message": "Good potential but with business risks worth managing carefully."}
    return {"level": "Low",
            "message": "Relatively safe based on demand, budget, and competition."}


def _compute_break_even(typical_rent: float, business_type_key: str) -> dict:
    """Translate the area's monthly rent into "customers needed per day" given
    a per-business-type average profit-per-customer. Helps SME owners reality-check
    whether the location can sustain itself.
    """
    avg_profit = AVG_PROFIT_PER_CUSTOMER_LKR.get(business_type_key, 400)
    if typical_rent <= 0 or avg_profit <= 0:
        return {"monthly_customers": 0, "daily_customers": 0,
                "avg_profit_per_customer": avg_profit,
                "message": "Break-even estimate unavailable."}
    monthly = max(1, int(np.ceil(typical_rent / avg_profit)))
    daily = max(1, int(np.ceil(monthly / 30)))
    return {
        "monthly_customers": monthly,
        "daily_customers": daily,
        "avg_profit_per_customer": avg_profit,
        "message": (
            f"To cover rent of LKR {int(typical_rent):,}, you would need about {monthly:,} customers per month "
            f"or about {daily} per day, assuming LKR {avg_profit:,} profit per customer."
        ),
    }


def _compute_preference_score(area_name: str, preferred_area: str | None) -> int:
    """100 if no preference set or area matches; 70 otherwise.
    Used in the Overall Match composite (0.7 model + 0.2 budget + 0.1 preference).
    """
    if not preferred_area:
        return 100
    if preferred_area.lower().strip() in area_name.lower():
        return 100
    return 70


def _compute_overall_match(model_score: float, budget_fit_score: int, preference_score: int) -> int:
    """Weighted composite: model 70%, budget 20%, preference 10%.
    The breakdown is shown on the card alongside, so users can see the components.
    """
    return int(round(0.7 * float(model_score) + 0.2 * float(budget_fit_score) + 0.1 * float(preference_score)))


def _compute_similar_areas(scored: list[dict], top_k: int = 2) -> dict:
    """Cosine similarity over scaled, AREA-ONLY features.

    Per user feedback: scale before cosine (otherwise rent dominates), and use
    only the features that DIFFER across neighbourhoods . seasonal/month
    features are constant for the same input and would just inflate similarity.

    Returns a dict { area_name: [{area_name, similarity_pct}, ...] } with the
    top_k most similar OTHER areas for each input area.
    """
    from sklearn.preprocessing import MinMaxScaler
    from sklearn.metrics.pairwise import cosine_similarity

    if len(scored) < 2:
        return {s["area"]: [] for s in scored}

    # Pull AREA-ONLY features for each scored row. We re-derive these from the
    # underlying area dict (cached in `_source_area`) rather than reading SHAP-
    # space values, because we want similarity over INTRINSIC area properties,
    # not the model's view of them.
    feature_keys = [
        "footfall_weight", "competition_weight",
        "rent_indicative_lkr", "price_per_perch_lkr",
    ]
    matrix = []
    for s in scored:
        area = s.get("_source_area", {})
        row = [float(area.get(k, 0.0)) for k in feature_keys]
        # Add SHAP-space view of the two heaviest area-distinguishing features
        # so similarity reflects how the model "sees" each area, not just raw data.
        all_shap = s.get("_all_shap", {}) or {}
        row.append(float(all_shap.get("competition_density", 0.0)))
        row.append(float(all_shap.get("est_daily_visitors", 0.0)))
        matrix.append(row)

    X = np.asarray(matrix, dtype=np.float64)
    # MinMaxScaler so rent (LKR 25k..220k) doesn't dwarf the 0..1 weights.
    scaler = MinMaxScaler()
    Xs = scaler.fit_transform(X)
    sim = cosine_similarity(Xs)

    out: dict[str, list[dict]] = {}
    for i, s in enumerate(scored):
        ranked = sorted(
            [(j, sim[i][j]) for j in range(len(scored)) if j != i],
            key=lambda t: t[1],
            reverse=True,
        )
        out[s["area"]] = [
            {"area_name": scored[j]["area"], "similarity_pct": int(round(score * 100))}
            for j, score in ranked[:top_k]
        ]
    return out


def _compute_confidence(area: dict) -> dict:
    """Honest data-availability label per area. Derived from `data_completeness`
    (1..5) which tells us how rich the area's input data is. NOT a model
    confidence interval . that would require a separate uncertainty estimator.
    """
    dc = int(area.get("data_completeness", 3))
    if dc >= 4:
        return {"level": "High",
                "reason": "Rich data on visitors, competition, and rents for this area."}
    if dc == 3:
        return {"level": "Medium",
                "reason": "Reasonable coverage; some inputs are estimated."}
    return {"level": "Low",
            "reason": "Limited visitor and business density data. The recommendation is directional."}


def _rank_areas(business_type_key: str, land_intent: str, amount: float,
                preferred_area: str | None, peak_month: dict) -> tuple[list[dict], dict | None]:
    """Rank Nuwara Eliya areas using XGBoost on per-area feature vectors.

    For each area:
      1. Build a feature vector that's specific to that area (per-area
         competition_density + est_daily_visitors, peak-month conditions).
      2. Run model.predict() . that's the area's score.
      3. Run SHAP . that's why the model gave that score.
      4. Apply the same rule-based offset used elsewhere and clip to 5..95.

    Then filter:
      - Drop areas whose typical rent/purchase is more than 2x the user's
        budget (clearly unaffordable). User still sees them under "stretch
        options" if they want.
      - If preferredArea is set, that area is pinned at rank #1 regardless
        of model score (the user explicitly asked for it).

    Returns (ranked_recommendations, shap_meta_for_top1).
    """
    medians = BUSINESS_MEDIANS[business_type_key]
    scored: list[dict] = []
    top1_math = None

    # Pull the current snapshot of areas from Laravel (5-minute TTL cache,
    # falls back to features.py constants if Laravel is unreachable).
    # Read once per request so concurrent admin edits don't change rows
    # mid-loop . that's intentional, not a bug.
    areas_for_request = _load_areas()

    for area in areas_for_request:
        X_area = _area_feature_vector(medians, peak_month, area)
        raw_pred = float(get_model().predict(X_area)[0])
        score_100 = round(float(np.clip(raw_pred + _RULE_ADJUSTMENT, 5, 95)), 1)

        # Per-area SHAP . this is the explanation that travels with the card.
        # `all_shap` is the full 24-feature SHAP map kept for Phase 3 cross-area deltas.
        try:
            top_drivers, math_check, all_shap = _shap_for_vector(X_area)
        except Exception as e:
            print(f"[SHAP] per-area failed for {area['name']}: {e}")
            top_drivers, math_check, all_shap = [], None, {}

        # Budget context (not part of the rank, just info for the card).
        typical = area["rent_indicative_lkr"] if land_intent == "rent" else area["price_per_perch_lkr"] * 40
        budget_delta = ((amount - typical) / typical * 100) if (amount > 0 and typical) else 0
        affordable = (amount <= 0) or (typical <= amount * 2)  # within 2× budget

        # Structured reasoning . four short sentences, one per dimension.
        # Frontend renders them as labelled rows (Budget / Customers / Competition / Advice)
        # instead of dumping all of them into one long semicolon-joined paragraph.
        unit_long = "monthly rent" if land_intent == "rent" else "purchase budget"
        competition = 1.0 - float(area["competition_weight"])
        footfall = float(area["footfall_weight"])

        # --- Budget line ---
        if amount > 0 and typical:
            if abs(budget_delta) < 15:
                budget_line = f"This area is within your budget. Your {unit_long} is LKR {int(amount):,}, matching the usual LKR {int(typical):,} here."
            elif budget_delta >= 15:
                budget_line = f"This area is comfortably within your budget. Usual {unit_long} is around LKR {int(typical):,}, well below your LKR {int(amount):,}."
            else:
                budget_line = f"Rent may be difficult here. Your budget is LKR {int(amount):,}, but usual {unit_long} is around LKR {int(typical):,}."
        else:
            budget_line = "Add a budget on the dashboard to see how this area compares."

        # --- Customers line ---
        if footfall > 0.75:
            customers_line = "Strong walk in customer flow. Many potential customers pass by daily."
        elif footfall > 0.5:
            customers_line = "Steady walk in customer flow. A healthy mix of locals and visitors."
        else:
            customers_line = "Fewer walk in customers. You may need marketing or partnerships to bring them in."

        # --- Competition line ---
        if competition > 0.75:
            competition_line = "Low competition nearby. Fewer similar businesses, easier to stand out."
        elif competition > 0.55:
            competition_line = "Moderate competition. Some similar businesses operate nearby."
        else:
            competition_line = "High competition. Many similar businesses already operate in this area."

        # --- Advice line ---
        # Combine the strongest signal into a single short instruction.
        advice_pieces = []
        if amount > 0 and typical and budget_delta < -15:
            advice_pieces.append("negotiate rent or pick a smaller space")
        if competition <= 0.55:
            advice_pieces.append("invest in branding and signage to stand out")
        if footfall <= 0.5:
            advice_pieces.append("plan for online marketing and local partnerships")
        if not advice_pieces:
            if footfall > 0.75 and competition > 0.55:
                advice_pieces.append("a balanced choice. A clear menu or service focus will help")
            else:
                advice_pieces.append("good fit. Visit at peak and quiet hours before signing")
        advice_line = "Advice: " + ". ".join(advice_pieces).capitalize() + "."

        reasoning_structured = {
            "budget": budget_line,
            "customers": customers_line,
            "competition": competition_line,
            "advice": advice_line,
        }
        # Legacy paragraph kept for back-compat (older code or summary views).
        # Cleaner full-stop-joined form, no more semicolons.
        reasoning = " ".join([budget_line, customers_line, competition_line])

        # SME advisory layer: compute affordability, risk, break-even, etc.
        budget_fit_obj = _compute_budget_fit(amount, typical)
        startup_risk_obj = _compute_startup_risk(
            float(area["competition_weight"]), budget_fit_obj["status"], float(area["footfall_weight"])
        )
        break_even_obj = _compute_break_even(typical, business_type_key)
        preference_score = _compute_preference_score(area["name"], preferred_area)
        overall_match = _compute_overall_match(score_100, budget_fit_obj["score"], preference_score)
        confidence_obj = _compute_confidence(area)

        scored.append({
            "area": area["name"],
            "score": score_100,             # what the user sees (clipped + adjusted XGBoost output)
            "model_score": round(raw_pred, 4),  # raw XGBoost prediction (matches SHAP math)
            "shap_top_drivers": top_drivers,
            "shap_math_check": math_check,  # only attached for top-1 in the response
            "_all_shap": all_shap,          # full 24-feature SHAP map (used for Phase 3 cross-area deltas, then stripped)
            "_source_area": area,           # raw area dict (used for Phase 4 cosine similarity, then stripped)
            "budget_fit": round(min(amount, typical) / max(amount, typical), 2) if (amount > 0 and typical > 0) else 0.5,
            "footfall_score": round(footfall, 2),
            "competition_score": round(competition, 2),
            "typical_rent_lkr": int(area["rent_indicative_lkr"]),
            "typical_purchase_lkr": int(area["price_per_perch_lkr"] * 40),
            "budget_delta_pct": round(budget_delta, 1),
            "tags": area["tags"],
            "reasoning": reasoning,
            "reasoning_structured": reasoning_structured,
            # Nested SME advisory layer (Phase 1+).
            "economics": {
                "typical_rent_lkr": int(area["rent_indicative_lkr"]),
                "typical_purchase_lkr": int(area["price_per_perch_lkr"] * 40),
                "budget_delta_pct": round(budget_delta, 1),
                "budget_fit": budget_fit_obj,
            },
            "advisory": {
                "customer_types": list(area.get("customer_types", [])),
                "best_for": list(area.get("best_for", [])),
                "main_risk": area.get("main_risk", ""),
                "strategy": area.get("strategy", ""),
                "recommended_action": area.get("recommended_action", ""),
                "startup_risk": startup_risk_obj,
                "break_even": break_even_obj,
                "confidence": confidence_obj,
            },
            "scores": {
                "overall_match": overall_match,
                "model_score": score_100,
                "budget_fit_score": budget_fit_obj["score"],
                "preference_score": preference_score,
            },
            "_affordable": affordable,
            "_is_preferred": bool(
                preferred_area and preferred_area.lower().strip() in area["name"].lower()
            ),
        })

    # Filter step: drop unaffordable areas. ALWAYS keep preferred area if user named one.
    survivors = [s for s in scored if s["_affordable"] or s["_is_preferred"]]

    # If filter dropped EVERYTHING, fall back to the original list . better to
    # show stretch options than an empty page.
    if not survivors:
        survivors = scored

    # ---- Pure-model rank first (assigned BEFORE the preferred-area pin) ----
    # `model_rank` is the rank XGBoost would have given each area on its own,
    # ignoring the user's preferred-area override. This is what the honest
    # pin badge shows ("model placed it at #6") so users aren't misled into
    # thinking the model itself ranked their preferred area first.
    survivors_by_model = sorted(survivors, key=lambda s: s["score"], reverse=True)
    for i, s in enumerate(survivors_by_model, start=1):
        s["model_rank"] = i

    # ---- Now apply preference pin and assign DISPLAYED rank ----
    survivors_display = sorted(survivors, key=lambda s: s["score"], reverse=True)
    survivors_display.sort(key=lambda s: s["_is_preferred"], reverse=True)

    # Capture top-1's SHAP math for the page-level proof badge.
    top1_math = None
    for i, r in enumerate(survivors_display, start=1):
        r["rank"] = i
        # is_preferred_pin is True only if the pin actually moved this card up
        # . i.e. it's preferred AND its model rank wasn't already #1. Otherwise
        # we don't show the "pinned" badge (it would be misleading).
        r["is_preferred_pin"] = bool(r["_is_preferred"] and r["model_rank"] != 1)
        if i == 1 and r.get("shap_math_check"):
            top1_math = r["shap_math_check"]

    # ---- Phase 4: similar areas (cosine over scaled area-only features) ----
    # Computed over the FULL set of 12 areas (not just survivors) so a small
    # budget filter doesn't make every card show its sole survivor as "similar".
    try:
        similar_map = _compute_similar_areas(scored, top_k=2)
    except Exception as e:
        print(f"[similarity] failed: {e}")
        similar_map = {s["area"]: [] for s in scored}
    for r in survivors_display:
        r["similar_to"] = similar_map.get(r["area"], [])

    # ---- Phase 3: cross-area SHAP delta ("Main differences vs top model area") ----
    # For each non-model-#1 card, compare its SHAP values (over AREA_VARYING_FEATURES
    # only . the features that actually differ across neighbourhoods) to the model's
    # top area. Surface the top 3 features where this card lost the most ground.
    #
    # This is INFORMATIONAL, not causal . the wording on the frontend says
    # "Main differences compared with #1: lower visitor movement than X, etc."
    # rather than implying these gaps fully explain the score difference (we
    # filter to area-varying features so the visible deltas won't sum to the
    # full score gap; that's an honest limitation, not a bug).
    model_top1 = next((s for s in survivors if s.get("model_rank") == 1), None)
    top1_all_shap = (model_top1 or {}).get("_all_shap", {}) or {}
    top1_name = (model_top1 or {}).get("area", "")
    DELTA_THRESHOLD = 0.5  # drop noise; deltas under 0.5 SHAP units are not meaningful

    for r in survivors_display:
        if r.get("model_rank") == 1 or not r.get("_all_shap"):
            r["main_differences"] = []
            r["main_differences_top1_area"] = top1_name
            continue
        diffs = []
        for f in AREA_VARYING_FEATURES:
            top1_v = float(top1_all_shap.get(f, 0.0))
            this_v = float(r["_all_shap"].get(f, 0.0))
            gap = top1_v - this_v
            if gap < DELTA_THRESHOLD:
                continue
            diffs.append({
                "feature": f,
                "label": FEATURE_DISPLAY_NAMES.get(f, f),
                "gap_points": round(gap, 2),
            })
        diffs.sort(key=lambda d: d["gap_points"], reverse=True)
        r["main_differences"] = diffs[:3]
        r["main_differences_top1_area"] = top1_name

    # Build the response shape. We keep BOTH the per-area SHAP math identity
    # (`shap_math`) and the full 24-feature SHAP map (`shap_full`) on every
    # recommendation . they're tiny, and per-card auditability matters for
    # the expert/lecturer audience. The frontend hides them inside an
    # expandable "Technical details" block so SME users don't see them by default.
    cleaned = []
    for r in survivors_display:
        c = {k: v for k, v in r.items() if not k.startswith("_")}
        c["shap_math"] = c.pop("shap_math_check", None)
        c["shap_full"] = r.get("_all_shap") or {}
        cleaned.append(c)

    return cleaned, top1_math


# ----------------------------- endpoints -----------------------------

@app.get("/api/ml/health")
def health():
    try:
        model = get_model()
        return {"status": "ok", "model_loaded": True, "n_features": model.n_features_in_}
    except Exception as e:
        return {"status": "error", "model_loaded": False, "error": str(e)}


@app.get("/api/ml/shap_health")
def shap_health():
    """Confirms SHAP is installed and the TreeExplainer is built.

    Returns the SHAP base value (model's average prediction) which is what
    every per-row SHAP attribution sums against.
    """
    try:
        explainer = get_explainer()
        base = float(np.asarray(explainer.expected_value).reshape(-1)[0])
        return {
            "status": "ok",
            "library": "shap",
            "version": shap.__version__,
            "explainer": "TreeExplainer",
            "base_value": round(base, 4),
            "n_features": get_model().n_features_in_,
        }
    except Exception as e:
        return {"status": "error", "library": "shap", "error": str(e)}


@app.post("/api/ml/predict", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    key = req.business_type.lower().strip()
    if key not in BUSINESS_MEDIANS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown businessType '{req.business_type}'. "
                   f"Expected one of: {list(BUSINESS_MEDIANS.keys())}",
        )

    monthly = _score_business_across_months(key)
    scores = [m["score"] for m in monthly]
    peak_scores = [m["score"] for m in monthly if m["is_peak"]]
    low_scores = [m["score"] for m in monthly if m["is_monsoon"]]

    overall = round(float(np.mean(scores)), 1)
    sorted_by_score = sorted(monthly, key=lambda m: m["score"], reverse=True)
    best_months = [m["month"] for m in sorted_by_score[:3]]
    worst_months = [m["month"] for m in sorted_by_score[-3:]]

    # Use the user's best calendar month (the one where the model already
    # rated this business highest) as the conditions for area ranking.
    # Pick the month used for area ranking. Default = the model's auto-detected
    # peak month for this business type. The what-if simulator passes an explicit
    # `month` to ask "what if I opened in May?" . when set we use that month's
    # features instead so per-area scores reflect that month's conditions.
    best_month_num = best_months[0] if best_months else 1
    ranking_month_num = int(req.month) if req.month else best_month_num
    peak_month_features = next(
        mf for mf in MONTHLY_FEATURES if int(mf["month"]) == ranking_month_num
    )

    recs_raw, top1_math = _rank_areas(
        key, req.land_intent, req.amount, req.preferred_area, peak_month_features
    )

    # Page-level SHAP metadata . used for the "Verified by SHAP" chip and the
    # math-identity proof. Per-area drivers live on each recommendation.
    shap_meta_payload = None
    if top1_math:
        shap_meta_payload = {
            "library": "shap",
            "library_version": shap.__version__,
            "explainer": "TreeExplainer",
            **top1_math,
        }

    return PredictResponse(
        business_type=key,
        overall_score=overall,
        peak_score=round(float(np.mean(peak_scores)), 1) if peak_scores else overall,
        low_season_score=round(float(np.mean(low_scores)), 1) if low_scores else overall,
        best_months=best_months,
        worst_months=worst_months,
        monthly_scores=[MonthlyScore(**m) for m in monthly],
        recommendations=[AreaRecommendation(**r) for r in recs_raw],
        shap_meta=ShapMeta(**shap_meta_payload) if shap_meta_payload else None,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8001, reload=True)
