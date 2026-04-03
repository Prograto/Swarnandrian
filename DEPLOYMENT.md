# Swarnandrian — Complete Deployment Guide
## Backend + Code Runner → Render | Frontend → Vercel

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                    CLOUD                         │
│                                                  │
│  ┌──────────────┐     ┌───────────────────────┐  │
│  │   Vercel     │     │        Render         │  │
│  │  (Frontend)  │────▶│  swarnandrian-backend │  │
│  │  React SPA   │     │  FastAPI  :8000       │  │
│  └──────────────┘     └──────────┬────────────┘  │
│                                  │               │
│                       ┌──────────▼────────────┐  │
│                       │ swarnandrian-code-    │  │
│                       │ runner  FastAPI :8001 │  │
│                       │ (Python/C++/Java/JS)  │  │
│                       └───────────────────────┘  │
│                                                  │
│  MongoDB Atlas (free M0 cluster — external)      │
└─────────────────────────────────────────────────┘
```

**Services you will create:**
| Service | Platform | Cost |
|---|---|---|
| Frontend (React) | Vercel | Free |
| Backend (FastAPI) | Render | Free |
| Code Runner (FastAPI) | Render | Free |
| Database (MongoDB) | MongoDB Atlas | Free (M0) |

> Render/Vercel note: the nginx and Redis services in the Docker Compose stack are for the self-hosted single-host deployment path. For the Render + Vercel setup below, Vercel serves the frontend directly and Render serves the backend plus code runner, so you do not deploy a separate nginx container. Redis is optional today and only needed if you later wire shared cache/session storage or Redis-backed WebSocket fan-out.
> If you want a VPS-style self-hosted production setup, use the host nginx config in [nginx/swarnandrian-backend.conf](nginx/swarnandrian-backend.conf).

---

## Prerequisites

- GitHub account (to push your code)
- [Render](https://render.com) account (sign up free)
- [Vercel](https://vercel.com) account (sign up free)
- [MongoDB Atlas](https://cloud.mongodb.com) account (already set up — you have a cluster)

---

## Step 1 — Push Project to GitHub

Your project structure should look like this before pushing:
```
swarnandrian_v2/
├── backend/
│   ├── Dockerfile         ← updated for Render
│   ├── requirements.txt
│   └── app/
├── code-runner/
│   ├── Dockerfile         ← updated for Render
│   ├── requirements.txt
│   └── src/
├── frontend/
│   ├── vercel.json        ← new
│   ├── .env.example       ← new
│   └── src/
├── render.yaml            ← new (optional but helpful)
└── .env                   ← DO NOT push this to GitHub
```

**Important — add `.env` to `.gitignore` before pushing:**
```bash
echo ".env" >> .gitignore
echo "frontend/.env.local" >> .gitignore
```

**Push to GitHub:**
```bash
git init
git add .
git commit -m "Initial commit — ready for deployment"
git remote add origin https://github.com/YOUR_USERNAME/swarnandrian.git
git push -u origin main
```

---

## Step 2 — Deploy Code Runner on Render

> Deploy this **first** so you have its URL ready for the backend.

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name:** `swarnandrian-code-runner`
   - **Root Directory:** `code-runner`
   - **Runtime:** `Docker`
   - **Dockerfile Path:** `./Dockerfile`
   - **Plan:** `Free`
4. Under **Environment Variables**, add:
   | Key | Value |
   |---|---|
   | `CODE_RUNNER_SECRET` | `SwarnandrianCodeRunnerSecret` |
   | `ALLOWED_ORIGINS_STR` | `http://localhost:3000,https://YOUR-APP.vercel.app` *(replace with your actual frontend origin(s))* |
   | `SANDBOX_TIMEOUT` | `10` |
5. Click **Create Web Service**

Wait for the build to finish (5–10 minutes). Once deployed, copy your service URL:
```
https://swarnandrian-code-runner.onrender.com
```

> **Note:** Free Render services sleep after 15 minutes of inactivity and take ~30 seconds to wake up. This is expected on the free tier.

---

## Step 3 — Deploy Backend on Render

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name:** `swarnandrian-backend`
   - **Root Directory:** `backend`
   - **Runtime:** `Docker`
   - **Dockerfile Path:** `./Dockerfile`
   - **Plan:** `Free`
