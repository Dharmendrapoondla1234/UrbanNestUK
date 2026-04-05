# 🏙️ MetroFlats Pro — AI-Powered Real Estate Platform

A comprehensive, production-ready real estate ecosystem for India, featuring AI-powered search, price prediction, market analysis, and a full CRM system.

---

## 🗂️ Project Structure

```
MetroFlats-Pro/
├── frontend/                    ← Main real estate portal (React + Vite)
│   ├── src/
│   │   ├── App.jsx              ← Root app with routing & auth guard
│   │   ├── components/
│   │   │   ├── ai/
│   │   │   │   ├── PricePrediction.jsx   ← AI price predictor (Gemini)
│   │   │   │   ├── MarketAnalysis.jsx    ← Market insights (Gemini)
│   │   │   │   └── PropertyAdvisor.jsx   ← AI advisor (Gemini + fallback)
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.jsx            ← Sticky nav with auth
│   │   │   │   └── AuthModal.jsx         ← Sign-in / register modal
│   │   │   ├── map/
│   │   │   │   └── MapView.jsx           ← Interactive map (Google Maps / SVG fallback)
│   │   │   ├── property/
│   │   │   │   ├── PropertyCard.jsx      ← Listing card with ratings
│   │   │   │   └── PropertyDetail.jsx    ← Full property modal
│   │   │   └── search/
│   │   │       └── SearchPanel.jsx       ← Advanced filters + amenity prefs
│   │   ├── hooks/
│   │   │   └── useAuth.jsx               ← Auth context provider
│   │   ├── pages/
│   │   │   ├── Home.jsx                  ← Landing page (guest-friendly)
│   │   │   ├── Search.jsx                ← Full search results
│   │   │   ├── Map.jsx                   ← Map-based property search
│   │   │   ├── Advisor.jsx               ← AI advisor page
│   │   │   ├── Predict.jsx               ← Price prediction page
│   │   │   └── Market.jsx                ← Market analysis page
│   │   ├── services/
│   │   │   └── ai.js                     ← Gemini AI + backend API calls
│   │   └── utils/
│   │       └── design.js                 ← Design tokens, formatters, constants
│   ├── public/
│   │   └── favicon.svg
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── vercel.json
│   └── .env.example
│
├── backend/                     ← Main FastAPI backend
│   ├── api/
│   │   └── main.py              ← Property API with dynamic data generation
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── crm/                         ← Real Estate CRM (separate app)
│   ├── frontend/                ← CRM React app (port 5173)
│   └── backend/                 ← CRM FastAPI (port 8001)
│
├── DEPLOYMENT.md                ← Full deployment guide
└── GIT_SETUP.md
```

---

## ✨ Features

### 🏘️ Property Types
Apartments · Villas · Penthouses · Bungalows · Plots · Land · Shops · Commercial Spaces · Rental Apartments · Studios

### 🔍 Smart Search
- Advanced filters: location, price range, area (sqft), property type, BHK, furnishing, availability
- **AI-powered location suggestions** — type any area for Gemini-powered recommendations
- **Amenity proximity preferences** — Schools, Hospitals, Clinics, Stores, Banks, Gyms, Parks, Metro with Low/Medium/High distance levels

### 🤖 AI Features (require sign-in)
| Feature | Description |
|---|---|
| **Price Prediction** | ML-powered valuation using Gemini — location, area, type, floor, furnishing |
| **Market Analysis** | Price trends, demand/supply metrics, growth potential, upcoming projects |
| **Property Advisor** | Personalised area recommendations with financial guidance and buyer checklist |
| **Location Insights** | Safety, lifestyle, water availability, pollution, neighborhood culture ratings |

### 🗺️ Map Search
- Interactive map with property markers
- Click-to-place custom markers
- Google Maps integration (add `VITE_MAPS_KEY`) or SVG fallback
- Property panel syncs with map selection

### 📊 Property Listings
- **Original images prioritised**, Unsplash fallback when unavailable
- Multiple images with gallery navigation
- 360° view flag support
- Detailed ratings: Overall · Locality · Safety · Lifestyle · Water · Pollution · Culture
- RERA verification badge
- Builder information

### 🔐 Auth & UX
- Guest view: simplified interface with featured listings
- Signed-in view: full AI features unlocked
- Auth modal with feature showcase
- Progressive engagement design

---

## 🚀 Quick Start

### Frontend

```bash
cd frontend
cp .env.example .env
# Add your VITE_GEMINI_KEY and VITE_MAPS_KEY to .env
npm install
npm run dev
# → http://localhost:3000
```

### Backend

```bash
cd backend  (or from root)
pip install -r backend/requirements.txt
uvicorn backend.api.main:app --reload --port 8000
# → http://localhost:8000/api/docs
```

### CRM

```bash
# Terminal A — CRM Backend
pip install -r crm/backend/requirements.txt
uvicorn crm.backend.api.main:app --reload --port 8001

# Terminal B — CRM Frontend
cd crm/frontend
npm install && npm run dev
# → http://localhost:5173
```

---

## 🔑 Environment Variables

### `frontend/.env`
```env
VITE_GEMINI_KEY=your_gemini_api_key      # aistudio.google.com
VITE_MAPS_KEY=your_google_maps_key       # console.cloud.google.com
VITE_API_BASE=http://localhost:8000      # Backend URL
VITE_CRM_URL=http://localhost:5173       # CRM URL
```

### `backend/.env`
```env
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_MAPS_API_KEY=your_maps_key
ALLOWED_ORIGINS=http://localhost:3000
PORT=8000
```

---

## 🌐 Deployment

See `DEPLOYMENT.md` for full guide:
- **Frontend** → Vercel (Root: `frontend`)
- **Backend** → Render (Build: `pip install -r backend/requirements.txt`)
- **CRM Frontend** → Vercel (Root: `crm/frontend`)
- **CRM Backend** → Render (Build: `pip install -r crm/backend/requirements.txt`)

---

## 🐛 Bug Fixes Applied

1. **Property Advisor crash** — Fixed JSON parsing error with regex extraction + complete fallback dataset
2. **Missing frontend** — Built entire main frontend from scratch (was empty)
3. **No error boundaries** — All AI calls now have try/catch with graceful fallbacks
4. **Package name** — Updated from `uk-realestate-frontend` to `metroflats-pro-frontend`
5. **Hardcoded values** — All prices/data now dynamically generated per city/area
