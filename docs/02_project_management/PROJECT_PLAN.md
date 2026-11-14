# FloatChat / OceanGPT — Detailed Project Plan

> Last updated: 2026-05-06  
> Branch: `antigravity-work`  
> Repo: https://github.com/Adarshpandey-007/FloatChat

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| `[ ]`  | Not started |
| `[/]`  | In progress |
| `[x]`  | Completed |
| `[!]`  | Blocked / needs input |

---

## Phase 1: Foundation & Infrastructure ✅

Everything needed to run the platform locally.

### 1.1 Next.js Frontend Setup
- [x] Initialize Next.js 14 project with App Router
- [x] Configure Tailwind CSS with ocean design tokens
- [x] Set up TypeScript strict mode
- [x] Configure path aliases (`@/`)
- [x] Set up ESLint & Jest testing

### 1.2 Design System
- [x] Define ocean color palette (`ocean-50` through `ocean-950`)
- [x] Define coral accent palette
- [x] Add gradient tokens (`floatchat-gradientFrom/To`)
- [x] Create animation keyframes (bubble, shimmer)
- [x] Document in `DESIGN_SYSTEM.md`

### 1.3 Core Layout
- [x] `NavigationHeader` — top nav with page links
- [x] `OceanFooter` — footer with branding
- [x] `PageHeader` — reusable page header component
- [x] Skip-to-content link for accessibility
- [x] Error boundaries (`error.tsx`, `global-error.tsx`, `not-found.tsx`)

---

## Phase 2: Landing & Static Pages ✅

### 2.1 Landing Page (`/`)
- [x] Hero section with gradient layers & bubble animation
- [x] Query input with seed routing to `/app`
- [x] CapabilityStrip — feature highlights
- [x] LiveStats — real-time platform stats
- [x] RoadmapTimeline — project roadmap
- [x] CtaBand — call to action

### 2.2 About Page (`/about`)
- [x] Project overview, team, and mission statement

### 2.3 Documentation Browser (`/docs`)
- [x] Dynamic markdown discovery from `docs/` folder
- [x] `[slug]` page for rendering any `.md` file

---

## Phase 3: Chat Explorer (`/app`) ✅ → [/] Upgrading

The core product. A split-panel interface with Chat + Visualization.

### 3.1 Chat Interface
- [x] `ChatPanel.tsx` — message input, history, markdown rendering
- [x] `ChatAppShell.tsx` — layout shell with split panels
- [x] Zustand `chatStore` — messages, active tab, focus state
- [x] Rate limiting (`rateLimiter.ts`)
- [x] Intent routing (`intentRouter.ts`) — regex-based (legacy)
- [x] **MCP-based routing** -- replace regex with MCP tool calls

### 3.2 Visualization Panels
- [x] `VisualizationTabs.tsx` — tab switcher (Map/Plot/Table)
- [x] `MapPanel.tsx` — Leaflet map with float markers
- [x] `PlotPanel.tsx` — Plotly depth profiles (temp/salinity vs pressure)
- [x] `TablePanel.tsx` — tabular data view
- [x] `ProfileSummary.tsx` — profile metadata card
- [ ] **Dynamic data from Argovis** — replace mock JSON with live API data

### 3.3 LLM Integration
- [x] Gemini SDK integration (`@google/generative-ai`)
- [x] `generateLLMResponse()` with tool-calling support
- [x] **MCP tool routing** -- Gemini decides which MCP tools to call
- [ ] **Streaming responses** — show partial LLM output as it arrives

---

## Phase 4: Python MCP Server (`backend/`) ✅ DONE

The agentic brain. Wraps external ocean APIs as MCP tools.

### 4.1 Server Setup
- [x] Initialize FastMCP server with SSE transport
- [x] Python virtual environment (`venv/`)
- [x] Dependencies installed (`mcp`, `chromadb`, `pandas`, etc.)
- [x] `system_health_check` tool (POC)
- [x] Server verified running on `http://127.0.0.1:8000`

### 4.2 MCP Tools — Ocean Data
- [x] **`get_ocean_profile`** — Query Argovis by float WMO ID
  - [x] Accept `wmo_id` parameter
  - [x] Send `GET /argo?platform={wmo_id}&data=temperature,salinity`
  - [x] Header: `x-argokey: {ARGOVIS_API_KEY}`
  - [x] Parse JSON response, extract temperature/salinity/pressure arrays
  - [x] Return structured data for chat and visualization

- [x] **`search_ocean_area`** — Query Argovis by bounding box
  - [x] Accept `lat_min`, `lat_max`, `lon_min`, `lon_max`
  - [x] Send `GET /argo?box=[[lon_min,lat_min],[lon_max,lat_max]]`
  - [x] Return list of floats with their latest readings

- [x] **`check_float_health`** — Query OceanOPS for float metadata
  - [x] Accept `wmo_id` parameter
  - [x] Send `GET https://www.ocean-ops.org/api/1/platforms/{wmo_id}`
  - [x] Parse deployment date, battery, sensor status, country
  - [x] Return human-readable health summary

