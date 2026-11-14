# FloatChat / OceanGPT — MCP Tools Reference

> Last updated: 2026-05-06

This document describes every MCP (Model Context Protocol) tool registered on the Python backend server. The LLM (Groq LPU Engine) autonomously decides which tool(s) to invoke based on the user's natural language query.

---

## Architecture

```
User Chat Message
     │
     ▼
  Groq LPU Engine (`openai/gpt-oss-120b`) (decides tool)
     │
     ▼
  MCP Client (Next.js) ──SSE──► MCP Server (Python)
                                     │
                                     ├─ get_ocean_profile()
                                     ├─ search_ocean_area()
                                     ├─ check_float_health()
                                     ├─ search_erddap()
                                     └─ system_health_check()
```

---

## Tool Catalog

### 1. `get_ocean_profile`

| Field | Value |
|-------|-------|
| **Description** | Fetch vertical ocean profiles (temperature, salinity, pressure) for a specific ARGO float |
| **Data Source** | Argovis API |
| **Trigger Phrases** | "Show me float 4901283", "Get the profile of float X", "Temperature data for float Y" |

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `wmo_id` | string | ✅ | WMO platform ID (e.g., "4901283") |
| `variables` | string | ❌ | Comma-separated list. Default: `"temperature,salinity"` |

**Returns:** JSON string containing profile data with pressure levels, temperature, and salinity readings.

**Example invocation by LLM:**
```json
{
  "name": "get_ocean_profile",
  "arguments": { "wmo_id": "4901283", "variables": "temperature,salinity" }
}
```

---

### 2. `search_ocean_area`

| Field | Value |
|-------|-------|
| **Description** | Search for ARGO float profiles within a geographic bounding box |
| **Data Source** | Argovis API |
| **Trigger Phrases** | "Show me floats near the Maldives", "Temperature data in the Indian Ocean", "What's the salinity near 73°E, 4°N?" |

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `lat_min` | float | ✅ | Southern latitude boundary |
| `lat_max` | float | ✅ | Northern latitude boundary |
| `lon_min` | float | ✅ | Western longitude boundary |
| `lon_max` | float | ✅ | Eastern longitude boundary |
| `variables` | string | ❌ | Default: `"temperature,salinity"` |

**Returns:** JSON array of profiles with coordinates and measurements.

---

### 3. `check_float_health`

| Field | Value |
|-------|-------|
| **Description** | Check the operational status, deployment info, and hardware health of an ARGO float |
| **Data Source** | OceanOPS API |
| **Trigger Phrases** | "Is float 4901283 still active?", "Who deployed this float?", "What's the battery status?" |

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `wmo_id` | string | ✅ | WMO platform ID (e.g., "4901283") |

**Returns:** JSON string with status, deployment date, battery level, sensor health, deploying country, and float model.

---

### 4. `search_erddap`

| Field | Value |
|-------|-------|
| **Description** | Fallback bulk data query using ERDDAP Tabledap when Argovis doesn't have the needed dataset |
| **Data Source** | ERDDAP (OSMC/NOAA) |
| **Trigger Phrases** | "Get bulk temperature data since January 2024", "Show me buoy data in the Bay of Bengal" |

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `dataset_id` | string | ❌ | Default: `"argo"` |
| `variables` | string | ✅ | Comma-separated column names |
| `time_min` | string | ❌ | ISO date string (e.g., "2024-01-01") |
| `lat_min` | float | ❌ | Southern boundary |
| `lat_max` | float | ❌ | Northern boundary |
| `lon_min` | float | ❌ | Western boundary |
| `lon_max` | float | ❌ | Eastern boundary |

**Returns:** JSON data from ERDDAP.

---

### 5. `system_health_check`

| Field | Value |
|-------|-------|
| **Description** | Check if the MCP server is operational |
| **Data Source** | Internal |
| **Trigger Phrases** | "Is the system working?", "Check server health" |

**Parameters:** None.

**Returns:** Status string: `"OceanGPT MCP Server is online and ready for operations."`

---

## How the LLM Decides

When Gemini receives a user query, it sees the tool catalog (names + descriptions + parameters). Based on the user's intent, it picks the right tool(s):

| User Query | Tool(s) Called |
|-----------|---------------|
| "Show me float 2900018" | `get_ocean_profile(wmo_id="2900018")` |
| "Is the water getting saltier near the Maldives?" | `search_ocean_area(lat_min=2, lat_max=8, lon_min=71, lon_max=75)` |
| "Is float 2900018 still active?" | `check_float_health(wmo_id="2900018")` |
| "Show me the temperature and status of float 4901283" | `get_ocean_profile(...)` + `check_float_health(...)` |
| "Get all temperature data from 2024 in the Bay of Bengal" | `search_erddap(...)` |

---

## Running the MCP Server

```bash
cd FloatChat
.\venv\Scripts\python backend\mcp_server.py
# Server starts on http://127.0.0.1:8000
# SSE endpoint: http://127.0.0.1:8000/sse
```
