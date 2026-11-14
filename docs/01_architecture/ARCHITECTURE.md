# FloatChat / OceanGPT — System Architecture

> Last updated: 2026-05-06

## 1. Vision

FloatChat is an **agentic ocean intelligence platform** that lets users have natural-language conversations with real-time ocean data. Instead of manually querying databases or downloading NetCDF files, users simply ask questions like *"Is the water getting saltier near the Maldives?"* and the platform autonomously fetches, analyzes, and visualizes the answer.

---

## 2. Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                     USER (Browser)                       │
│  ┌─────────┐  ┌──────────┐  ┌──────┐  ┌──────────────┐  │
│  │ChatPanel│  │ MapPanel  │  │PlotP │  │  TablePanel   │  │
│  └────┬────┘  └────┬─────┘  └──┬───┘  └──────┬───────┘  │
│       │            │           │              │          │
│       └────────────┴───────────┴──────────────┘          │
│                        │                                 │
│              POST /api/query                             │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│              NEXT.JS SERVER (port 3000)                    │
│  ┌─────────────────────────────────────────────┐           │
│  │  /api/query/route.ts (MCP Client & LPU Loop)│           │
│  │  • Receives user text                       │           │
│  │  • Connects to Python MCP Server via SSE    │           │
│  │  • Groq LPU tool-calling & synthesis loop   │           │
│  └──────────────────────┬──────────────────────┘           │
│                         │ SSE Transport                    │
└─────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│            PYTHON MCP SERVER (port 8000)                    │
│  ┌─────────────────────────────────────────────────┐        │
│  │  backend/mcp_server.py (FastMCP + SSE)          │        │
│  │                                                 │        │
│  │  TOOLS:                                         │        │
│  │  ├─ get_ocean_profile    → Argovis API          │        │
│  │  ├─ search_ocean_area    → Argovis API          │        │
│  │  ├─ check_float_health   → OceanOPS API         │        │
│  │  ├─ search_erddap        → ERDDAP Tabledap     │        │
│  │  └─ system_health_check  → Internal             │        │
│  └──────────┬──────────────┬───────────┬───────────┘        │
│             │              │           │                    │
└─────────────┼──────────────┼───────────┼────────────────────┘
              │              │           │
              ▼              ▼           ▼
     ┌────────────┐  ┌────────────┐  ┌──────────┐
     │ Argovis API│  │OceanOPS API│  │  ERDDAP  │
     │ (Profiles) │  │ (Metadata) │  │(Fallback)│
     └────────────┘  └────────────┘  └──────────┘
```

---

## 3. Technology Stack

| Layer              | Technology          | Purpose                                      |
|--------------------|---------------------|----------------------------------------------|
| **Frontend**       | Next.js 14 (React)  | SSR pages, API routes, chat UI               |
| **Styling**        | Tailwind CSS 3      | Ocean-themed design system                   |
| **Maps**           | Leaflet / react-leaflet | Interactive ocean map visualization       |
| **Charts**         | Plotly.js            | Temperature/salinity depth profiles          |
| **State Mgmt**     | Zustand              | Client-side chat & visualization state       |
| **MCP Client**     | @modelcontextprotocol/sdk | Connects Next.js ↔ Python backend     |
| **MCP Server**     | Python FastMCP       | Agentic tool orchestration                   |
| **LLM Engine**     | Groq Cloud (`openai/gpt-oss-120b`, `openai/gpt-oss-20b`) | High-speed OpenAI tool calling & oceanographic reasoning |
| **Data: Profiles** | Argovis REST API     | Primary ocean data (temp, salinity, pressure)|
| **Data: Metadata** | OceanOPS REST API    | Float health, deployment info, ownership     |
| **Data: Fallback** | ERDDAP Tabledap      | Bulk/niche datasets, buoy data               |

---

## 4. Data Flow — End to End

```
User types: "Show me the temperature near the Maldives"
     │
     ▼