4. Under **Environment Variables**, add all of these:

   | Key | Value |
   |---|---|
   | `MONGODB_URL` | `mongodb+srv://swarnandrian_db_user:Swarnandrian89@swarnandrian.m2yxgzv.mongodb.net/?appName=Swarnandrian` |
   | `MONGODB_DB_NAME` | `swarnandrian` |
   | `JWT_SECRET_KEY` | `SwarnandrianSecretKey2024` *(use a stronger key in production!)* |
   | `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` |
   | `CODE_RUNNER_URL` | `https://swarnandrian-code-runner.onrender.com` |
   | `CODE_RUNNER_SECRET` | `SwarnandrianCodeRunnerSecret` |
   | `ALLOWED_ORIGINS_STR` | `https://YOUR-APP.vercel.app` *(update after Vercel deploy)* |
   | `FRONTEND_URL` | `https://YOUR-APP.vercel.app` *(update after Vercel deploy)* |
   | `APP_ENV` | `production` |
   | `REDIS_URL` | Optional. Set this only if you later use a managed Redis service for shared cache/session storage or websocket fan-out. |
   | `AWS_ACCESS_KEY_ID` | *(your AWS key or leave blank)* |
   | `AWS_SECRET_ACCESS_KEY` | *(your AWS secret or leave blank)* |
   | `AWS_REGION` | `ap-south-1` |
   | `AWS_S3_BUCKET` | `swarnandrian` |

5. Click **Create Web Service**

Wait for the build to finish. Your backend URL will be:
```
https://swarnandrian-backend.onrender.com
```

Test it by visiting: `https://swarnandrian-backend.onrender.com/health`
You should see: `{"status": "ok", "platform": "Swarnandrian"}`

---

## Step 4 — Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Configure:
   - **Framework Preset:** `Create React App`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
4. Under **Environment Variables**, add:

   | Key | Value |
   |---|---|
   | `REACT_APP_API_URL` | `https://swarnandrian-backend.onrender.com/api/v1` |
   | `REACT_APP_BACKEND_URL` | `https://swarnandrian-backend.onrender.com` |

5. Click **Deploy**

Your frontend will be live at:
```
https://swarnandrian.vercel.app   (or similar)
```

The frontend now sends a silent warm-up request to `GET /api/v1/system/code-runner/health` when the site opens and again when the code editor page mounts. That request goes through the backend so the code runner can wake up from a cold start without exposing the runner secret to the browser.

---

## Step 5 — Update CORS in Backend

After getting your Vercel URL, go back to Render:

1. **Render Dashboard** → `swarnandrian-backend` → **Environment**
2. Update these two variables:
   - `ALLOWED_ORIGINS_STR` → `https://swarnandrian.vercel.app`
   - `FRONTEND_URL` → `https://swarnandrian.vercel.app`
3. Click **Save Changes** — Render will auto-redeploy

---

## Step 6 — Verify Everything Works

Test in this order:

```bash
# 1. Code Runner warm-up via backend proxy
curl https://swarnandrian-backend.onrender.com/api/v1/system/code-runner/health

# 2. Direct Code Runner health
curl https://swarnandrian-code-runner.onrender.com/health

# 3. Backend health
curl https://swarnandrian-backend.onrender.com/health

# 4. Backend API docs (open in browser)
https://swarnandrian-backend.onrender.com/api/docs

# 5. Frontend (open in browser)
https://swarnandrian.vercel.app
```

---

## Running Locally (Development)

### Option A — Docker Compose (recommended, runs everything)

```bash
# Clone your repo
git clone https://github.com/YOUR_USERNAME/swarnandrian.git
cd swarnandrian

# Make sure .env file exists (use the one you already have)
# Start all services
docker compose up --build

# Services will be available at:
# Frontend:    http://localhost:3000
# Backend:     http://localhost:8000
# Code Runner: http://localhost:8001
# API Docs:    http://localhost:8000/api/docs
```

### Option B — Run each service manually

**Terminal 1 — Backend:**
```bash
cd backend
pip install -r requirements.txt
# Copy .env to backend directory
cp ../.env .env
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Code Runner:**
```bash
cd code-runner
docker build -t swarnandrian-code-runner .
docker run --rm -it \
   -p 8001:8001 \
   --env-file ../.env \
   -e CODE_RUNNER_SECRET=SwarnandrianCodeRunnerSecret \
   swarnandrian-code-runner
