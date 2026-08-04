# VisionStyle — AI Powered Personalized Fashion Recommendation System

VisionStyle analyzes a user's appearance from an uploaded photo — face shape, body
shape, and skin tone — using real computer vision (MediaPipe face mesh + pose
landmarks, OpenCV, CIE-LAB color science) and generates explainable, personalized
fashion recommendations. No login required; sessions are local to the device.

## Architecture

```
visionstyle/
├── backend/                 FastAPI + MongoDB (Motor) + MediaPipe/OpenCV
│   ├── app/
│   │   ├── api/routes/      analysis, recommendations, catalog, preview, dashboard
│   │   ├── services/
│   │   │   ├── cv/          face mesh, pose, skin tone, face/body shape classifiers
│   │   │   ├── recommendation/  explainable scoring engine
│   │   │   └── outfit_preview/  compositor + pluggable VTON engine adapter
│   │   ├── models/schemas.py   Pydantic contracts shared across the API
│   │   ├── data/             built-in catalog.json, color_palettes.json
│   │   └── core/             config, MongoDB connection (graceful fallback)
│   └── requirements.txt
└── frontend/                 React 19 + Vite + TypeScript + Tailwind v4
    └── src/
        ├── pages/             Home, Dashboard, AI Analysis, Recommendation,
        │                      Virtual Preview, Showroom, Analytics, About
        ├── components/ui/     glass cards, particle background, score rings, etc.
        ├── context/           no-login session state (localStorage + backend hydration)
        └── services/api.ts    typed API client
```

## Running locally

### Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # optionally point MONGODB_URI at MongoDB Compass / mongod
uvicorn app.main:app --reload --port 8000
```

MongoDB is optional for development: if unreachable, the API automatically falls
back to the bundled JSON catalog and an in-memory session store, logging a warning.
Start MongoDB Compass (or `mongod`) and set `MONGODB_URI` in `.env` to enable full
persistence — the catalog seeds itself into MongoDB automatically on startup once
connected.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The Vite dev server proxies `/api` and `/media` to `http://localhost:8000`.

## Phases implemented

1. **Project setup** — Vite/React + FastAPI + MongoDB architecture, shared types/utilities.
2. **Premium UI** — glassmorphism, purple/orange/emerald/gold/crimson palette (no blue),
   particle backgrounds, animated cards, fully responsive.
3. **AI Analysis** — real MediaPipe face mesh (468 landmarks) + BlazePose detection,
   geometric face/body-shape classifiers scored against similarity profiles (not a
   hardcoded default), CIE-LAB skin-tone extraction with undertone/depth classification.
4. **Recommendation engine** — rule-based, explainable scoring across face shape, body
   shape, skin tone, occasion, budget, season and style — every recommended item ships
   with a plain-language reason.
5. **Virtual outfit preview** — pose-guided image compositing of selected garments onto
   the user's photo, architected behind a `VTONEngine` interface so IDM-VTON, CatVTON, or
   StableVITON can be dropped in later without touching API routes.
6. **Built-in catalog + dashboard** — JSON-seeded catalog (Mongo-backed once connected,
   with soft-delete for future removal of built-in items) and a no-login dashboard
   aggregating appearance summary, outfit preview, color palette, AI score, and a
   downloadable JSON report.
