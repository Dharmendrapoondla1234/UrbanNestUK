# UrbanNest AI Platform v4

AI-powered real estate search for **India** 🇮🇳 and **UK** 🇬🇧.
Natural language queries · FAISS semantic search · Gemini 2.0 Flash · Real-time scraping · Property alerts.

---

## 🚀 Quick Start (Local Dev)

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker + Docker Compose
- Gemini API key (free at [aistudio.google.com](https://aistudio.google.com))

### 1. Clone & configure
```bash
git clone https://github.com/your-org/urbannest-ai
cd urbannest-ai
cp .env.example .env
# Edit .env — fill in GEMINI_API_KEY and VITE_GEMINI_KEY
```

### 2. Start infrastructure
```bash
docker compose up -d postgres redis
```

### 3. Backend setup
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head           # Create DB tables
uvicorn backend.api.main:app --reload --port 8000
```

### 4. Frontend setup
```bash
cd frontend
npm install
npm run dev                    # Runs on http://localhost:5173
```

### 5. Start workers (optional but needed for scraping & alerts)
```bash
cd backend
celery -A workers.celery_app worker --beat --loglevel=info
```

### 6. Test it works
```bash
# Health check
curl http://localhost:8000/api/health

# Natural language search — India
curl "http://localhost:8000/api/search/nl?q=2BHK+under+50+lakhs+Bangalore&country=india"

# Natural language search — UK
curl "http://localhost:8000/api/search/nl?q=flat+in+London+under+%C2%A3400k&country=uk"

# Trigger manual data ingest (replace ADMIN_KEY from .env)
curl -X POST "http://localhost:8000/api/admin/ingest?country=uk&admin_key=your-admin-key"
```

---

## ⚠️ Gemini Model Fix

The model `v1/gemini-1.5-flash-latest` is **deprecated** and returns 404.

**Use this endpoint instead:**
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_KEY
```

**Test your key:**
```bash
curl 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_KEY' \
  -H 'Content-Type: application/json' -X POST \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

| Error Code | Cause | Fix |
|------------|-------|-----|
| 404 | Wrong model name or `/v1/` endpoint | Use `/v1beta/gemini-2.0-flash` |
| 403 | API key invalid | Check key at aistudio.google.com |
| 400 | Bad request body | Verify JSON structure |
| 429 | Rate limited | Wait 1s between requests (free tier: 60/min) |

---

## 🏗️ Architecture

```
User Query
    ↓
Gemini NL Parser  →  Structured Filters
    ↓
FAISS Vector Index  →  Top-K Candidates
    ↓
PostgreSQL Filter  →  Ranked Results
    ↓
Optional: Gemini RAG Response
    ↓
React Frontend
```

**Stack:**
- **Backend:** FastAPI + SQLAlchemy + PostgreSQL + Redis + Celery
- **AI:** Gemini 2.0 Flash + FAISS + sentence-transformers (all-MiniLM-L6-v2)
- **Scraping:** BeautifulSoup + httpx (99acres, MagicBricks, Rightmove, Zoopla)
- **Frontend:** React 18 + Vite + Leaflet.js
- **Workers:** Celery Beat (scrape every 6h, FAISS rebuild nightly, alerts every 30min)

---

## 📁 File Structure

```
urbannest-ai/
├── backend/
│   ├── api/main.py              # FastAPI app — all routes
│   ├── ai/
│   │   ├── gemini_client.py     # Gemini 2.0 Flash client (FIXED model)
│   │   ├── query_parser.py      # NL → structured filters
│   │   └── rag_pipeline.py      # FAISS + Gemini RAG
│   ├── agents/
│   │   ├── scraper_agent.py     # 99acres + Rightmove scrapers
│   │   ├── cleaning_agent.py    # Dedup + normalise → DB ingest
│   │   ├── alert_agent.py       # Alert matching + email notify
│   │   └── quality_agent.py     # Data quality monitoring
│   ├── db/
│   │   ├── models.py            # SQLAlchemy ORM models
│   │   └── migrations/          # Alembic migrations
│   ├── services/
│   │   └── country_config.py    # India/UK config + price formatting
│   └── workers/celery_app.py    # Scheduled automation tasks
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Home.jsx         # Landing page
│       │   ├── Search.jsx       # NL + filter search
│       │   ├── Map.jsx          # Leaflet map view
│       │   ├── Advisor.jsx      # AI chat advisor
│       │   └── Alerts.jsx       # Alert management
│       └── services/
│           ├── gemini.js        # Gemini client (FIXED)
│           └── api.js           # Backend API calls
├── docker-compose.yml
└── .env.example
```

---

## 🌍 Deployment

### Backend → Render.com
1. Create a new **Web Service** on Render
2. Connect your GitHub repo
3. Set **Build Command:** `pip install -r backend/requirements.txt`
4. Set **Start Command:** `uvicorn backend.api.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables from `.env.example`
6. Add a **PostgreSQL** database and **Redis** instance
7. Copy the connection URLs to env vars

### Worker → Render.com
1. Create a **Background Worker** service (same repo)
2. **Start Command:** `celery -A workers.celery_app worker --beat --loglevel=info`
3. Same environment variables as the web service

### Frontend → Vercel
```bash
cd frontend
npm run build
vercel --prod
```
Set in Vercel project settings:
- `VITE_GEMINI_KEY` = your Gemini API key
- `VITE_API_BASE`  = https://your-backend.onrender.com

---

## 🔍 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check + property count |
| `/api/countries` | GET | All supported countries & config |
| `/api/search/nl?q=...&country=uk` | GET | Natural language search |
| `/api/search/filter` | GET | Filter-based search |
| `/api/properties/featured` | GET | Featured listings |
| `/api/properties/{id}` | GET | Property detail |
| `/api/properties/{id}/similar` | GET | Similar properties (FAISS) |
| `/api/favorites` | GET/POST/DELETE | Saved properties |
| `/api/alerts` | GET/POST/DELETE | Property alerts |
| `/api/ai/advisor` | POST | AI chat response |
| `/api/ai/valuation` | POST | AI property valuation |
| `/api/ai/market` | GET | Market intelligence |
| `/api/admin/ingest` | POST | Trigger data scraping |
| `/api/admin/rebuild-index` | POST | Rebuild FAISS index |
| `/ws/alerts/{user_id}` | WebSocket | Real-time alert delivery |

---

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ | Google AI Studio key |
| `VITE_GEMINI_KEY` | ✅ | Same key for frontend |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `SECRET_KEY` | ✅ | JWT signing secret |
| `ADMIN_KEY` | ✅ | Admin API protection |
| `ALLOWED_ORIGINS` | ✅ | CORS allowed origins |
| `RAPIDAPI_KEY` | Optional | Zoopla API access |
| `SMTP_*` | Optional | Email alert delivery |

---

## 📝 License

MIT — build on it, deploy it, extend it.
