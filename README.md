# FloatChat & OceanGPT 🌊
> **Multi-Agent Conversational Ocean Data Explorer, Spatial Decision-Support & Compliance Platform**

FloatChat (co-developed as OceanGPT) is a production-grade, state-of-the-art Multi-Agent Conversational Ocean Data platform. Built on a modern **Next.js 14 App Router** frontend and a modular **Python GenAI Backend**, it utilizes the **Model Context Protocol (MCP)**, **ChromaDB Vector Store**, **LangChain**, and **Google Gemini LLM** to ingest, process, query, and visualize real-time oceanographic observations (ARGO float profiles, spatial coordinate queries, and maritime legal databases).

Designed as an enterprise-grade Proof of Concept (PoC) for the Smart India Hackathon (SIH) Problem Statement 25040, this project demonstrates a highly resilient, tool-calling agent architecture with advanced data visualizations (Leaflet Maps, Plotly Depth Plots, and Tabulated Metrics) and domain-specific agent portals.

---

## 🏗 System Architecture & Flow

```
                      ┌──────────────────────────────────────┐
                      │             User Interface           │
                      │  Next.js 14 App Router + TailwindCSS  │
                      └──────────┬──────────────────┬────────┘
                                 │                  │
                         Agent Portals      Workspace Visualization
                        (Planner/Legal)    (Leaflet Map, Plotly, Table)
                                 │                  │
                      ┌──────────▼──────────────────▼────────┐
                      │           Next.js API Routes         │
                      │ (Intent Routing, Sequential API Key) │
                      └──────────┬──────────────────▲────────┘
                                 │                  │
                           SSE Transport       SSE Responses
                                 │                  │
     ┌───────────────────────────▼──────────────────┴──────────────────────────┐
     │                      Python MCP Server (FastMCP)                         │
     │  - Gemini LLM Planner                - tool_calling Chaining             │
     │  - system_health_check()             - search_ocean_area()               │
     │  - check_float_health()              - get_ocean_profile()               │
     └──────┬───────────────────────┬───────────────────────┬─────────────────┘
            │                       │                       │
     ┌──────▼──────┐         ┌──────▼──────┐         ┌──────▼──────┐
     │ Argovis API │         │ OceanOPS API│         │ ERDDAP NOAA │
     │  (Profiles) │         │   (Health)  │         │   (Buoys)   │
     └─────────────┘         └─────────────┘         └─────────────┘
                                    ▲
                                    │ (Metadata Indexing)
      ┌─────────────────────────────┴─────────────────────────────┐
      │               Python Offline Ingestion Pipeline           │
      │  - NetCDF parsing via netCDF4                             │
      │  - Vector search indexing in ChromaDB (argo_metadata)     │
      │  - Relational mapping to PostgreSQL / PostGIS Spatial DB  │
      └───────────────────────────────────────────────────────────┘
```

---

## 🔌 Model Context Protocol (MCP) Server & Tool Catalog
The Python backend implements a **Model Context Protocol (SSE-based)** server using `mcp.server.fastmcp`. This exposes raw API resources as callable tools directly to the Gemini LLM. The agent parses natural language, plans tool execution, and returns structured responses.

### Active Tools Reference
1. **`get_ocean_profile`**
   - **Description:** Fetch vertical ocean profiles (temperature, salinity, pressure) for a specific ARGO float by WMO ID.
   - **Source:** Argovis API.
   - **Parameters:** `wmo_id` (string, required), `variables` (string, default: "temperature,salinity").
2. **`search_ocean_area`**
   - **Description:** Search for ARGO float profiles within a bounding box (lat/lon). Used for region queries (e.g., "Bay of Bengal").
   - **Source:** Argovis API.
   - **Parameters:** `lat_min`, `lat_max`, `lon_min`, `lon_max` (floats, required).
3. **`check_float_health`**
   - **Description:** Retrieve hardware status, deployment date, and sensor health for a specific float.
   - **Source:** OceanOPS API.
   - **Parameters:** `wmo_id` (string, required).
4. **`search_erddap`**
   - **Description:** Fallback query to NOAA ERDDAP Tabledap for bulk ocean observations.
   - **Source:** NOAA ERDDAP.
   - **Parameters:** `variables`, `time_min`, `lat_min`, `lat_max`, `lon_min`, `lon_max`.
5. **`system_health_check`**
   - **Description:** Instantly verify if the Python SSE MCP server and its environment variables are online.

---

## 💾 Ingestion & Data Management (ChromaDB + PostGIS)
To handle binary ocean data files (.nc), the project implements a modular ingestion pipeline:

* **NetCDF Parsing:** Extracts variable arrays (`PRES`, `TEMP`, `PSAL`) and platform attributes using Python `netCDF4`, filtering out masked/invalid coordinates.
* **Vector Indexing (ChromaDB):** Generates metadata-rich documents and indexes them in an embedded ChromaDB collection (`argo_metadata`) located at `backend/chroma_data` using cosine similarity search.
* **PostGIS Storage:** Maps parsed arrays to a relational schema in PostgreSQL containing spatial tables and indexes:
  - `floats(id, wmo_id, launch_date, geom POINT, metadata_json)`
  - `profiles(id, float_id, cycle_number, timestamp, location_geom)`
  - `measurements(id, profile_id, depth, temperature, salinity)`
  *Indices include `GIST` on geometry fields and B-Trees on timestamps to power spatial searches.*