[ChatPanel] ──POST──► [/api/query/route.ts]
                          │
                          │ 1. Connect to MCP Server (SSE)
                          │ 2. Pass user query + history
                          ▼
                    [mcp_server.py]
                          │
                          │ 3. LLM decides which tool(s) to call
                          │
                          ├──► get_ocean_profile(lat=4.17, lon=73.5)
                          │       └──► GET https://argovis-api.colorado.edu/argo
                          │                ?box=[[72,3],[74,5]]
                          │                &data=temperature,salinity
                          │            Returns: JSON array of profiles
                          │
                          ├──► check_float_health(wmo_id=2902169)
                          │       └──► GET https://www.ocean-ops.org/api/1/platforms/2902169
                          │            Returns: deployment date, battery, sensor health
                          │
                          ▼
                    [Groq LPU Engine]
                           │
                           │ 4. Executes multi-turn tool loops with FastMCP
                           │ 5. Synthesizes oceanographic intelligence (Finding -> Impact -> Recommendation)
                           │ 6. Extracts coordinates & returns visualization commands
                          ▼
                    [/api/query response]
                          │
                          │ JSON: { message, intent, coordinates,
                          │         toolsUsed, visualizationCommands }
                          ▼
             ┌────────────┼────────────┐
             ▼            ▼            ▼
        [ChatPanel]  [MapPanel]   [PlotPanel]
        Shows text   Plots floats  Renders depth
        explanation  on Leaflet    profiles
```

---

## 5. External API Reference

### 5.1 Argovis API
- **Base URL**: `https://argovis-api.colorado.edu`
- **Auth**: Header `x-argokey: <ARGOVIS_API_KEY>`
- **Key Endpoints**:
  - `GET /argo?platform=<WMO_ID>&data=temperature,salinity` — profile by float
  - `GET /argo?box=[[lon_min,lat_min],[lon_max,lat_max]]&data=temperature` — profiles by bounding box
  - `GET /argo?circle_center=<lon>,<lat>&circle_radius=<km>` — profiles by radius
- **Docs**: https://argovis-api.colorado.edu/docs/

### 5.2 OceanOPS API
- **Base URL**: `https://www.ocean-ops.org/api/1`
- **Auth**: None required (public metadata)
- **Key Endpoints**:
  - `GET /platforms/<WMO_ID>` — deployment info, battery, sensor health
  - `GET /platforms?status=ACTIVE&network=Argo` — list active floats
- **Docs**: https://www.ocean-ops.org/api/swagger/

### 5.3 ERDDAP Tabledap
- **Base URL**: `https://erddap.osmc.noaa.gov/erddap/tabledap`
- **Auth**: None required
- **Key Endpoints**:
  - `GET /argo.json?longitude,latitude,time&time>=2024-01-01` — bulk queries
  - Supports `.json`, `.csv`, `.png` response formats
- **Docs**: https://erddap.osmc.noaa.gov/erddap/tabledap/documentation.html

---

## 6. Folder Structure

