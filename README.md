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
│   │   ├── api/
│   │   │   ├── deps.py       owner-JWT auth dependency
│   │   │   └── routes/       auth, analysis, recommendations, catalog, inventory,
│   │   │                     preview, dashboard, analytics
│   │   ├── services/
│   │   │   ├── cv/           face mesh, pose, skin tone, face/body shape classifiers
│   │   │   ├── recommendation/  diversity-aware, explainable scoring engine
│   │   │   ├── outfit_preview/  compositor + pluggable VTON engine adapter
│   │   │   ├── future/        pluggable extension points — chatbot, voice assistant,
│   │   │   │                  smart mirror, trend prediction, feedback learning
│   │   │   ├── catalog_service.py         preloaded, built-in catalog
│   │   │   ├── inventory_service.py       owner-managed live inventory
│   │   │   ├── combined_catalog_service.py merges both pools for shoppers
│   │   │   ├── analytics_service.py       cross-session aggregation
│   │   │   ├── owner_service.py / rating_service.py / session_service.py
│   │   │   └── pdf_report_service.py      ReportLab dashboard PDF export
│   │   ├── models/schemas.py   Pydantic contracts shared across the API
│   │   ├── data/              built-in catalog.json, color_palettes.json
│   │   └── core/               config, security (JWT/bcrypt), MongoDB connection
│   └── requirements.txt
└── frontend/                 React 19 + Vite + TypeScript + Tailwind v4
    └── src/
        ├── pages/             Home, Dashboard, AI Analysis, Recommendation,
        │                      Virtual Preview, Showroom, Analytics, About,
        │                      OwnerLogin, OwnerDashboard
        ├── components/ui/     glass cards, particle background, score rings,
        │                      star rating, score bars, skeleton loaders, etc.
        ├── hooks/              useLocalStorage, useDebounce, useKeyboardShortcuts,
        │                      useCachedFetch (lightweight TTL cache)
        ├── context/            SessionContext (no-login shopper state + recently
        │                      viewed), OwnerContext (JWT auth), ThemeContext
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

### Owner Portal

There is exactly one authenticated role — the showroom owner (no shopper
accounts exist). A bootstrap owner account is created automatically on
first backend startup from `OWNER_BOOTSTRAP_EMAIL` / `OWNER_BOOTSTRAP_PASSWORD`
in `backend/.env` (defaults: `owner@visionstyle.ai` / `ChangeMe123!` —
**change these before any real deployment**). Sign in at `/owner/login` to
manage inventory at `/owner/dashboard`.

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
7. **Owner authentication** — JWT-based login for the single showroom-owner role (no
   shopper accounts). Passwords are hashed with `bcrypt` directly (not `passlib`, which
   has known incompatibilities with modern bcrypt releases).
8. **Inventory management** — owner-only CRUD for products (category, brand, price,
   sizes, colors, rack number, stock, availability, multi-image upload), stored in a
   dedicated `inventory_items` Mongo collection (JSON-backed in-memory fallback like every
   other service) and merged with the preloaded catalog via `CombinedCatalogService` so
   both pools feed the recommendation engine and showroom together.
9. **Smart Showroom** — free-text + faceted search (category, brand, availability, rack
   location, price range), a "nearest matching products" endpoint (shared style/occasion/
   season/budget/color scoring against a chosen SKU), and live inventory statistics.
10. **Analytics dashboard** — Recharts-driven platform analytics (most recommended colors/
    brands/categories, popular face/body shapes, recommendation accuracy, average rating,
    inventory status) aggregated from real stored analyses/recommendations — plus the
    original per-session confidence breakdown.
11. **AI recommendation diversity** — the engine now returns up to 10 unique outfit
    combinations per request instead of one: each category's top-K candidates are
    softmax-weighted and sampled (not always the argmax), with generated SKU-combinations
    deduplicated, so the same shirt/jacket pairing doesn't repeat across the set. Every
    outfit carries a transparent `ScoreBreakdown` (fashion / color-harmony / body-fit /
    occasion-match) plus its own AI-explanation strings.
12. **Extra features** — PDF report export (ReportLab), a two-outfit Compare view, an
    interactive before/after slider (original photo vs. virtual preview), session-only
    star ratings (feeding the accuracy/rating analytics and the Phase 14 feedback-learning
    groundwork), an AI Explanation Panel per recommendation, session-scoped Recently
    Viewed, a dark/light theme toggle (persisted, `T` shortcut), and global keyboard
    shortcuts (`H`/`D`/`A`/`S`/`T`).
13. **Optimization** — reusable hooks (`useLocalStorage`, `useDebounce`,
    `useKeyboardShortcuts`, `useCachedFetch` — a lightweight TTL cache deduping repeated
    catalog/analytics reads), route-level lazy loading + `<Suspense>`, an `ErrorBoundary`
    isolating page/section failures, shimmer loading skeletons for grid content, and
    `loading="lazy"` / `decoding="async"` on below-the-fold images.
14. **Future-ready architecture** — `backend/app/services/future/` defines typed adapter
    interfaces (mirroring the Phase 5 `VTONEngine` pattern) for an AI chatbot, a voice
    assistant, a physical Smart Mirror's streaming-frame contract, and a feedback-learning
    export that turns the ratings already captured in Phase 12 into training examples for
    a learned scoring model. Trend prediction ships partially real today —
    `GET /api/v1/analytics/trends` computes week-over-week category momentum from actual
    recommendation history. **MongoDB Atlas**: `MONGODB_URI` already accepts `mongodb+srv://`
    connection strings with zero code changes. **Mobile app**: the API is a versioned,
    stateless JSON REST surface (`/api/v1/...`) with CORS already externalized to config —
    a native client is just another consumer of the same endpoints used by this web frontend.
