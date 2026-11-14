# FloatChat / OceanGPT — Progress Tracker

> This is a living document. Update this file as you complete tasks.  
> Branch: `antigravity-work` | Repo: https://github.com/Adarshpandey-007/FloatChat

---

## Current Sprint: SOA API Integration

**Goal:** Replace mock data with live Argovis/OceanOPS API calls via the Python MCP Server.

---

## Completed ✅

### Session 1: UI Foundation (Oct 2025)
- [x] Ocean design system (Tailwind tokens, palettes, gradients)
- [x] Landing page with Hero, CapabilityStrip, LiveStats, RoadmapTimeline
- [x] NavigationHeader, OceanFooter, PageHeader
- [x] BubbleBackground, WaveDivider decorative components
- [x] Explorer page (`/app`) with chat + visualization panels
- [x] Upload page (`/upload`) with drag-drop and NetCDF conversion
- [x] About page (`/about`)
- [x] Error boundaries (global, route-level, 404)

### Session 2: Bug Fixes & Testing (Oct 2025)
- [x] Fixed infinite render loop in BubbleBackground
- [x] Admin dashboard with AdminStatCard
- [x] Documentation browser (`/docs`)
- [x] Upload validation utility
- [x] Jest test suite (42/42 passing)
- [x] Build system stabilization

### Session 3: Presentation Stabilization (Apr 2026)
- [x] Map panel resilience (AbortController, error banner)
- [x] Table panel loading/empty/error states
- [x] Real profile fetch hardening (timeout, abort)
- [x] Plot panel stale-request prevention
- [x] Leaflet marker icon crash fix
- [x] README demo runbook

### Session 4: SIH 25040 Alignment (Apr 2026)
- [x] Gap analysis against SIH Problem Statement
- [x] Identified MCP, Vector DB, and RAG requirements
- [x] Fast-track plan created

### Session 5: Planner, Legal & Dashboard Agents (May 2026)
- [x] Coastal Planner (`/planner`) — ProjectWizard, PlannerChat, ImpactAssessment
- [x] Maritime Legal Agent (`/legal`) — JurisdictionSelector, legal query route
- [x] Project Dashboard (`/dashboard`) — StatCards, RecentProjectsTable
- [x] Geocoding integration
- [x] Legal tools & law database seeding
- [x] DB schema migrations (v0.6.0, v0.7.0)

### Session 6: MCP Backend & API Integration (May 2026)
- [x] Python MCP Server initialized (FastMCP + SSE)
- [x] Virtual environment with all dependencies
- [x] `system_health_check` MCP tool verified
- [x] Next.js MCP Client connected (SSE transport)
- [x] `/api/query` refactored to use MCP client
- [x] Admin dashboard hydration error fixed (Enabled/Disabled mismatch)
- [x] Argovis API key added to `.env`
- [x] Embedded ChromaDB tested with mock data

---

### Session 7: Agentic SOA & API Stabilization (May 2026)
- [x] `get_ocean_profile` — Argovis float profile queries implemented
- [x] `search_ocean_area` — Argovis bounding box search implemented
- [x] `check_float_health` — OceanOPS metadata queries implemented
- [x] `search_erddap` — ERDDAP fallback queries implemented
- [x] LLM tool selection and multi-tool chaining configured
- [x] Automatic API Key Rotation (5 Keys) to resolve Gemini Free-Tier 429 limits
- [x] MapPanel, PlotPanel, and TablePanel refactored to consume live Argovis data
- [x] Database dependency completely removed from frontend API routes
- [x] MCP `system_health_check` optimized to run instantly without blocking thread
- [x] Zod/SDK TS signature issues resolved (`v3Schema.safeParse` crash fixed)

---

## In Progress [/]


