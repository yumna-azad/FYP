# SmartLoc — Technical Implementation

A location-intelligence platform for Nuwara Eliya, Sri Lanka. Given a business type, a budget, and a land intent (rent or purchase), it ranks the 12 commercial areas in Nuwara Eliya by suitability using a trained XGBoost regression model, then explains each ranking with SHAP feature attributions, attaches live property listings scraped from ikman.lk, and surfaces the whole thing through a React dashboard with an admin back-office.

This document describes the system as it actually exists in the repository — file paths, function names, line numbers, and data shapes are all real.

---

## 1. System Architecture

Three independent processes cooperating over HTTP:

```
┌──────────────────────────┐      ┌──────────────────────────┐      ┌──────────────────────────┐
│  React / Vite frontend   │      │  Laravel 11 REST API     │      │  FastAPI ML microservice │
│  http://localhost:5173   │ ───► │  http://localhost:8000   │ ───► │  http://localhost:8001   │
│  src/                    │      │  backend/                │      │  backend/ml/             │
│  - Pages, components     │      │  - Auth (Sanctum)        │      │  - XGBoost model         │
│  - MUI + Tailwind        │      │  - Admin CRUD            │      │  - SHAP TreeExplainer    │
│  - Leaflet maps          │      │  - Submissions           │      │  - Pydantic schemas      │
│  - Gemini chatbot        │      │  - ikman.lk scraper      │      │  - 24-feature vectors    │
│  - jsPDF export          │      │  - MySQL via Eloquent    │      │  - 12 NE areas           │
└──────────────────────────┘      └──────────────────────────┘      └──────────────────────────┘
            │                                  │                                   │
            │   fetch()                        │   Eloquent                        │   joblib.load()
            ▼                                  ▼                                   ▼
   localStorage / session              MySQL (smartloc DB)             smartloc_xgb_model.joblib
```

The split is deliberate:

- **Laravel** owns persistence, auth, and "business" REST routes — anything that needs a database, a user, or a third-party HTTP call (ikman scraper, social media settings).
- **FastAPI** owns ML inference. It is intentionally stateless and has no DB connection. It loads the trained XGBoost model and a SHAP TreeExplainer once at first request, then answers `/api/ml/predict` calls in <50ms.
- **React** never talks to MySQL directly; it talks to Laravel for data and to FastAPI for predictions. This boundary makes the ML service deployable independently (e.g. on Render / Fly / a GPU box) without touching the Laravel deployment.

Service launcher: `.claude/launch.json` defines all three commands so the whole stack starts in one go.

---

## 2. Technology Stack and Justification

### Frontend (`package.json`)

| Tool                  | Why this and not something else                                            |
|-----------------------|----------------------------------------------------------------------------|
| **React 18**          | Component model + ecosystem maturity; required by every later dep.         |
| **Vite 5**            | Faster cold start and HMR than CRA; native ESM, no Webpack config.         |
| **MUI v6**            | Production-grade component library; saves ~3 weeks of UI implementation.   |
| **Tailwind CSS 3**    | Used alongside MUI for utility spacing/typography on landing/marketing pages. |
| **Leaflet + react-leaflet** | Free OSM-backed maps. No API key, unlike Google Maps. Required for area pins. |
| **Recharts**          | Declarative chart primitives for admin analytics.                          |
| **framer-motion**     | Page transitions / micro-interactions on the recommendations page.         |
| **react-router-dom 6**| Standard SPA routing.                                                      |
| **@google/generative-ai** | Gemini SDK for the in-app chatbot (`src/components/Chatbot.jsx`).      |
| **@stripe/stripe-js** | Subscription payments hook-in (planned upgrade flow).                      |

### Backend (`backend/composer.json`)

- **Laravel 11** — convention-over-configuration, Eloquent ORM, Sanctum tokens, middleware-based RBAC.
- **Sanctum** — issues opaque bearer tokens; SPA-friendly without the OAuth weight of Passport.
- **MySQL** — Schema designed via migrations; relational fit for users / plans / submissions.