```

Use Docker for the code runner even in local/manual mode. For Render and Vercel deployment, you do not run these terminal commands on the platform itself; Render uses the Dockerfiles and Vercel uses the build settings below.

If you change your frontend port or deploy to a custom domain, update `ALLOWED_ORIGINS_STR` in the shared `.env` so both the backend and code runner accept the same browser origin(s).

**Terminal 3 — Frontend:**
```bash
cd frontend
npm install
# .env.local is already configured for local dev
npm start
```

**Deployment commands summary**

| Target | Command / setup |
|---|---|
| Backend local | `uvicorn app.main:app --host 0.0.0.0 --port 8000` (`--reload` only for development) |
| Code Runner local | `docker build -t swarnandrian-code-runner .` then `docker run -d --name swarnandrian-code-runner --restart unless-stopped -p 8001:8001 --env-file ../.env -e CODE_RUNNER_SECRET=SwarnandrianCodeRunnerSecret swarnandrian-code-runner` |
| Render backend | Deploy `backend/Dockerfile`; Render starts `uvicorn app.main:app --host 0.0.0.0 --port $PORT` automatically |
| Render code runner | Deploy `code-runner/Dockerfile`; Render starts `uvicorn src.main:app --host 0.0.0.0 --port $PORT` automatically |
| Vercel frontend | `npm run build` with `frontend` as the root directory and `build` as the output directory |
| nginx | Not deployed on Render/Vercel. Use [nginx/swarnandrian-backend.conf](nginx/swarnandrian-backend.conf) only for VPS/self-hosted deployment |

### Option C — VPS / Direct Production Deploy

Use this if you want the backend running directly on a Linux server, the code runner built from its Dockerfile, the frontend on Vercel, and nginx installed on the host instead of inside Docker. This is the same pattern as Render + Vercel, except Render handles the backend and code runner as managed services.

**Backend:**
```bash
cd backend
pip install -r requirements.txt
cp ../.env .env
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

`--reload` is for local development only. Do not use it for production.

**Code Runner:**
```bash
cd code-runner
docker build -t swarnandrian-code-runner .
docker run -d \
   --name swarnandrian-code-runner \
   --restart unless-stopped \
   --env-file ../.env \
   -p 8001:8001 \
   swarnandrian-code-runner
```

Set `CODE_RUNNER_URL=http://127.0.0.1:8001` in the backend `.env` for this setup.

**Nginx on the host:**
Use [nginx/swarnandrian-backend.conf](nginx/swarnandrian-backend.conf) as the starting point and replace `api.example.com` with your API domain.

**Frontend:**
Deploy the React app to Vercel with `REACT_APP_API_URL` pointing to your backend domain, for example `https://api.example.com/api/v1`.

**Redis:**
Set `REDIS_URL` to your external managed Redis connection string only if you want shared cache/session storage or future websocket fan-out. It is not required by the current runtime code.

---

## MongoDB Atlas — Allow Render IPs

Render uses dynamic IPs. To allow connections from Render:

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. **Network Access** → **Add IP Address**
3. Click **Allow Access from Anywhere** → `0.0.0.0/0`
4. Click **Confirm**

> This is safe since your MongoDB user has a strong password and Atlas handles authentication separately.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Backend returns CORS error | Update `ALLOWED_ORIGINS_STR` in Render to include your Vercel URL |
| Code runner returns 401 Unauthorized | Make sure `CODE_RUNNER_SECRET` matches in both services |
| Services are slow to respond | Free tier Render services sleep — first request takes ~30 sec to wake up |
| MongoDB connection failed | Check `MONGODB_URL` is correct and Atlas allows `0.0.0.0/0` |
| Frontend shows blank page | Check browser console; make sure `REACT_APP_API_URL` is set correctly in Vercel |
| Build fails on Render | Check build logs — usually a missing dependency in requirements.txt |

---

## Environment Variables Quick Reference

### Backend (Render)
```
MONGODB_URL=mongodb+srv://...
MONGODB_DB_NAME=swarnandrian
JWT_SECRET_KEY=<strong-secret>
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CODE_RUNNER_URL=https://swarnandrian-code-runner.onrender.com
CODE_RUNNER_SECRET=<shared-secret>
ALLOWED_ORIGINS_STR=https://YOUR-APP.vercel.app
FRONTEND_URL=https://YOUR-APP.vercel.app
APP_ENV=production
AWS_ACCESS_KEY_ID=<optional>
AWS_SECRET_ACCESS_KEY=<optional>
AWS_REGION=ap-south-1
AWS_S3_BUCKET=swarnandrian
```

### Code Runner (Render)
```
CODE_RUNNER_SECRET=<same-shared-secret-as-backend>
SANDBOX_TIMEOUT=10
```

### Frontend (Vercel)
```
REACT_APP_API_URL=https://swarnandrian-backend.onrender.com/api/v1
REACT_APP_BACKEND_URL=https://swarnandrian-backend.onrender.com
```