### Session 9: Leaflet Map Modularization & LLM Agent Resiliency (Nov 2026)
- [x] Modularized Leaflet rendering into isolated client component (`LeafletMap.tsx`)
- [x] Resolved React Hook order violation in `MapController` via unconditional `useMap()` call
- [x] Migrated primary LLM engine to Groq Cloud `openai/gpt-oss-120b` with `openai/gpt-oss-20b` fallback
- [x] Hardened tool calling: tool name sanitization & fuzzy-matching against registered FastMCP tools
- [x] Added automated tool-error fallback retry (switches model / answers directly without UI crash)
- [x] Implemented multi-turn post-tool synthesis pass for complete oceanographic intelligence
- [x] Live end-to-end verification with ARGO Float 4903629 and automated map centering

### Polish & Performance
- [ ] Loading skeletons for all async panels
- [ ] Streaming LLM responses
- [ ] Bundle size optimization

---

### Session 8: Modern Web Guidance & Testing Pyramid (Nov 2026)
- [x] Modern Web Guidance compliance audit (0 legacy findings across 33 guides)
- [x] Standard CSS scrollbars (`scrollbar-color`, `scrollbar-width: thin`) & `color-scheme: dark`
- [x] IME-safe chat composition submission (`isComposing` / `keyCode 229`)
- [x] Client-side DOMPurify markdown XSS sanitization
- [x] Accessible live region notifications (`role="region"` and `aria-live="polite"`)
- [x] Semantic `scope="col"` table headers and keyboard scroll regions
- [x] Passive scroll listener with `requestAnimationFrame` performance optimization
- [x] Testing Pyramid partitioned test scripts (`test:unit`, `test:component`, `test:integration`, `test:e2e`, `test:coverage`)
- [x] Added `chatStore.test.ts` (100% line coverage)
- [x] Added `csvExport.test.ts` & `rateLimiter.test.ts` unit tests
- [x] Added `chatPanel.test.tsx`, `toastProvider.test.tsx`, `tablePanel.test.tsx` component & accessibility tests
- [x] Configured Playwright E2E browser test runner (`playwright.config.ts`)
- [x] Authored and passed critical user journey browser tests (`home-to-explorer.spec.ts`, `chat-workflow.spec.ts`)
- [x] Resolved all TypeScript compilation errors (`tsc --noEmit` clean)
- [x] Resolved all ESLint syntax errors (`next lint` clean)
- [x] Production build fully verified (21/21 routes generated)

---

## Not Started [ ]

### Deployment & CI/CD
- [ ] Startup orchestrator script (concurrent Next.js + Python MCP server)
- [ ] GitHub Actions workflow executing `npm run test:unit`, `npm run test:component`, and `npm run test:e2e`

---

## Key Metrics

| Metric | Current Value |
|--------|---------------|
| Pages / Routes | 21 (10 app pages, 11 API endpoints) |
| Components | 25+ |
| MCP Tools | 5/5 implemented |
| Jest Tests | **70 passing (18 suites)** |
| E2E Tests | **2 passing (Playwright Chromium)** |
| Test Coverage | **76.7% lines / 80.7% functions** |
| Modern Web Guidance | **100% Compliant (0 findings)** |
| TypeScript Health | **0 errors (`tsc --noEmit`)** |
| ESLint Health | **0 errors (`next lint`)** |
| External APIs | 3 configured (Argovis, OceanOPS, ERDDAP) |
| Git Commits | ~30+ on `antigravity-work` |

---

## Known Issues

| Issue | Severity | Status |
|-------|----------|--------|
| Gemini API key limits (429/403) | Resolved | Fixed via Groq LPU migration (`openai/gpt-oss-120b`) |
| MapController React Hook Order | Resolved | Fixed via client isolation in `LeafletMap.tsx` |
| Groq 400 Tool Call Validation | Resolved | Fixed via tool name sanitization & fallback retry |
| Production build verification | Resolved | Verified (21/21 routes compiled cleanly) |
| ESLint unescaped entity errors | Resolved | Fixed via standard `&quot;` HTML entities |
