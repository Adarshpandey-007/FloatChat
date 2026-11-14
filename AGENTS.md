# Agent Guidelines for FloatChat (OceanGPT)

This project's Baseline target is Baseline 2024.

## Project Overview
FloatChat (OceanGPT) is an Autonomous Multi-Agent Ocean Intelligence & Spatial Decision-Support System built with Next.js 14 App Router, TypeScript, Tailwind CSS, Leaflet, Plotly.js, and an asynchronous Python Model Context Protocol (MCP) server.

## Modern Web Guidance & Standards
When adding or updating UI, layout, animations, or client-side logic in FloatChat, follow the **Modern Web Guidance** standards:
1. **CSS Scrollbars:** Use standard `scrollbar-color` and `scrollbar-width` properties. Wrap any legacy WebKit pseudo-elements in `@supports not (scrollbar-color: auto)`.
2. **Color Schemes:** Maintain `color-scheme: dark;` on `html, body` so browser-native form controls, pickers, and scrollbars render in dark mode.
3. **IME Safety:** Whenever handling `keydown` for Enter submission in inputs or textareas, always guard against IME character conversion:
   `if (e.nativeEvent.isComposing || e.keyCode === 229) return;`
4. **HTML Sanitization:** Never inject raw HTML strings into `dangerouslySetInnerHTML`. Always sanitize user-facing or LLM-generated markdown HTML using DOMPurify (`typeof window !== 'undefined' ? DOMPurify.sanitize(rawHtml) : rawHtml`).
5. **Accessibility (WCAG 2.1 AA):**
   - Tables must include `scope="col"` on column headers and accessible scrolling regions (`tabIndex={0}` and `role="region"` with `aria-label`).
   - Notifications and toast containers must provide ARIA live regions (`role="region" aria-label="Notifications" aria-live="polite"`) and `role="status"` on toast elements.
6. **Scroll Listeners:** Avoid unthrottled main-thread `window.addEventListener('scroll')` handlers. Use passive listeners with `requestAnimationFrame` or `IntersectionObserver`.

## Testing Pyramid Hierarchy
FloatChat adheres strictly to the **Testing Pyramid**:
- **Unit Tests (`npm run test:unit`)**: Fast in-memory algorithmic tests for math (`haversine`), rate limiting, validators, CSV exporters, and Zustand store actions (`chatStore`).
- **Component Tests (`npm run test:component`)**: React Testing Library component and accessibility tests.
- **Integration Tests (`npm run test:integration`)**: Next.js API route handlers (`/api/query`, `/api/profiles`, etc.).
- **End-to-End Tests (`npm run test:e2e`)**: Playwright browser automation specs in `e2e/*.spec.ts`.
- **Full Coverage Report (`npm run test:coverage`)**: Jest coverage enforcement.



## Architecture & Tool Calling Rules
7. **Leaflet and Dynamic Client Isolation:** Never import or invoke `useMap` conditionally inside `useEffect` or dynamically inside a component. Always isolate Leaflet rendering into dedicated client components (`LeafletMap.tsx`) and load them with Next.js dynamic import (`{ ssr: false }`). In `MapController`, always invoke `useMap()` unconditionally at the top level.
8. **LLM Tool Calling Resilience:** Never expose raw 400 tool-use validation errors to users. Always validate and sanitize function names against registered MCP tools, provide fallback retries (e.g. `openai/gpt-oss-120b` -> `openai/gpt-oss-20b`), and ensure a final synthesis turn compiles tool outputs into structured markdown.
