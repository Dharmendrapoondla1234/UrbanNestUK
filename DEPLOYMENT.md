# 🚀 Deployment Guide — UrbanNest UK

## Why the fix works

Previous attempts used `uvicorn backend.api.main:app` — this requires Python to
find `backend` as a package, which fails on Render because the repo root is not
automatically on `sys.path`.

**The fix:** `main.py` and `crm_main.py` sit at the repo root and contain the
full app code with no package imports. Uvicorn loads them directly:
- `uvicorn main:app` → no package resolution needed ✅
- `uvicorn crm_main:app` → no package resolution needed ✅

---

## 📦 Deploy to Render (Backends)

### Option A — Automatic via render.yaml (recommended)
Render Dashboard → **New → Blueprint** → connect your repo.
Render reads `render.yaml` and creates both services automatically.

### Option B — Manual via Render Dashboard

#### Main Backend
| Setting | Value |
|---|---|
| Root Directory | *(leave blank)* |
| Build Command | `pip install -r backend/requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

#### CRM Backend
| Setting | Value |
|---|---|
| Root Directory | *(leave blank)* |
| Build Command | `pip install -r crm/backend/requirements.txt` |
| Start Command | `uvicorn crm_main:app --host 0.0.0.0 --port $PORT` |

---

## 🔑 Environment Variables

### Render — Main Backend
| Variable | Value |
|---|---|
| `GEMINI_API_KEY` | Your Gemini API key |
| `GOOGLE_MAPS_API_KEY` | Your Maps key |
| `ALLOWED_ORIGINS` | `https://your-frontend.vercel.app` |

### Render — CRM Backend
| Variable | Value |
|---|---|
| `GEMINI_API_KEY` | Your Gemini API key |
| `ALLOWED_ORIGINS` | `https://your-crm.vercel.app` |

### Vercel — Main Frontend (`frontend/`)
| Variable | Value |
|---|---|
| `VITE_GEMINI_KEY` | Your Gemini API key |
| `VITE_MAPS_KEY` | Your Google Maps JS API key |
| `VITE_API_BASE` | `https://urbannest-backend.onrender.com` |
| `VITE_CRM_URL` | `https://urbannest-crm.vercel.app` |

### Vercel — CRM Frontend (`crm/frontend/`)
| Variable | Value |
|---|---|
| `VITE_CRM_API` | `https://urbannest-crm-backend.onrender.com` |
| `VITE_GEMINI_KEY` | Your Gemini API key |

---

## 🌐 Deploy to Vercel (Frontends)

### Main Frontend
1. Vercel Dashboard → New Project → Import repo
2. **Root Directory:** `frontend`
3. **Framework:** Vite
4. Add env vars → Deploy

### CRM Frontend
1. New Project → same repo
2. **Root Directory:** `crm/frontend`
3. **Framework:** Vite
4. Add env vars → Deploy

---

## 🔄 Local Development

```bash
# Terminal 1 — Main Backend (from repo root)
pip install -r backend/requirements.txt
uvicorn main:app --reload --port 8000
# → http://localhost:8000/api/docs

# Terminal 2 — CRM Backend (from repo root)
pip install -r crm/backend/requirements.txt
uvicorn crm_main:app --reload --port 8001
# → http://localhost:8001/crm/docs

# Terminal 3 — Main Frontend
cd frontend && cp .env.example .env
npm install && npm run dev
# → http://localhost:3000

# Terminal 4 — CRM Frontend
cd crm/frontend && npm install && npm run dev
# → http://localhost:5173
```

---

## ✅ Health Checks
```
GET https://urbannest-backend.onrender.com/api/health
GET https://urbannest-crm-backend.onrender.com/crm/health
```
