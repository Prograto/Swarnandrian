# ─────────────────────────────────────────────────────────────
# Swarnandrian Code Runner — Multi-language execution engine
# Deploy on: Render (Free Tier) as a separate Web Service
# ─────────────────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# ── All language runtimes ────────────────────────────────────
RUN apt-get update && apt-get install -y \
    # C / C++
    gcc \
    g++ \
    # Node.js (for JavaScript)
    nodejs \
    # Java
    default-jdk \
    && rm -rf /var/lib/apt/lists/*

# ── Python dependencies ──────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── App source ───────────────────────────────────────────────
COPY . .

# Sandbox temp dir for code execution
RUN mkdir -p /tmp/sandbox

# Render assigns PORT dynamically; default to 8001 for local use
ENV PORT=8001

EXPOSE 8001

CMD uvicorn src.main:app --host 0.0.0.0 --port $PORT
