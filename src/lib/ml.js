// Client for the SmartLoc XGBoost inference service (backend/ml/server.py).
// Set VITE_ML_API_URL in .env to override the default localhost endpoint.

const ML_API_URL =
  import.meta.env.VITE_ML_API_URL || "http://127.0.0.1:9191";

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

export async function checkMlHealth() {
  try {
    const res = await fetch(`${ML_API_URL}/api/ml/health`);
    return await res.json();
  } catch (e) {
    return { status: "error", model_loaded: false, error: String(e) };
  }
}