### ML service (`backend/ml/requirements.txt`)

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
pydantic==2.9.2
xgboost==2.1.1
scikit-learn==1.5.1
joblib==1.4.2
numpy==1.26.4
shap>=0.46.0
requests>=2.31.0
```

**Why FastAPI, not Flask?** FastAPI provides automatic Pydantic request/response validation, an OpenAPI/Swagger UI at `/docs`, and native async — all three would require additional Flask plugins. The model also benefits from FastAPI's startup hooks for lazy loading (`get_model()`, `get_explainer()` in `server.py`).

**Why XGBoost, not RandomForest or LinearRegression?** Gradient-boosted trees handle the mix of categorical encodings (business type), bounded counts (events, rainy days), continuous physical features (temperature, precipitation), and skewed targets (popularity scores) without explicit feature scaling. The trained model reaches **R² = 0.8447** on the held-out test set (see `backend/ml/server.py` line 3 docstring).

**Why SHAP TreeExplainer, not LIME?** TreeExplainer is exact for tree ensembles. For any input row `X`, it guarantees `model.predict(X) == expected_value + sum(shap_values)`. The service re-checks this additive identity on every call and returns the residual (≈1e-6) to the frontend as proof — something LIME cannot offer because it is a local linear approximation.

---

## 3. Dataset Construction and Feature Engineering

The training dataset lives in `smartloc_raw_data_VERIFIED.xlsx` (not in the repo because it's a binary asset). It has six sheets — `Businesses`, `Tourism_Monthly`, `Climate`, `Events_Calendar`, `Price_Index`, `Property_Listings` — and the feature pipeline is reproduced as Python constants in **`backend/ml/features.py`** so production inference uses the exact same medians the notebook trained on.

### Feature order (24 columns, `features.py:108-116`)

```
category_encoded, rating, review_log, confidence_score,
rating_vs_type, review_popularity, is_above_median_rating,
competition_density, digital_presence,
month, is_peak, is_monsoon, off_peak_severity,
avg_temp, precip_mm, humidity, rainy_days, sun_hours,
avg_arrivals, std_arrivals, events_count, event_impact,
est_daily_visitors, seasonality_index
```

### Three feature blocks

1. **Business medians (9 features)** — per-type aggregates from the `Businesses` sheet. Five business types are supported: `cafe`, `hotel`, `restaurant`, `retail_shop`, `wellness_center`. For each, we precompute median `rating`, `review_log = log1p(review_count)`, `competition_density` (count of similar businesses within Nuwara Eliya), `review_popularity`, etc. See `features.py:13-69`.

2. **Monthly features (15 features × 12 months)** — climate + tourism aggregates. Each month carries `avg_temp`, `precip_mm`, `humidity`, `rainy_days`, `sun_hours`, `avg_arrivals` (mean tourist arrivals to Sri Lanka in that month over the dataset window), `std_arrivals`, `events_count`, `event_impact`, plus engineered flags (`is_peak`, `is_monsoon`, `off_peak_severity`) and an aggregate `seasonality_index`. See `features.py:71-84`.

3. **Per-area constants (5 fields × 12 areas)** — from `Price_Index` and `Property_Listings`. Each Nuwara Eliya area carries `price_per_perch_lkr`, `rent_indicative_lkr`, `footfall_weight` (0..1), `competition_weight` (0..1), and a `tags` list. The 12 areas are: Town Centre / Main Street, Gregory Lake Front, Hakgala Road, Pedro / Hill Club Area, Nanu Oya, Ambewela, Kandapola, Glencairn, Hawa Eliya, Lover's Leap, Seetha Eliya, Tea Estates Belt. See `features.py:93-106`.

### Feature engineering decisions worth defending

- **`review_log = log1p(review_count)`** — review counts are heavy-tailed; log compresses the long tail so a 5,000-review hotel doesn't dominate a 50-review cafe.
- **`review_popularity = review_count / max(review_count_by_type)`** — type-relative popularity rather than absolute count; a cafe with 100 reviews is "popular" even if a hotel with 100 isn't.
- **`is_above_median_rating`** — binary indicator vs. type median; collapses noisy rating fluctuations.
- **`competition_density`** — number of same-type businesses already in the area. Used both as a model feature and (1 − density) as a UI score.
- **`off_peak_severity`** — measure of how far below the annual peak each month falls; helps the model learn that May–July are commercially worse for Nuwara Eliya than the November–March peak.

---

## 4. Machine Learning Model

### Training (offline, in a Jupyter notebook)

- Target: a popularity / suitability score derived from rating × review_log × normalized footfall.
- Algorithm: `xgboost.XGBRegressor` (compared against Linear, RandomForest, and Gradient Boosting baselines in the notebook — XGBoost won on RMSE and R²).
- Hyperparameters: tuned with `RandomizedSearchCV` over `n_estimators`, `max_depth`, `learning_rate`, `subsample`, `colsample_bytree`, `min_child_weight`.
- Final test R²: **0.8447**.
- Output artifact: `backend/ml/smartloc_xgb_model.joblib` (serialised with `joblib.dump`).

### Inference (online, in `backend/ml/server.py`)

The model is loaded lazily on first request (`get_model()`, line 119):

```python
def get_model():
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise RuntimeError(f"Model not found at {MODEL_PATH}")
        _model = joblib.load(MODEL_PATH)
    return _model
