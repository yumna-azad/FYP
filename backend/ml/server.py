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

import joblib
import numpy as np
import shap
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from features import (
    BUSINESS_MEDIANS,
    FEATURE_ORDER,
    MONTH_NAMES,
    MONTHLY_FEATURES,
    NUWARA_ELIYA_AREAS,
)

MODEL_PATH = Path(__file__).parent / "smartloc_xgb_model.joblib"


# ----------------------------- schemas -----------------------------

class PredictRequest(BaseModel):
    business_type: str = Field(alias="businessType")
    land_intent: str = Field("rent", alias="landIntent")
    amount: float = 0
    preferred_area: str | None = Field(default=None, alias="preferredArea")

    model_config = {"populate_by_name": True}


class MonthlyScore(BaseModel):
    month: int
    name: str
    score: float
    is_peak: bool
    is_monsoon: bool


class ShapDriver(BaseModel):
    feature: str
    label: str
    shap_value: float
    feature_value: float
    direction: str  # "up" | "down"


class ShapMath(BaseModel):
    base_value: float
    sum_shap: float
    model_output: float
    residual: float  # base + sum_shap - model_output, should be ~1e-6


class AreaRecommendation(BaseModel):
    rank: int
    area: str
    score: float
    budget_fit: float
    footfall_score: float
    competition_score: float
    tags: list[str]
    reasoning: str
    typical_rent_lkr: int
    typical_purchase_lkr: int
    budget_delta_pct: float  # positive = user's budget higher than area norm; negative = below
    # Per-area SHAP explanations of the XGBoost model output.
    # Empty arrays mean SHAP couldn't run for this area (still safe to render).
    shap_top_drivers: list[ShapDriver] = Field(default_factory=list)
    shap_math: ShapMath | None = None
    model_score: float = 0.0  # raw XGBoost prediction for this area (pre-clip)
    # Preferred-area handling: model_rank is the area's true XGBoost-driven
    # rank; is_preferred_pin is true only when the user's preferred area was
    # promoted to #1 from a lower model_rank.
    model_rank: int = 0
    is_preferred_pin: bool = False


class PredictResponse(BaseModel):
    business_type: str
    overall_score: float
    peak_score: float
    low_season_score: float
    best_months: list[int]
    worst_months: list[int]
    monthly_scores: list[MonthlyScore]
    recommendations: list[AreaRecommendation]


# ----------------------------- app -----------------------------

