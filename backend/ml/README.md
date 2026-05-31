---
title: SmartLoc ML
emoji: 📊
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: XGBoost + SHAP location-suitability API for Nuwara Eliya
---

# SmartLoc ML Service

FastAPI wrapper around the trained XGBoost model (`smartloc_xgb_model.joblib`, R² = 0.8447).

Given a business type, budget, and land intent, it ranks the 12 commercial areas in Nuwara Eliya by suitability and returns SHAP attributions explaining each ranking.

## Install (local)

```bash
cd backend/ml
python -m venv .venv
.venv\Scripts\activate   # Windows  (source .venv/bin/activate on Mac/Linux)
pip install -r requirements.txt
```

## Run (local)

```bash
uvicorn server:app --port 8001 --reload
```

The React frontend expects this at `http://localhost:8001`.

## Endpoints

### `GET /api/ml/health`
Model liveness check.

### `GET /api/ml/shap_health`
Confirms the SHAP TreeExplainer is initialised and returns the model's base value.

### `POST /api/ml/predict`
```json
{
  "businessType": "cafe",
  "landIntent": "rent",
  "amount": 150000,
  "preferredArea": "Gregory Lake Front"
}
```

Returns:
- 12 monthly suitability scores from the XGBoost model
- Peak-season and low-season averages
- Best/worst months
- 12 ranked Nuwara Eliya areas with SHAP top drivers + additive-identity math

## How scoring works

1. **Model call.** For each of 12 months, the service builds a feature row by
   combining the median business features for the chosen type (from `Businesses`
   sheet) with pre-computed monthly features (from `Tourism_Monthly` +
   `Climate` + `Events_Calendar`). XGBoost predicts a suitability score 5–95.
2. **Rule-based adjustment.** The 7 rules from the training notebook (zoning
   +1, property cost −3, telecom +2, demographics −1, disaster −2, municipal
   −1, parking +1 ⇒ net −3) are applied to each prediction.
3. **Area ranking.** The model doesn't take location features, so area ranking
   is a composite: `0.40·ML + 0.25·budget_fit + 0.20·footfall + 0.15·(1-competition)`,
   with a +0.08 bonus if the user's preferred area matches. Price/footfall data
   comes from `Property_Listings` and `Price_Index` sheets.

## Deployment to HuggingFace Spaces

1. Create a new Space at https://huggingface.co/new-space
2. SDK: **Docker**
3. After creating, drag-and-drop these 5 files into the Space's file browser:
   - `Dockerfile`
   - `requirements.txt`
   - `server.py`
   - `features.py`
   - `smartloc_xgb_model.joblib`
   - `README.md` (this file — the YAML frontmatter configures the Space)
4. Space auto-builds (~5 min). Done.

Public URL: `https://<your-username>-smartloc-ml.hf.space`
