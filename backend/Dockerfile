# ─────────────────────────────────────────────────────────────
# Swarnandrian Backend — FastAPI
# Deploy on: Render (Free Tier)
# ─────────────────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# System deps (gcc needed for some pip packages)
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app source
COPY . .

# Render assigns PORT dynamically; default to 8000 for local use
ENV PORT=8000

EXPOSE 8000

# Use $PORT so Render can inject it at runtime
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