```

The SHAP explainer is built lazily over that same model (`get_explainer()`, line 128):

```python
def get_explainer():
    global _explainer
    if _explainer is None:
        _explainer = shap.TreeExplainer(get_model())
    return _explainer
```

### Per-area inference loop (`_rank_areas`, `server.py:292-434`)

For each of the 12 areas:

1. Build a 24-feature row by stitching `BUSINESS_MEDIANS[business_type]` + the current month's `MONTHLY_FEATURES` + the seven **area-varying** features taken from `NUWARA_ELIYA_AREAS` (`_area_feature_vector`, line 187).
2. `model.predict(X_area)` → raw popularity prediction (0–100 band after `np.clip` and a small rule adjustment).
3. `explainer.shap_values(X_area)` → 24 SHAP attributions for that row.
4. Filter SHAP drivers to `AREA_VARYING_FEATURES` (line 144) — these are the ones that actually differ between areas, so showing them tells the user *why this area* vs. another, not *why this business type* in general.
5. Compute affordability modifier — areas the user cannot afford lose up to 12 points, proportional to shortfall (line 381–384).
6. Compute a human-readable `reasoning` string by composing budget delta, competition signal, and footfall signal (lines 342–362).

The result is sorted by per-area score, the true `model_rank` is captured, and if the user named a `preferred_area` it is pinned to position #1 with `is_preferred_pin = true` and the original `model_rank` preserved on the response so the UI can show both "model says #4, you preferred this area" honestly.

### SHAP additive-identity check (`_shap_for_vector`, `server.py:220-265`)

```python
sum_shap = float(np.sum(sv))
model_output = float(model.predict(X)[0])
residual = round(base + sum_shap - model_output, 6)
```

The residual is returned in `shap_math.residual` on every response. In normal operation it is ~1e-6. Anything larger means the explainer is mis-wired, which would be a P0 bug.

### Inference endpoints

| Verb | Path                     | Purpose                                               |
|------|--------------------------|-------------------------------------------------------|
| GET  | `/api/ml/health`         | Sanity check — model loaded, n_features.              |
| GET  | `/api/ml/shap_health`    | Confirms SHAP installed + TreeExplainer built + base_value.   |
| POST | `/api/ml/predict`        | Full ranking call — monthly scores + 12 ranked areas. |

A live `shap_health` response from this repo:

```json
{
  "status": "ok",
  "library": "shap",
  "version": "0.51.0",
  "explainer": "TreeExplainer",
  "base_value": 47.381798,
  "n_features": 24
}
```

`base_value` being a non-trivial floating-point number (not 0.0 or "untrained") proves the explainer was fit on the trained model, not a placeholder.

---

## 5. Backend (Laravel)

### Routes (`backend/routes/api.php`)

All API surface lives in one file, 73 lines:

```
POST   /api/login                            AuthController@login
POST   /api/register                         AuthController@register
POST   /api/change-password         [auth]   AuthController@changePassword
POST   /api/submissions             [auth]   SubmissionController@store
GET    /api/social-media                     SocialMediaController@getSocialMedia
GET    /api/listings                         ListingsController@index
PUT    /api/admin/social-media      [admin]  SocialMediaController@updateSocialMedia
GET    /api/admin/stats             [admin]  AdminController@getStats
... (full CRUD for users, business-types, locations, plans)
GET    /api/admin/analytics         [admin]  AdminController@getAnalytics
GET    /api/admin/submissions       [admin]  AdminController@getSubmissions
```

### Authentication

`AuthController::login` (line 16) issues a Sanctum personal-access token on successful credential check (`Hash::check`). Protected routes use `auth:sanctum` middleware. Admin-only routes additionally use a custom `admin` middleware that gates on the user's role column.

### Submissions persistence

`SubmissionController::store` (line 16, 35-line file) accepts the dashboard form (business type, budget, land intent, preferred area), validates it, and writes a `LocationFinderSubmission` row via Eloquent. The admin dashboard later joins this table with `users` to show "who searched for what" in real time.

### ikman.lk scraper (`ListingsController.php`, 941 lines)

The single highest-value REST endpoint in the system. `GET /api/listings?area=<area>&intent=<rent|purchase>&businessType=<type>&budget=<lkr>` returns live commercial property listings filtered to that area + that user's budget. It is **public** (no auth) and **cached server-side for 1 hour** so repeated calls from different users don't hammer ikman.

Pipeline (entry `index()`, line 20):

1. **Cache check** — `Cache::remember("ikman:{$area}:{$intent}:{$budget}:{$businessType}", 3600, ...)`.
2. **HTTP fetch** — `httpFetch()` (line 847) calls ikman's search URL with a sensible User-Agent + 10s timeout. Failures return an empty list, never throw.
3. **HTML parse** — `parseIkmanListings()` (line 886) extracts title, price, URL, image, location using regex over the listing card HTML.
4. **Geo restrict** — `restrictToNuwaraEliya()` (line 385) drops listings whose city isn't Nuwara Eliya. `areaAliases()` (line 413) maps "Lake View Hotel Road" → "Gregory Lake Front" etc. to catch wording drift.
5. **Per-area filter** — `filterByAreaInTitle()` (line 442) further narrows to listings that name the specific area in their title; falls back to the area-wide pool if zero remain.
6. **Business-keyword filter** — `filterByBusinessKeywords()` (line 644) and `dropResidentialIfBusiness()` (line 729) strip residential noise when the user is looking for a commercial shop.
7. **Budget filter** — `budgetFilter()` (line 796) drops listings whose `parsePriceLkr()` (line 835) parsed price is outside the user's budget band (with a configurable tolerance).

This is the only component in the system that depends on a live external website, so it's wrapped in try/catch at every IO boundary. The frontend handles a missing/empty response gracefully by showing a "no listings right now" banner instead of an error.

### Admin endpoints (`AdminController.php`)

Full CRUD for users, business types, locations, plans. `getStats()` (line 20) returns counts + recent activity for the admin dashboard. `getAnalytics()` (line 343) returns the time-series data for the recharts on `/admin`.

---

## 6. Database (MySQL via Eloquent)

Eight migrations under `backend/database/migrations/`:

| Migration                                              | Purpose                                                     |
|--------------------------------------------------------|-------------------------------------------------------------|
| `0001_01_01_000000_create_users_table.php`             | Users + Sanctum tokens table.                               |
| `2024_01_01_000001_create_subscription_plans_table.php`| Plan tiers (name, price, feature flags).                    |
| `2024_01_01_000002_add_subscription_to_users_table.php`| FK from users → plans + role column.                        |
| `2024_01_01_000003_create_business_types_table.php`    | Lookup table for the 5 business types.                      |
| `2024_01_01_000004_create_locations_table.php`         | Lookup table for the 12 Nuwara Eliya areas.                 |
| `2024_01_01_000005_create_social_media_settings_table.php` | Admin-editable footer links.                            |
| `2024_01_01_000006_create_location_finder_submissions_table.php` | Each form submission a logged-in user makes.       |
| `2024_01_01_000007_create_nuwara_eliya_listings_table.php` | Seeded curated listings used as a fallback when ikman is unreachable. |

Seeders under `backend/database/seeders/` populate `business_types`, `locations`, and `nuwara_eliya_listings`.

---

## 7. Frontend (React)

### Routing (`src/App.jsx`)

```
/              HomePage          (public)
/login         LoginPage         (public)
/register      RegisterPage      (public)
/dashboard     DashboardPage     (protected)
/recommendations RecommendationsPage (protected)
/profile       ProfilePage       (protected)
/admin         AdminPage         (admin)
/admin/meetings AdminMeetingsPage (admin)
/admin/social-media AdminSocialMediaPage (admin)
/admin/mail    AdminMailPage     (admin)
```

`ProtectedRoute` (in `src/components/ProtectedRoute.jsx`) gates on `AuthContext` state. The `requireAdmin` prop additionally enforces role.

Every route is wrapped in `ErrorBoundary` so a single page error doesn't take down the whole shell (sidebar/topbar stay rendered).

### Context

- **`ThemeContext.jsx`** — MUI theme provider with light/dark modes and a customised palette/typography (one section has a duplicate `MuiChip` override Vite warns about — harmless, on the cleanup list).
- **`AuthContext.jsx`** — wraps Sanctum token storage in `localStorage`, exposes `login()`, `logout()`, `user`, `isAdmin`.

### Pages of note

- **`HomePage.jsx`** — public landing page; hero copy, value props, CTA to register.
- **`DashboardPage.jsx`** — the form where a logged-in user enters business type, budget, intent, and preferred area. On submit, calls the Laravel `/api/submissions` endpoint (logged for admin) and then the FastAPI `/api/ml/predict` endpoint (for the ranking).
- **`RecommendationsPage.jsx`** (2,211 lines — the visual centrepiece). Renders:
  - A **top tile** for the #1 area, with the score, budget delta, and the headline reasoning line.
  - A **map** with 12 rank-numbered, colour-banded Leaflet pins.
  - **12 area cards**, each expandable. Inside each card: the per-area XGBoost score, the budget breakdown vs. the area's typical rent/purchase price, the SHAP top drivers (filtered to area-varying features, plain-English labelled), the competition / footfall sub-scores, the reasoning paragraph, and the live ikman listings for that area.
  - A **page-level fallback pool** of Nuwara Eliya-wide listings below the cards.
  - A **PDF export** button (jsPDF) that captures the current ranking + reasoning for offline review.
- **`AdminPage.jsx`** — recharts-powered dashboard: user counts, submission volume, top business types searched.
- **`AdminMeetingsPage.jsx`** — calendar-like view (mock data, would connect to Google Calendar in v2).
- **`AdminSocialMediaPage.jsx`** — edits the footer links via `PUT /api/admin/social-media`.
- **`AdminMailPage.jsx`** — broadcast composer UI.

### ML client (`src/lib/ml.js`, 35 lines)

```js
const ML_API_URL = import.meta.env.VITE_ML_API_URL || "http://127.0.0.1:9191";

