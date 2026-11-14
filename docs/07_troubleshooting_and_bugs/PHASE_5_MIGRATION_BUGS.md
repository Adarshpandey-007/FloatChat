# Phase 5: Service-Oriented Architecture (SOA) Migration Bugs

This document serves as a post-mortem and troubleshooting guide for the complex bugs encountered and resolved during the Phase 5 migration from a legacy PostgreSQL monolithic architecture to an Agentic, MCP-driven Service-Oriented Architecture.

## 1. Gemini API Free-Tier Rate Limits (HTTP 429)

**Symptom:**
During complex conversational queries requiring multiple tool executions (e.g., searching an area, getting float profiles, extracting data), the frontend chat would frequently return `Error connecting to AI: 429 Too Many Requests`. 

**Root Cause:**
The Google AI Studio free tier limits requests to ~15-20 RPM. Multi-turn Agentic loops exhausted this limit extremely quickly.

**Resolution:**
Implemented a robust **Sequential API Key Rotation** mechanism in `/src/app/api/query/route.ts`. 
- Five distinct Gemini API keys were provisioned in `.env`.
- A global round-robin index (`globalThis.__geminiKeyIndex`) tracks the active key.
- The system locks onto one key until it throws a `429` error, at which point it automatically fails over to the next key and retries, virtually eliminating quota exhaustion.

## 2. Empty Visualization Panels (HTTP 500)

**Symptom:**
The Map, Plot, and Table tabs rendered as blank black rectangles. The Next.js terminal logged `500 Internal Server Error` when fetching `/api/floats`.

**Root Cause:**
Even though the application was migrated to use live Argovis data, the API routes (`/api/floats/route.ts` and `/api/profiles/route.ts`) still contained a legacy import: `import { query } from '@/lib/db'`. Because the local PostgreSQL instance was disabled, this import caused Next.js to crash at module load time while trying to initialize the dead database pool.

**Resolution:**
Removed all database-related imports from the frontend API routes. The routes now purely act as stateless proxies to the Argovis REST endpoints.

## 3. Argovis Payload Too Large (HTTP 413)

**Symptom:**
After fixing the database crash, the Map panel showed a red Leaflet error: `Map data could not be loaded`. The Next.js logs showed `Argovis returned 413`.

**Root Cause:**
The default bounding box configured for the Map's initial render (`[[60.0,0.0],[80.0,20.0]]`) covered the entire Indian Ocean and Arabian Sea. This area contained so many historical ARGO profiles that the resulting JSON payload exceeded the Argovis API's strict response size limits.

**Resolution:**
Reduced the default Map and Table bounding box to a much smaller 5x5 degree square (`[[70.0,10.0],[75.0,15.0]]`), allowing instantaneous initial page loads without overwhelming the external API.

## 4. MCP Zod Schema Validation Crash

**Symptom:**
The chat returned an error specifically mentioning the health check: `[MCP] Tool system_health_check failed: v3Schema.safeParse is not a function`.

**Root Cause:**
This was a subtle TypeScript SDK bug. When attempting to increase the MCP `callTool` timeout to wait for slow external APIs, the configuration `{ timeout: 120000 }` was accidentally passed as the *second* argument to the SDK's `callTool` method. In this version of `@modelcontextprotocol/sdk`, the second argument is designated for an optional Zod `resultSchema`. The SDK mistakenly treated the timeout object as a Zod schema and attempted to run `.safeParse()` on it, which immediately crashed. Additionally, missing explicit `zod` dependencies caused module resolution issues in Next.js server components.

**Resolution:**
1. Explicitly installed `zod@3.23.8` via npm to ensure Next.js resolves the correct version for the SDK.
2. Corrected the TypeScript signature in `/src/app/api/query/route.ts` to pass `undefined` as the schema argument, placing the timeout options object in the correct third position: `await mcpClient.callTool(..., undefined, { timeout: 120000 })`.
3. Ensured `arguments: call.args || {}` is always passed to prevent `undefined` crashes on parameter-less tools.

## 5. OceanOPS Sync Ping Timeouts (Error -32001)

**Symptom:**
When asking the AI to "Check system health", the request would hang for over 60 seconds and eventually fail with `MCP error -32001: Request timed out`.

**Root Cause:**
The `system_health_check` tool in the Python MCP server (`backend/mcp_server.py`) was performing synchronous HTTP `requests.get()` pings to the OceanOPS API. OceanOPS is notoriously slow and would frequently hang DNS resolution. Because FastMCP executes synchronous tools in the thread pool, this blocked the response loop and caused the Next.js MCP Client to hit its hardcoded 60-second SSE timeout.

**Resolution:**
Stripped all external API pings out of the `system_health_check` tool. The tool now strictly evaluates the health of the local MCP Server process itself and returns instantly in under 1ms, preventing any risk of blocking the main Agentic event loop.

---
**Conclusion:**
The Phase 5 SOA migration is now fully stable. The frontend visualization modules and the Next.js Agent loop successfully stream 100% live data directly from the Python MCP service without relying on local databases or freezing on external network hiccups.


## 6. React Hook Order Violation in MapController

**Symptom:**
In the browser console, React threw a high-priority warning:
`Warning: React has detected a change in the order of Hooks called by MapController. Previous render: 9. useEffect, Next render: 9. useContext`.

**Root Cause:**
`MapController` was attempting to dynamically load `react-leaflet` inside a `useEffect` and conditionally invoked `const map = useMap?.()`. On initial render, `useMap` was null (0 hooks executed). Once imported, `useMap()` ran, invoking React-Leaflet's internal `useContext(MapContext)`. Introducing a hook conditionally on re-render directly violates React's Rules of Hooks.

**Resolution:**
Architecturally separated the Leaflet rendering tree into an isolated client-only component: `src/components/visualizations/LeafletMap.tsx`. Inside `LeafletMap.tsx`, `import { useMap } from 'react-leaflet'` is static, and `const map = useMap()` is executed unconditionally on every render. `MapPanel.tsx` loads `LeafletMap` using Next.js `dynamic(() => import('./LeafletMap'), { ssr: false })` with a loading skeleton.

## 7. Groq Tool-Use Validation Failures & Malformed Function Names

**Symptom:**
Submitting queries like `"nearest float 12N 70W"` caused the chat interface to display an error bubble:
`Error connecting to AI: 400 tool call validation failed: attempted to call tool 'search_o]["area"' which was not in request.tools`.

**Root Cause:**
The `qwen/qwen3.8-27b` model on Groq emitted unparsed XML-style tool tokens (`<tool_call><function=search_o...`) that Groq's tool validation pipeline failed to parse cleanly, corrupting the tool name into `search_o]["area"` or `search_o forma`. Furthermore, `/api/query/route.ts` forwarded the raw 400 validation error to the client without attempting fallback.

**Resolution:**
1. Upgraded the default LLM engine to `openai/gpt-oss-120b` with `openai/gpt-oss-20b` fallback, which strictly follows the standard OpenAI function-calling schema on Groq.
2. Added defensive tool name sanitization and fuzzy matching against registered FastMCP tools before execution.
3. Added try-catch fallback retry loops: if tool calling fails with a 400 error, the route automatically retries with the fallback model or performs direct domain synthesis.
4. Added a post-tool execution synthesis pass so multi-turn tool loops always culminate in structured findings, impacts, and recommendations.