- [x] **`search_erddap`** — Fallback bulk data query
  - [x] Accept `dataset_id`, time range, spatial bounds
  - [x] Construct ERDDAP Tabledap URL
  - [x] Return JSON or CSV data

### 4.3 MCP Tools — Supporting
- [x] `system_health_check` — Server status with Argovis/OceanOPS connectivity check
- [x] Tools auto-discovered by Next.js MCP Client

---

## Phase 5: Next.js ↔ MCP Integration ✅ DONE

### 5.1 Query Route Refactor (`/api/query`)
- [x] Install `@modelcontextprotocol/sdk`
- [x] Basic SSE transport connection to Python backend
- [x] Proof-of-concept tool call (`system_health_check`)
- [x] **Full agentic loop**: User query → Gemini → MCP tools → Gemini analysis → Response
- [x] MCP tool schemas auto-converted to Gemini function declarations
- [x] Graceful fallback when MCP server is offline

### 5.2 Frontend Updates
- [x] Update `ChatPanel` tool labels for new MCP tools
- [x] Update `MapPanel` to accept GeoJSON from Argovis responses
- [x] Update `PlotPanel` to render live Argovis temperature/salinity profiles
- [x] Update `TablePanel` with live CSV/ASCII export buttons
- [x] Add loading skeletons for MCP tool execution

---

## Phase 6: Specialized Agents (Existing)

### 6.1 Coastal Planner (`/planner`)
- [x] `PlannerChat.tsx` — conversational planning interface
- [x] `ProjectWizard.tsx` — project configuration wizard
- [x] `ImpactAssessment.tsx` — environmental impact display
- [x] `/api/planner/assess` — assessment API route
- [x] Geocoding integration (`lib/mcp/geocoding.ts`)

### 6.2 Maritime Legal Agent (`/legal`)
- [x] `JurisdictionSelector.tsx` — jurisdiction picker
- [x] `/api/legal/query` — legal query API route
- [x] `lib/mcp/legalTools.ts` — legal MCP tools
- [x] Law database seeding script (`scripts/ingest/seed_laws.py`)

### 6.3 Project Dashboard (`/dashboard`)
- [x] `StatCards.tsx` — project metrics
- [x] `RecentProjectsTable.tsx` — project list
- [x] `/api/dashboard/metrics` — metrics API route

---

## Phase 7: Admin & Operations ✅

### 7.1 Admin Dashboard (`/admin`)
- [x] `AdminStatCard.tsx` — health/metrics cards
- [x] Live health check from `/api/health`
- [x] Environment flags display
- [x] Float discovery stats
- [x] LLM integration status (hydration fix applied)

---

## Phase 8: Upload & Data Management ✅

### 8.1 Upload Page (`/upload`)
- [x] Drag & drop file upload interface
- [x] NetCDF → CSV conversion (`netcdfConverter.ts`)
- [x] Upload validation (`uploadValidator.ts`)
- [x] File format cards (supported types)
- [x] Upload progress UI

---

## Phase 9: Testing & Quality ✅

- [x] Jest configured with `ts-jest` and JSDOM
- [x] 42/42 tests passing across 12 suites
- [x] Test files: adminStatCard, adminPage, docsPresence, docsIndexPage, uploadValidator
- [x] ESLint configured (warnings only, no blockers)

---

## Phase 10: Polish & Deploy [ ]

### 10.1 Performance
- [ ] Add loading/skeleton states for all async panels
- [ ] Optimize Leaflet tile loading
- [ ] Bundle size analysis

### 10.2 Deployment
- [ ] Production build verification (`npm run build`)
- [ ] Environment variable documentation
- [ ] Startup script for both Next.js + Python MCP server

### 10.3 Documentation
- [x] `ARCHITECTURE.md` — system diagram & tech stack
- [x] `PROJECT_PLAN.md` — this file
- [x] `USER_FLOW.md` — UX user journeys
- [x] `API_INTEGRATION.md` — external API guide
- [x] `MCP_TOOLS.md` — MCP tool reference
- [x] `PROGRESS.md` — living progress tracker

---

## Project Statistics

| Metric | Value |
|--------|-------|
| **Total Pages** | 10 (`/`, `/app`, `/admin`, `/planner`, `/legal`, `/dashboard`, `/upload`, `/about`, `/docs`, `/docs/[slug]`) |
| **API Routes** | 8 (`query`, `health`, `floats`, `profiles`, `upload`, `planner/assess`, `legal/query`, `dashboard/metrics`) |
| **React Components** | 25+ |
| **MCP Tools (implemented)** | 5 (`get_ocean_profile`, `search_ocean_area`, `check_float_health`, `search_erddap`, `system_health_check`) |
| **External APIs** | 3 (Argovis, OceanOPS, ERDDAP) |
| **Test Suites** | 12 (42 tests) |
| **Lines of Code** | ~5,500+ (TypeScript/TSX) + ~350 (Python) |