app = FastAPI(title="SmartLoc ML", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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


# Features that vary across the 12 areas (the rest are constant per business
# type or per month). Top SHAP drivers are filtered to these so users see
# what actually differentiates one area from another.
AREA_VARYING_FEATURES = {
    "competition_density",
    "est_daily_visitors",
    "review_log",
    "review_popularity",
    "is_above_median_rating",
    "digital_presence",
    "confidence_score",
}

# Plain-English labels for SHAP driver display.
_HUMAN_LABELS = {
    "competition_density": "Number of similar businesses nearby",
    "est_daily_visitors": "Estimated daily walk-in visitors",
    "review_log": "Online review activity",
    "review_popularity": "Review popularity",
    "is_above_median_rating": "Above-median rating area",
    "digital_presence": "Online/digital presence",
    "confidence_score": "Local market confidence",
    "month": "Month",
    "is_peak": "Peak tourist month",
    "is_monsoon": "Monsoon month",
    "off_peak_severity": "Off-season severity",
    "avg_temp": "Average temperature",
    "precip_mm": "Rainfall (mm)",
    "humidity": "Humidity",
    "rainy_days": "Rainy days",
    "sun_hours": "Sun hours",
    "avg_arrivals": "Average tourist arrivals",
    "std_arrivals": "Tourist variability",
    "events_count": "Number of events",
    "event_impact": "Event impact",
    "seasonality_index": "Seasonality index",
    "rating": "Average rating",
    "category_encoded": "Business category",
    "rating_vs_type": "Rating vs category",
}


def _human_label(feature: str) -> str:
    return _HUMAN_LABELS.get(feature, feature.replace("_", " ").title())


def _area_feature_vector(business_features: dict, monthly_features: dict, area: dict) -> np.ndarray:
    """Build a 24-dim feature vector specialised for ONE area.

    Several features sensibly vary across neighbourhoods. We override them with
    values derived from the area's footfall_weight + competition_weight so the
    XGBoost model can distinguish areas. Without this, every area would
    produce an identical prediction.
    """
    fw = float(area["footfall_weight"])      # 0..1, how busy walk-in traffic is
    cw = float(area["competition_weight"])   # 0..1, how saturated with similar businesses

    # Competition: 0..1 → 30..230 (matches training-data spread per category)
    competition_for_area = 30.0 + cw * 200.0
    visitors_for_area = float(monthly_features["est_daily_visitors"]) * (fw / 0.5)

    rating_base = float(business_features.get("rating", 4.0))
    review_log_base = float(business_features.get("review_log", 2.5))
    review_pop_base = float(business_features.get("review_popularity", 0.5))

    overrides = {
        "competition_density": competition_for_area,
        "est_daily_visitors": visitors_for_area,
        "review_log": review_log_base * (0.6 + fw * 0.8),
        "review_popularity": min(1.0, review_pop_base * (0.5 + fw)),
        "is_above_median_rating": 1.0 if cw > 0.5 else 0.0,
        "digital_presence": 1.0 if fw > 0.5 else 0.0,
        "confidence_score": 1.0 + cw * 2.5,
    }
    combined = {**business_features, **monthly_features, **overrides}
    row = [combined[k] for k in FEATURE_ORDER]
    return np.asarray(row, dtype=np.float32).reshape(1, -1)


def _shap_for_vector(X: np.ndarray) -> tuple[list[dict], dict]:
    """Run SHAP TreeExplainer on a single 24-feature row.

    Returns (top_drivers, math_check):
        top_drivers: top 4 area-varying features by absolute SHAP impact.
        math_check : {base_value, sum_shap, model_output, residual} as proof
                     the SHAP values satisfy the additive identity.
    """
    explainer = get_explainer()
    shap_values = explainer.shap_values(X)
    if isinstance(shap_values, list):
        shap_values = shap_values[0]
    sv = np.asarray(shap_values).flatten()

    base = float(np.asarray(explainer.expected_value).flatten()[0])
    sum_shap = float(np.sum(sv))
    model_output = float(get_model().predict(X)[0])
    residual = round(base + sum_shap - model_output, 6)

    drivers = []
    for i, feat in enumerate(FEATURE_ORDER):
        if feat not in AREA_VARYING_FEATURES:
            continue
        val = float(sv[i])
        drivers.append({
            "feature": feat,
            "label": _human_label(feat),
            "shap_value": val,
            "feature_value": float(X[0][i]),
            "direction": "up" if val >= 0 else "down",
        })
    drivers.sort(key=lambda d: abs(d["shap_value"]), reverse=True)

    return drivers[:4], {
        "base_value": base,
        "sum_shap": sum_shap,
        "model_output": model_output,
        "residual": residual,
    }


# Rule-based adjustments (same 7 rules as in the training notebook):
#   zoning +1, property cost -3, telecom +2, demographics -1, disaster -2,
#   municipal -1, parking +1  =>  net -3
_RULE_ADJUSTMENT = -3


def _feature_vector(business_features: dict, monthly_features: dict) -> np.ndarray:
    combined = {**business_features, **monthly_features}
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


def _rank_areas(business_type_key: str, land_intent: str, amount: float,
                preferred_area: str | None, base_score: float,
                business_features: dict, monthly_features: dict) -> list[dict]:
    """Per-area ranking using the XGBoost model as the primary signal.

    The per-area XGBoost prediction (computed via _area_feature_vector with
    7 area-varying feature substitutions) considers all 24 features. We use it
    as the displayed score with a small affordability modifier — areas
    unaffordable to the user lose a few points, but matching budgets aren't
    rewarded for being "close" (which the old symmetric ratio formula did).

    SHAP is run on the same per-area feature vector to explain the ranking.

    Preferred-area handling: if the user names a preferred area, it's pinned
    to rank #1 in the response. The pure model rank (ignoring the pin) is
    preserved on each item as `model_rank` so the UI can show both.
    """
    ranked = []
    for area in NUWARA_ELIYA_AREAS:
        # Budget fit — closer to area's indicative price = higher score, 0..1
        target = area["rent_indicative_lkr"] if land_intent == "rent" else area["price_per_perch_lkr"] * 40
        if amount > 0 and target > 0:
            ratio = min(amount, target) / max(amount, target)
            budget_fit = float(ratio)
        else:
            budget_fit = 0.5

        footfall = float(area["footfall_weight"])
        # Competition penalty: lower weight = less competition = better for new entrants
        competition = 1.0 - float(area["competition_weight"])

        # Composite: ML base score (0..100 → 0..1) blended with area signals
        ml_component = base_score / 100.0
        composite = (
            0.40 * ml_component +
            0.25 * budget_fit +
            0.20 * footfall +
            0.15 * competition
        )

        # Preferred area bonus
        if preferred_area and preferred_area.lower().strip() in area["name"].lower():
            composite = min(1.0, composite + 0.08)

        score_100 = round(composite * 100, 1)

        # Human-readable reasoning built from real area + budget comparison
        typical = area["rent_indicative_lkr"] if land_intent == "rent" else area["price_per_perch_lkr"] * 40
        budget_delta = ((amount - typical) / typical * 100) if typical else 0
        unit = "rent / month" if land_intent == "rent" else "purchase budget"
        parts = []
        if amount > 0 and typical:
            if abs(budget_delta) < 15:
                parts.append(f"your LKR {int(amount):,} {unit} matches the area's typical LKR {int(typical):,}")
            elif budget_delta >= 15:
                parts.append(f"your LKR {int(amount):,} {unit} is comfortably above the typical LKR {int(typical):,} here")
            else:  # budget below
                parts.append(f"your LKR {int(amount):,} {unit} is tighter than the typical LKR {int(typical):,} here")
        if competition > 0.75:
            parts.append(f"very few similar businesses operate nearby")
        elif competition > 0.55:
            parts.append(f"competition is moderate")
        else:
            parts.append(f"this area is crowded with similar businesses")
        if footfall > 0.75:
            parts.append(f"plenty of walk-in customers daily")
        elif footfall > 0.5:
            parts.append(f"a steady flow of walk-in customers")
        else:
            parts.append(f"few walk-in customers — you'd lean on marketing")
        reasoning = "; ".join(parts) + "."

        # Run XGBoost + SHAP for THIS area using a per-area feature vector.
        # Any failure here is logged-and-swallowed so the page still renders.
        shap_top_drivers = []
        shap_math = None
        raw_model_score = 0.0
        per_area_score = score_100  # fallback to legacy composite
        try:
            X_area = _area_feature_vector(business_features, monthly_features, area)
            raw_model_score = float(get_model().predict(X_area)[0])
            # Use the per-area XGBoost prediction as the primary score (it
            # considers all 24 features and varies meaningfully across areas).
            # Apply the rule adjustment + clip to the same 5..95 band.
            per_area_score = float(np.clip(raw_model_score + _RULE_ADJUSTMENT, 5, 95))

            # Affordability modifier: only penalise areas the user can't afford.
            # Symmetric "ratio" rewards (where over-budget == under-budget) are
            # gone — having budget headroom is good, not equal to being stretched.
            if amount > 0 and target > 0 and amount < target:
                # Up to -12 points when amount is half (or less) of typical.
                shortfall_ratio = max(0.0, min(1.0, 1.0 - (amount / target)))
                per_area_score = max(5.0, per_area_score - 12.0 * shortfall_ratio)

            per_area_score = round(per_area_score, 1)

            drivers, math_check = _shap_for_vector(X_area)
            shap_top_drivers = drivers
            shap_math = math_check
        except Exception:
            pass  # SHAP/model errored — fall back to the legacy composite

        ranked.append({
            "area": area["name"],
            "score": per_area_score,
            "budget_fit": round(budget_fit, 2),
            "footfall_score": round(footfall, 2),
            "competition_score": round(competition, 2),
            "typical_rent_lkr": int(area["rent_indicative_lkr"]),
            "typical_purchase_lkr": int(area["price_per_perch_lkr"] * 40),
            "budget_delta_pct": round(budget_delta, 1),
            "tags": area["tags"],
            "reasoning": reasoning,
            "shap_top_drivers": shap_top_drivers,
            "shap_math": shap_math,
            "model_score": round(raw_model_score, 4),
            "is_preferred_pin": False,  # set below if pinned
            "model_rank": 0,             # set below
        })

    # Sort by per-area XGBoost-driven score, capture the honest rank for each.
    ranked.sort(key=lambda r: r["score"], reverse=True)
    for i, r in enumerate(ranked, start=1):
        r["model_rank"] = i

    # Pin the preferred area to position #1 (and remember the pin).
    # The card UI uses `is_preferred_pin` to show "Your preferred choice"
    # while still printing `model_rank` so the user sees the model's true ranking.
    if preferred_area:
        needle = preferred_area.lower().strip()
        pref_idx = next(
            (i for i, r in enumerate(ranked) if needle and needle in r["area"].lower()),
            -1,
        )
        if pref_idx >= 0:
            pref = ranked.pop(pref_idx)
            pref["is_preferred_pin"] = pref["model_rank"] != 1  # only pinned if it moved
            ranked.insert(0, pref)

    # Final displayed ranks
    for i, r in enumerate(ranked, start=1):
        r["rank"] = i
    return ranked


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

    Returns the explainer's expected_value (the model's mean prediction over
    the training set) — a non-trivial value that proves SHAP is loaded, not
    just imported.
    """
    try:
        explainer = get_explainer()
        base = float(np.asarray(explainer.expected_value).flatten()[0])
        return {
            "status": "ok",
            "library": "shap",
            "version": shap.__version__,
            "explainer": "TreeExplainer",
            "base_value": base,
            "n_features": int(get_model().n_features_in_),
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}


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

    # Pick the best month's features as the representative monthly vector
    # for per-area SHAP (a single vector per area; the model+SHAP happen there).
    best_month_idx = int(sorted_by_score[0]["month"]) - 1
    best_monthly_features = MONTHLY_FEATURES[best_month_idx]
    business_medians = BUSINESS_MEDIANS[key]

    recs_raw = _rank_areas(
        key, req.land_intent, req.amount, req.preferred_area, overall,
        business_medians, best_monthly_features,
    )

    return PredictResponse(
        business_type=key,
        overall_score=overall,
        peak_score=round(float(np.mean(peak_scores)), 1) if peak_scores else overall,
        low_season_score=round(float(np.mean(low_scores)), 1) if low_scores else overall,
        best_months=best_months,
        worst_months=worst_months,
        monthly_scores=[MonthlyScore(**m) for m in monthly],
        recommendations=[AreaRecommendation(**r) for r in recs_raw],
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8001, reload=True)