export async function fetchRecommendations(payload) {
  const body = {
    businessType: payload.businessType,
    landIntent: payload.landIntent,
    amount: Number(payload.amount) || 0,
    preferredArea: payload.preferredArea || null,
  };
  const res = await fetch(`${ML_API_URL}/api/ml/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `ML API error ${res.status}`);
  }
  return res.json();
}
```

> ⚠️ **Heads-up:** the default URL in `ml.js` is `http://127.0.0.1:9191`, but uvicorn actually runs on port `8001`. In dev we set `VITE_ML_API_URL=http://127.0.0.1:8001` in `.env`. Worth fixing the default to `8001` so the env override isn't required for local runs.

### Gemini chatbot (`src/components/Chatbot.jsx`)

Floating button bottom-right of every authenticated page. Uses the official `@google/generative-ai` SDK with the user's API key from `VITE_GEMINI_API_KEY`. The system prompt restricts the bot to SmartLoc-relevant topics (business advice, area context, how to use the platform) and explicitly tells it to defer to the model output for area rankings rather than guessing.

---

## 8. End-to-End Recommendation Flow

What actually happens when a user clicks "Get Recommendations" on the dashboard:

```
1. DashboardPage.jsx
   └── fetch POST /api/submissions     (Laravel: logs the input for admin)
   └── ml.fetchRecommendations(payload) (FastAPI: real work)

2. FastAPI server.py @app.post("/api/ml/predict")
   ├── Validate body via PredictRequest (Pydantic)
   ├── business_features = BUSINESS_MEDIANS[business_type]
   ├── monthly_scores = _score_business_across_months(business_type)
   │     for each month:
   │         build 24-feature vector
   │         model.predict() → score
   ├── overall_score = mean(monthly_scores)
   ├── peak_score / low_season_score = split by month["is_peak"]
   ├── best_months / worst_months = top/bottom 3 by score
   ├── recommendations = _rank_areas(...)
   │     for each of 12 areas:
   │         build per-area 24-feature vector
   │         model.predict() → raw area score
   │         explainer.shap_values() → 24 SHAP attributions
   │         filter to AREA_VARYING_FEATURES, top 4 by |shap_value|
   │         apply affordability modifier
   │         compose human reasoning string
   │     sort, capture model_rank, optionally pin preferred_area to #1
   └── Return PredictResponse (Pydantic → JSON)

3. RecommendationsPage.jsx
   ├── Render monthly score chart (Recharts)
   ├── Render top tile + 12 area cards
   ├── For each area, fire GET /api/listings?area=...&budget=...&businessType=...
   │     (Laravel hits ikman, caches 1h, returns parsed listings)
   ├── Render Leaflet map with rank-numbered pins
   └── Wire PDF export button
```

Total round-trip on a warm cache: ~150ms for the ML call + parallel listing fetches.

---

## 9. API Integration and Testing

All three services are designed to be testable in isolation:

- **Laravel** — `phpunit` test scaffolding ships with the framework; routes can be hit with Laravel HTTP test helpers.
- **FastAPI** — every endpoint is type-checked through Pydantic, and the `/docs` Swagger UI lets you fire `POST /api/ml/predict` with a sample body straight from the browser.
- **Frontend** — DevTools Network tab is the easiest integration debugger; every outbound call is visible.

Manual smoke tests used during development:

```bash
# ML health + SHAP
curl http://127.0.0.1:8001/api/ml/health
curl http://127.0.0.1:8001/api/ml/shap_health

# Full prediction
curl -X POST http://127.0.0.1:8001/api/ml/predict \
  -H "Content-Type: application/json" \
  -d '{"businessType":"cafe","landIntent":"rent","amount":80000,"preferredArea":"Gregory Lake"}'

# Laravel auth
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@smartloc.test","password":"password"}'

# ikman scraper
curl "http://localhost:8000/api/listings?area=Gregory%20Lake%20Front&intent=rent&budget=200000&businessType=cafe"
```

---

## 10. Version Control Evidence

The repository has 30+ substantive commits documenting evolution. A representative selection of the most recent:

```
7fedbd38 Listings: declutter — banner becomes info-only, drop duplicate buttons/notes
0d7009dd Per-card listings: strict specific-only; generic NE moves to dedicated section
49257092 Listings: relax residential filter so wellness/cafe/restaurant get results
a866799a Listings: strict 'must be in Nuwara Eliya' geo filter
3ec05558 Live property listings: scrape ikman.lk per area, render on each card
33b13679 Side-by-side comparison: plain English labels, kill double-negative
c905440c Per-area XGBoost as primary ranker, pin preferred area to #1
5063021e Restore PDF export, wire SHAP into ML service, fix admin 500s
cf5cf9a8 Map pins rank-numbered + colour-banded, hide OSM attribution, stop page shift
b1028484 Recommendations: sans-serif, real budget figures, colored map pins, working actions
```

The history shows three clear phases:

1. **Backend + data layer** — early commits set up Laravel, migrations, auth, the initial mock-data dashboard.
2. **ML integration** — `5063021e` is the pivotal commit wiring SHAP into the FastAPI service.
3. **UX polish + real data** — recent commits replace mock listings with the live ikman scraper and tighten the recommendation visuals.

---

## 11. Running the Stack Locally

### Prerequisites

- Node.js ≥ 18, npm
- PHP ≥ 8.2, Composer
- MySQL ≥ 8 (running on default port 3306 with a `smartloc` database created)
- Python 3.11+ with `venv`

### One-time setup

```bash
# Frontend
npm install

# Laravel
cd backend
composer install
cp env-smartloc-example.txt .env
php artisan key:generate
php artisan migrate --seed
cd ..

# ML service
cd backend/ml
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
cd ../..
```

### Daily run

Three terminals (or use the `.claude/launch.json` configurations):

```bash
# Terminal 1 — frontend
npm run dev
# → http://localhost:5173

# Terminal 2 — Laravel
cd backend
php artisan serve --host=127.0.0.1 --port=8000

# Terminal 3 — ML
cd backend/ml
uvicorn server:app --host 127.0.0.1 --port 8001 --reload
```

### Environment variables

`.env` (frontend, in repo root):
```
VITE_API_URL=http://localhost:8000
VITE_ML_API_URL=http://127.0.0.1:8001
VITE_GEMINI_API_KEY=<your-key>
```

`backend/.env` (Laravel, derived from `env-smartloc-example.txt`):
```
APP_KEY=base64:...        # php artisan key:generate
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=smartloc
DB_USERNAME=root
DB_PASSWORD=
SANCTUM_STATEFUL_DOMAINS=localhost:5173
```

---

## 12. Known Limitations & Future Work

| Area                  | Limitation                                                                                                          |
|-----------------------|---------------------------------------------------------------------------------------------------------------------|
| ML data freshness     | Tourism + climate features are precomputed constants in `features.py`. Re-train annually with updated arrivals data. |
| ikman dependency      | The scraper depends on ikman's HTML markup. If they redesign their listing card, `parseIkmanListings()` will need an update. The 1h server cache mitigates rate-limit risk but not structural breakage. |
| Business types        | Limited to 5 (cafe, hotel, restaurant, retail_shop, wellness_center) because those are the medians we trained. Adding "pharmacy" requires extending the training set + retraining. |
| `ml.js` default URL   | Defaults to port 9191; relies on `VITE_ML_API_URL=http://127.0.0.1:8001` in `.env`. Cosmetic, but worth fixing.       |
| Stripe                | SDK installed but checkout flow not yet wired to a backend webhook handler.                                          |
| Gemini chatbot        | Browser-side API key — fine for FYP demo, would need a server-side proxy in production.                              |

---

## 13. File-by-File Reference

| Path | What lives there |
|------|------------------|
| `src/App.jsx` | Top-level routes + providers. |
| `src/pages/DashboardPage.jsx` | Recommendation form. |
| `src/pages/RecommendationsPage.jsx` | The big result view (top tile, cards, map, listings, PDF). |
| `src/pages/AdminPage.jsx` | Admin dashboard (recharts + submission table). |
| `src/components/MapView.jsx` | Reusable Leaflet map wrapper. |
| `src/components/Chatbot.jsx` | Gemini-powered floating chatbot. |
| `src/components/Sidebar.jsx` / `TopBar.jsx` | App shell chrome. |
| `src/context/AuthContext.jsx` | Token storage + user state. |
| `src/context/ThemeContext.jsx` | MUI theme + light/dark. |
| `src/lib/ml.js` | FastAPI client. |
| `src/lib/gemini.js` | Chatbot SDK config. |
| `backend/routes/api.php` | All REST routes in one place. |
| `backend/app/Http/Controllers/Api/AuthController.php` | Login / register / change-password. |
| `backend/app/Http/Controllers/Api/AdminController.php` | Admin CRUD + analytics. |
| `backend/app/Http/Controllers/Api/SubmissionController.php` | Persist dashboard form. |
| `backend/app/Http/Controllers/Api/ListingsController.php` | ikman.lk scraper (the big one). |
| `backend/app/Http/Controllers/Api/SocialMediaController.php` | Footer links. |
| `backend/database/migrations/*` | Schema. |
| `backend/database/seeders/*` | Seed data. |
| `backend/ml/server.py` | FastAPI app, endpoints, ranking logic. |
| `backend/ml/features.py` | Precomputed business/monthly/area features. |
| `backend/ml/smartloc_xgb_model.joblib` | Trained XGBoost model (R²=0.8447). |
| `backend/ml/requirements.txt` | Python deps. |
| `.claude/launch.json` | Dev-server definitions for all three services. |

---

## 14. Glossary

- **SHAP** — SHapley Additive exPlanations. Per-feature attributions that sum (with the base value) to the model's output.
- **TreeExplainer** — SHAP's tree-specific algorithm; exact and fast for XGBoost/LightGBM/CatBoost.
- **Pydantic** — Python data-validation library FastAPI uses for request/response schemas.
- **Sanctum** — Laravel's lightweight token-auth package for SPAs.
- **Eloquent** — Laravel's ORM. Each migration produces a model class under `backend/app/Models/`.
- **Perch** — Sri Lankan unit of area, ≈ 25.3 m². `price_per_perch_lkr * 40` ≈ price per ~10 perches (a typical commercial plot).