```
FloatChat/
├── .env                          # Environment secrets (never commit)
├── .gitignore
├── package.json                  # Next.js dependencies
├── tailwind.config.js            # Ocean design system tokens
├── next.config.js
│
├── backend/                      # Python MCP Server
│   ├── mcp_server.py             # FastMCP server with ocean tools
│   ├── requirements.txt          # Python dependencies
│   ├── venv/                     # Python virtual environment
│   └── chroma_data/              # (Optional) Embedded ChromaDB cache
│
├── docs/                         # Project documentation
│   ├── ARCHITECTURE.md           # This file
│   ├── PROJECT_PLAN.md           # Detailed task breakdown
│   ├── USER_FLOW.md              # UX user journey documentation
│   ├── API_INTEGRATION.md        # External API usage guide
│   ├── MCP_TOOLS.md              # MCP tool reference
│   ├── PROGRESS.md               # Living progress tracker
│   ├── api-contract.md           # Internal API response schemas
│   ├── admin-dashboard.md        # Admin panel docs
│   └── platform_vision/          # SQL schemas & vision docs
│
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── page.tsx              # Landing page
│   │   ├── layout.tsx            # Root layout
│   │   ├── app/                  # /app — Main chat+explorer
│   │   ├── admin/                # /admin — System health dashboard
│   │   ├── planner/              # /planner — Coastal project planner
│   │   ├── legal/                # /legal — Maritime law agent
│   │   ├── dashboard/            # /dashboard — Project metrics
│   │   ├── upload/               # /upload — Data ingestion
│   │   ├── about/                # /about — Project info
│   │   ├── docs/                 # /docs — Documentation browser
│   │   └── api/                  # API routes
│   │       ├── query/            # POST /api/query — Main chat endpoint
│   │       ├── health/           # GET /api/health — System health
│   │       ├── planner/          # POST /api/planner/assess
│   │       ├── legal/            # POST /api/legal/query
│   │       ├── floats/           # GET /api/floats
│   │       ├── profiles/         # GET /api/profiles
│   │       └── upload/           # POST /api/upload
│   │
│   ├── components/               # React components
│   │   ├── ChatPanel.tsx         # Main conversational interface
│   │   ├── ChatAppShell.tsx      # Chat layout shell
│   │   ├── VisualizationTabs.tsx # Tab switcher (Map/Plot/Table)
│   │   ├── visualizations/       # Data visualization panels
│   │   │   ├── MapPanel.tsx      # Leaflet map container & search bar
│   │   │   ├── LeafletMap.tsx    # Client-isolated Leaflet rendering & MapController
│   │   │   ├── PlotPanel.tsx     # Plotly depth profiles
│   │   │   ├── TablePanel.tsx    # Tabular data view
│   │   │   └── ProfileSummary.tsx
│   │   ├── layout/               # NavigationHeader, Footer, PageHeader
│   │   ├── landing/              # Hero, CapabilityStrip, CtaBand, etc.
│   │   ├── decor/                # BubbleBackground, WaveDivider
│   │   ├── planner/              # Coastal planner components
│   │   ├── legal/                # Legal agent components
│   │   └── dashboard/            # Dashboard components
│   │
│   ├── lib/                      # Shared utilities
│   │   ├── llm/                  # Gemini integration
│   │   ├── mcp/                  # MCP tool helpers
│   │   ├── planner/              # Planner prompt templates
│   │   ├── intentRouter.ts       # (Legacy) regex intent classifier
│   │   ├── geo.ts                # Haversine distance
│   │   ├── rateLimiter.ts        # IP-based rate limiting
│   │   └── csvExport.ts          # CSV export utility
│   │
│   ├── store/                    # Zustand state management
│   └── types/                    # TypeScript type definitions
│
├── e2e/                          # Playwright End-to-End browser user journeys
│   ├── home-to-explorer.spec.ts  # Landing hero navigation flow
│   └── chat-workflow.spec.ts     # Chat interaction & tab sync
│
├── playwright.config.ts          # Playwright test configuration
├── jest.config.cjs               # Jest test configuration
├── PROGRESS_REPORT.md            # Historical progress log
├── DESIGN_SYSTEM.md              # Design tokens & guidelines
└── README.md                     # Quick start & demo runbook
```

---

## 7. Testing Architecture & Quality Assurance

FloatChat implements the **Testing Pyramid** methodology ensuring rapid local feedback and high deployment confidence:

```
                  ▲
                 / \     [E2E / Playwright] (~10%)
                /   \    Headless Chromium user journeys (e2e/*.spec.ts)
               /-----\
              /       \  [Integration & Component] (~20%)
             /         \ Next.js route handlers & RTL component/a11y tests
            /-----------\
           /             \ [Unit / In-Memory] (~70%)
          /               \ chatStore, geodesic math, rate limiter, validators
         -------------------
```

### Test Hierarchy
1. **Unit Layer (`npm run test:unit`)**: Tests pure business logic without network or I/O overhead (`chatStore.ts`, `rateLimiter.ts`, `csvExport.ts`, `uploadValidator.ts`, `haversine.ts`, `intentRouter.ts`).
2. **Component Layer (`npm run test:component`)**: React Testing Library and accessibility tests ensuring ARIA live region support (`ToastProvider.tsx`), semantic table headers (`TablePanel.tsx`), IME composition safety, and DOMPurify XSS mitigation (`ChatPanel.tsx`).
3. **Integration Layer (`npm run test:integration`)**: Tests Next.js route handlers (`/api/query`, `/api/profiles`), LLM fallback synthesis, and server error scenarios.
4. **End-to-End Layer (`npm run test:e2e`)**: Playwright automation exercising critical user paths against a live Next.js runtime in headless Chromium.

### Modern Web Standards Compliance
- **CSS Scrollbars**: Modern `scrollbar-color` and `scrollbar-width` styling with legacy `@supports not (scrollbar-color: auto)` fallbacks.
- **Native Dark Theme**: `color-scheme: dark` explicitly declared to synchronize browser-native widgets.
- **IME Composition Guard**: Protection against premature Enter sends during multilingual character conversion candidates.
- **Sanitization**: In-memory HTML sanitization via DOMPurify before DOM injection.

