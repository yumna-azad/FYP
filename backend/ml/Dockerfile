# SmartLoc ML — Docker image for HuggingFace Spaces.
# HF Spaces with Docker SDK expects the app to listen on port 7860.

FROM python:3.11-slim

# Build deps for some scientific python wheels (numpy / xgboost / shap)
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first so layer is cached across code edits
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# Copy application code + trained model
COPY server.py features.py smartloc_xgb_model.joblib ./

# HF Spaces Docker convention
EXPOSE 7860

# Warm-load the model + SHAP TreeExplainer on first request, not at boot,
# so the container starts quickly and HF's health check passes.
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "7860"]
