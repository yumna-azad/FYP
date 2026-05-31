# SmartLoc — Deployment Playbook

Three services, three hosts (all free tier):

| Service        | Host    | Why                                                   |
|----------------|---------|-------------------------------------------------------|
| React frontend | Vercel  | Vite is natively supported; `vercel.json` already wired. |
| Laravel API    | Render  | Native PHP runtime; one-click via `render.yaml`.      |
| FastAPI ML     | Render  | Native Python runtime; same dashboard as Laravel.     |

You'll end up with three URLs:

```
https://smartloc.vercel.app           (frontend)
https://smartloc-laravel.onrender.com (API)
https://smartloc-ml.onrender.com      (ML / SHAP)
```

The whole deploy takes ~30 minutes the first time, ~3 minutes per redeploy.

---

## 0. Prerequisites

- A GitHub account with the repo pushed (you already have this — `yumna-azad/FYP`).
- A free Render account: https://render.com (sign in with GitHub).
- A free Vercel account: https://vercel.com (sign in with GitHub).
- The MySQL→SQLite switch is automatic via `render.yaml` — no separate DB service needed for this demo deployment.

---

## 1. Push the deployment files to GitHub

Three new files were added — commit and push them:

```bash
cd "H:/3rd year/FYP/mokup"
git add render.yaml backend/build.sh src/lib/ml.js DEPLOYMENT.md
git commit -m "Add Render deployment config + fix ml.js default port"
git push origin main
```

Verify on GitHub that `render.yaml` is at the repo root.

---

## 2. Deploy the FastAPI ML service (Render)

This goes first because Laravel will need to know its URL.

1. Open https://dashboard.render.com/blueprints
2. Click **"New Blueprint Instance"**
3. Connect your GitHub if you haven't already, then pick **yumna-azad/FYP**
4. Render reads `render.yaml` and shows BOTH services. Click **Apply**
5. The first build takes 5–8 minutes (FastAPI + XGBoost + SHAP install)
6. Once green, copy the URL — it looks like `https://smartloc-ml-xxxx.onrender.com`
7. Test it:
   ```bash
   curl https://smartloc-ml-xxxx.onrender.com/api/ml/shap_health
   ```
   You should see the SHAP health JSON (status ok, base_value 47.38).

**Note about Render free tier:** services spin down after 15 min of inactivity. The next request takes ~30 s to wake up. For the viva demo, hit `/api/ml/shap_health` 30 s before showing the page to wake it.

---

## 3. Configure the Laravel API (Render)

It deployed in step 2 but needs three runtime env vars filled in.

1. In the Render dashboard, open the **smartloc-laravel** service
2. Go to **Environment**
3. Fill in these three values (they were `sync: false` in `render.yaml`):

   | Key | Value |
   |---|---|
   | `APP_URL` | Your Laravel URL, e.g. `https://smartloc-laravel-xxxx.onrender.com` |
   | `SANCTUM_STATEFUL_DOMAINS` | Your future Vercel domain, e.g. `smartloc.vercel.app` (no `https://`) |
   | `CORS_ALLOWED_ORIGINS` | Your Vercel URL, e.g. `https://smartloc.vercel.app` |

4. Hit **Save Changes** → the service redeploys (~2 min)
5. Test it:
   ```bash
   curl https://smartloc-laravel-xxxx.onrender.com/api/social-media
   ```
   Should return JSON (may be empty array if seeder didn't populate it).

---

## 4. Configure CORS on the Laravel side

Render's PHP environment doesn't run Laravel's CORS middleware by default. Open `backend/config/cors.php` and confirm it includes:

```php
'paths' => ['api/*'],
'allowed_methods' => ['*'],
'allowed_origins' => [env('CORS_ALLOWED_ORIGINS', '*')],
'allowed_origins_patterns' => [],
'allowed_headers' => ['*'],
'exposed_headers' => [],
'max_age' => 0,
'supports_credentials' => true,
```

If this file doesn't exist, run `php artisan config:publish cors` locally first, then commit it.

---

## 5. Deploy the frontend (Vercel)

1. Open https://vercel.com/new
2. Import **yumna-azad/FYP**
3. Vercel auto-detects Vite from `vercel.json`
4. Before clicking Deploy, expand **Environment Variables** and add:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://smartloc-laravel-xxxx.onrender.com` |
   | `VITE_ML_API_URL` | `https://smartloc-ml-xxxx.onrender.com` |
   | `VITE_GEMINI_API_KEY` | _your key from `.env`_ |
   | `VITE_GEMINI_MODEL` | `gemini-1.5-flash` |

5. Click **Deploy** — takes ~2 min
6. Vercel assigns a URL like `smartloc-xxxx.vercel.app`

---

## 6. Update Render CORS with the real Vercel domain

After step 5 you finally know your Vercel domain. Go back to Render → **smartloc-laravel** → Environment, and replace the placeholder `smartloc.vercel.app` with the real domain Vercel gave you. Hit **Save Changes**.

---

## 7. Smoke-test the whole stack

Open your Vercel URL → register a user → submit a recommendation request → verify:

- The form submits without CORS errors (DevTools → Network).
- A `POST /api/submissions` hits the Render Laravel URL (200).
- A `POST /api/ml/predict` hits the Render FastAPI URL (200, returns ranked areas).
- The Recommendations page renders all 12 area cards with SHAP drivers.
- The Leaflet map shows colour-banded pins.
- The ikman.lk live listings load per area.

If any step fails, check the Render service **Logs** tab for the error.

---

## 8. Known free-tier quirks

| Issue | Workaround |
|---|---|
| Render services sleep after 15 min idle | Hit `/api/ml/shap_health` and `/api/social-media` ~30 s before demoing |
| SQLite resets on every Laravel deploy | Acceptable for demo — seeders re-populate; user accounts are wiped |
| Cold-start ML call ≈ 30 s | First `predict` is slow while uvicorn + XGBoost + SHAP load; warm calls ≈ 150 ms |
| Render `php -S` is single-process | Concurrent users will queue. Fine for a viva demo. Upgrade to paid plan for php-fpm |
| Vercel build can't see `.env` | Always set env vars in the Vercel dashboard |

---

## 9. Rollback / redeploy

```bash
# Roll back to the previous deploy on Render
# Dashboard → service → Deploys tab → "..." on previous deploy → Rollback

# Push a new version
git push origin main
# Render + Vercel both auto-deploy on push to main
```

---

## 10. Cost summary

| Service | Plan | Cost |
|---|---|---|
| Render — Laravel | Free | $0 |
| Render — FastAPI | Free | $0 |
| Vercel — Frontend | Hobby | $0 |
| **Total** | | **$0/mo** |

Free tiers come with the sleep/idle/throughput limits noted above. For continuous availability, upgrade Render to the $7/mo Starter plan on each service.

---

## 11. Production hardening (post-FYP work)

If you push this past the viva:

- **Switch SQLite → managed Postgres** on Render (free tier 1 GB) — preserves user accounts across deploys.
- **Tighten CORS** in `backend/ml/server.py` — currently `allow_origins=["*"]`; replace with your Vercel domain.
- **Move the Gemini key to a backend proxy** — currently the key is shipped to the browser; anyone can scrape it from the bundle.
- **Add a CI workflow** that runs `phpunit` + `pytest` on every push and blocks the deploy on failure.
- **Pin Python deps tighter** — `shap>=0.46.0` and `requests>=2.31.0` are loose. Lock to exact versions once you have a known-good combo.