---

## 🤖 AI Specialist Agent Portals

### 1. Main Conversational Explorer (`/app`)
A unified dashboard combining:
* **Interactive Map:** Powered by `react-leaflet`, centering dynamically based on coordinate extractions (e.g. "map 12.5N 80.2E") and displaying active ARGO profiles.
* **Vertical Plot:** Powered by `react-plotly.js`, rendering temperature & salinity curves against pressure on an inverted Y-axis (replicating oceanographic standards).
* **Profile Table:** Shows profile summaries, mean stats, and Quality Control (QC) verification flags.

### 2. Coastal Planner Agent (`/planner`)
Assists maritime project developers with environmental and logistical planning:
* **`ProjectWizard`:** Multi-step wizard capturing coordinates, project type, and scale.
* **`PlannerChat`:** Interactive agent roleplaying as a "Nature Advocate" to critique proposal impacts.
* **`ImpactAssessment`:** Automatically generates structured PDF/text reports evaluating marine effects.

### 3. Maritime Legal Agent (`/legal`)
A specialized regulatory compliance expert:
* **`JurisdictionSelector`:** Swaps legal contexts dynamically (e.g., Exclusive Economic Zone, territorial waters).
* **Legal Database Cross-Reference:** Integrates a local mock/seeding law database to evaluate marine compliance, CRZ (Coastal Regulation Zone) violations, and international treaties.

---

## 🔑 LLMOps, Resiliency & Controls
* **Sequential API Key Rotation:** In Next.js, API routes utilize a rotating system of 5 Gemini API keys. If one key encounters a `429 Too Many Requests` or `403 Forbidden` error, the system automatically rotates to the next key, ensuring persistent live execution during demos.
* **Request Lifecycle Management:** Uses `AbortController` in React hooks to clean up pending network queries on visual tab switches, preventing stale state updates.
* **Error Boundaries:** Route-level boundaries (`error.tsx`), global boundaries (`global-error.tsx`), and a custom map data error banner intercept failures gracefully.

---

## 🚀 Setup & Execution Guide

### Prerequisites
* **Node.js** 18+ (verified)
* **Python** 3.10+ (verified)
* **Docker** (optional, for PostGIS database container)

### 1. Backend MCP Server Setup
1. Open a terminal in the root directory:
   ```bash
   cd backend
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set environment variables in `backend/.env`:
   ```env
   ARGOVIS_API_KEY=your_argovis_token_here
   ```
4. Run the Python MCP Server:
   ```bash
   python mcp_server.py
   ```
   *The server starts on standard input/output streams or HTTP SSE transports.*

### 2. Frontend Next.js Setup
1. Open a new terminal in the root directory:
   ```bash
   npm install
   ```
2. Create your `.env.local` file:
   ```env
   # API keys for rotation (comma-separated)
   GEMINI_API_KEY=key_1,key_2,key_3,key_4,key_5
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Navigate to `http://localhost:3000` in your web browser.

---

## 🧪 Testing & Verification
The codebase features comprehensive unit and integration test coverage using Jest and React Testing Library.

Run the test suite:
```bash
npm test
```
*All 42 tests in 12 test suites are verified to pass successfully.* Tests cover:
* `adminStatCard.test.tsx` (Admin panel metrics visualizer)
* `adminPage.test.tsx` (Dashboard loading and data hydration)
* `docsIndexPage.test.tsx` & `docsPresence.test.ts` (Markdown document loaders)
* `uploadValidator.test.ts` (NetCDF CSV drag-and-drop validation rules)

---

## 🎤 Presentation Runbook
Use this 10-minute flow to demonstrate the platform:

1. **Introduction (1 min):** Showcase the landing page (`http://localhost:3000`), explaining the dark glassmorphic ocean theme, custom Tailwind tokens, and accessibility enhancements (skip links, reduced motion detection).
2. **Specialist Agents (3 mins):**
   - Go to `/legal` and select a jurisdiction. Ask: *"Can I build a port at 18.9N 72.8E?"*. Point out how it simulates consulting legal databases and lists tool actions inline.
   - Go to `/planner`, fill out the `ProjectWizard`, and chat with the Nature Advocate about environmental impacts.
3. **Conversational Explorer (4 mins):**
   - Go to `/app` (Explorer).
   - Enter a map-intent query: *"nearest float at 12N 70W"* or *"closest float 10.5N 62.3W"*. Show how the map centers on the selected float and updates zoom levels.
   - Enter a plot-intent query: *"plot temperature and salinity profile"*. Switch to the Plot tab and explain the inverted depth axes.
   - Show the Table tab to review profile rows, average variables, and QC flags.
4. **Admin Dashboard (2 mins):**
   - Navigate to `/admin`.
   - Show the system health cards, showing that the Next.js Client is connected to the Python FastMCP server over SSE.

---

## 🤝 Project Credits & Attributions
* **Team:** Adarsh Pandey / OceanGPT
* **Problem Statement:** SIH Problem Statement 25040 (Conversational Ocean Data Explorer)
* **APIs & Data:** Argovis API, OceanOPS Program, and NOAA ERDDAP
