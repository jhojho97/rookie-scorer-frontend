# Research Productivity Predictor — Frontend

A production-ready **Next.js 14 (App Router) + TypeScript** frontend for the
Accounting Research Productivity Predictor. It talks to the existing FastAPI
backend (hosted on Render) and presents predictions, SHAP explainability, and
per-request token cost as a polished, professional report.

Stack: **TypeScript · TailwindCSS · shadcn-style UI · Framer Motion · Recharts ·
Lucide · TanStack Query · Firebase Auth · react-dropzone · jsPDF**.

---

## Architecture — the important part

The backend is gated by a single secret `X-API-Key`. **That key must never reach
the browser.** So the app never calls Render directly from the client. Instead:

```
Browser ──(Firebase ID token)──▶ Next.js proxy /api/*  ──(X-API-Key)──▶ FastAPI (Render)
         same-origin, no secret     verifies user, adds secret            scores
```

- `src/app/api/*` — server-side **proxy route handlers**. They verify the caller's
  Firebase ID token (`firebase-admin`) and attach `X-API-Key` (`BACKEND_API_TOKEN`,
  a **server-only** env var) before forwarding. The token is never in the bundle.
- `src/services/api.ts` — the **client** API layer. Calls only same-origin `/api/*`
  with the Firebase ID token as a `Bearer` header. Strongly typed.

> Because a Node server is required for the proxy, deploy to **Vercel** (not a
> HuggingFace *Static* Space — static hosting can't run the proxy or keep the
> token secret). This was a deliberate security choice.

---

## Project structure

```
src/
  app/                      # App Router pages + API proxy routes
    api/{health,predict,batch,jobs}/route.ts
    login|register|forgot-password/page.tsx
    dashboard/{student,hr}/page.tsx   # role dashboards (guarded layout)
    page.tsx                          # landing
  components/               # UI + domain components (see below)
    ui/                     # shadcn-style primitives (button, card, input…)
    layout/                 # Header, Sidebar, Footer
  contexts/AuthContext.tsx  # Firebase auth + dev fallback, role handling
  hooks/                    # usePredict, useBatchJob, useUsage
  services/api.ts           # typed client → /api proxy
  lib/                      # env, firebase(+admin), backend, csv, pdf, usage, format
  types/index.ts            # backend response types
```

Reusable components: `UploadCard`, `ScoreGauge`, `ContributionChart` (SHAP
waterfall), `CostCard`, `CandidateTable`, `ProgressTimeline`, `ReportCard`,
`FeatureAccordion`, `UsageDashboard`, `Header`/`Sidebar`/`Footer`.

---

## Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local   # then fill in values
npm run dev                        # http://localhost:3000
```

### Environment variables (`.env.local`)

**Server-only (never shipped to the browser):**

| Var | Purpose |
|---|---|
| `BACKEND_API_URL` | FastAPI base URL (default: the Render URL) |
| `BACKEND_API_TOKEN` | The backend `X-API-Key`. **Secret.** |
| `FIREBASE_ADMIN_PROJECT_ID` / `_CLIENT_EMAIL` / `_PRIVATE_KEY` | Service account for verifying ID tokens. Required in production. |

**Public (safe to expose):**

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` / `_AUTH_DOMAIN` / `_PROJECT_ID` / `_APP_ID` | Firebase web config |
| `NEXT_PUBLIC_MONTHLY_QUOTA_USD` | Budget warning threshold (default 5) |
| `NEXT_PUBLIC_MAX_FILE_MB` | Upload size limit (default 20) |
| `NEXT_PUBLIC_AUTH_DEV_MODE` | `true` → run WITHOUT Firebase using a local mock login (great for first run) |

> **Dev mode:** with `NEXT_PUBLIC_AUTH_DEV_MODE=true` (the default in the example
> file) the app runs immediately without any Firebase project — any email/password
> "logs in", and the proxy skips ID-token verification (dev only). Set it to
> `false` and fill the Firebase vars for real auth.

### Firebase (real auth)

1. Create a Firebase project → enable **Email/Password** sign-in.
2. Copy the web config into the `NEXT_PUBLIC_FIREBASE_*` vars.
3. Create a **service account** (Project settings → Service accounts → Generate key)
   and set the `FIREBASE_ADMIN_*` vars (paste the private key with its `\n`
   newlines, quoted).
4. Set `NEXT_PUBLIC_AUTH_DEV_MODE=false`.

Roles (`student` / `hr`) are chosen at registration and stored per-uid. For a
hardened setup, move roles to Firebase **custom claims** and enforce them in the
proxy (`src/lib/firebaseAdmin.ts` is where you'd read them).

---

## Deploy to Vercel

1. Push this `frontend/` folder to a Git repo and **Import** it in Vercel.
2. Add every variable above in **Project → Settings → Environment Variables**
   (server-only ones stay server-only automatically — don't prefix them
   `NEXT_PUBLIC`).
3. Deploy. The proxy routes run as serverless functions.

**Cold starts:** the Render free tier sleeps and takes ~50s to wake. The app
warms it via `/health` on load, shows a "Backend is starting… ~1 minute" message,
and TanStack Query retries. Note Vercel **Hobby** caps functions at **60s** — if a
score lands during a cold start it may need one retry; **Pro** (300s) removes this.
Keeping the backend warm (an uptime pinger) eliminates it entirely.

---

## Features mapped to the spec

- **Auth:** login / register / forgot-password (Firebase, with dev fallback).
- **Roles:** landing → Student / HR; guarded role dashboards.
- **Student:** drag-drop CV + optional JMP → animated `ProgressTimeline` → full
  `ReportCard` (gauge, comparison, top contributors, areas to improve, SHAP
  waterfall, feature accordion, token-cost card) → **PDF export**.
- **HR:** dynamic candidate rows (add/remove, 50+), batch submit, live progress
  bar via **polling**, sortable/searchable `CandidateTable`, **CSV export**,
  row-click opens the same `ReportCard`.
- **Budget:** per-request USD + tokens, running `UsageDashboard` (today / month)
  with a configurable monthly-quota warning.
- **Charts (Recharts):** radial gauge, horizontal SHAP waterfall (green/red +
  tooltip), cost pie.
- **Robustness:** typed error handling for 401/403/404/422/500, network timeout,
  and the Render cold-start case; skeletons/shimmer loading; keyboard/ARIA
  accessibility; lazy-loaded PDF libs; TanStack Query caching + retry + cancel.

---

## Scripts

```bash
npm run dev        # local dev
npm run build      # production build
npm run start      # serve the build
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
```

## Notes

- The backend response shapes are typed in `src/types/index.ts` and match the
  live API (`/predict`, `/predict/batch_files`, `/jobs/{id}`).
- Usage accounting is client-side (localStorage) per the spec's "today's usage"
  widget. For cross-device enforcement, persist usage server-side and check it in
  the proxy before forwarding.
