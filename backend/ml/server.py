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


class AreaRecommendation(BaseModel):
    rank: int
    area: str
    score: float
    budget_fit: float
    footfall_score: float
    competition_score: float
    tags: list[str]
    reasoning: str


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


def get_model():
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise RuntimeError(f"Model not found at {MODEL_PATH}")
        _model = joblib.load(MODEL_PATH)
    return _model


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
                preferred_area: str | None, base_score: float) -> list[dict]:
    """Composite score per area: ML base score + budget fit + footfall - competition."""
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

        # Reasoning: top 2 driver labels
        drivers = []
        if budget_fit > 0.75: drivers.append("budget fits well")
        if footfall > 0.7: drivers.append("high footfall")
        if competition > 0.7: drivers.append("low competition")
        if budget_fit < 0.3: drivers.append("budget mismatch")
        if footfall < 0.4: drivers.append("limited footfall")
        reasoning = ", ".join(drivers) if drivers else "balanced trade-offs"

        ranked.append({
            "area": area["name"],
            "score": score_100,
            "budget_fit": round(budget_fit, 2),
            "footfall_score": round(footfall, 2),
            "competition_score": round(competition, 2),
            "tags": area["tags"],
            "reasoning": reasoning,
        })

    ranked.sort(key=lambda r: r["score"], reverse=True)
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

    recs_raw = _rank_areas(
        key, req.land_intent, req.amount, req.preferred_area, overall
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
