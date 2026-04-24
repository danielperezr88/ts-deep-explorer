# TS Deep Explorer — Agent Context Index

> Last updated: 2026-04-24
> Repository: https://github.com/danielperezr88/ts-deep-explorer

## Document Index

| # | File | Status | Purpose |
|---|---|---|---|
| 01 | [features.md](01-features.md) | **superseded** | Raw feature brainstorm. Consolidated into 02 — read only for historical context. |
| 02 | [functional-requirements.md](02-functional-requirements.md) | **active** | Refined requirements with acceptance criteria. Single source of truth for WHAT. |
| 03 | [processes.md](03-processes.md) | **active** | Key user workflows and system processes (analysis pipeline, incremental updates, interactions). |
| 04 | [future-features.md](04-future-features.md) | **active** | Post-v1 feature backlog. Informs architecture extensibility decisions. |
| 05 | [architecture.md](05-architecture.md) | **active** | Software architecture: modules, data model, project structure, build system, tech stack. |
| 06 | [foss-references.md](06-foss-references.md) | **active** | Maps requirements to specific FOSS code references (Skott, TypeScript-Graph, Dependency Cruiser, CodeVisualizer, React Flow). |
| 07 | [backlog.md](07-backlog.md) | **active** | Prioritized GitHub issues across 5 milestones with dependency graph. |

## Navigation Guide

**Quick onboarding** (read these three):
1. `02-functional-requirements.md` — what we're building
2. `05-architecture.md` — how it's structured
3. `07-backlog.md` — what to work on next

**Skip unless needed**:
- `01-features.md` — superseded by 02. Only useful if you want to understand the original brainstorm.
- `04-future-features.md` — only relevant when making architecture decisions that affect extensibility.

**Reference during implementation**:
- `06-foss-references.md` — look up specific FOSS code when implementing a module (maps our modules to reference implementations).
- `03-processes.md` — understand the data flow for analysis pipeline, incremental updates, and user interactions.

## Decision History

| Date | Decision | Rationale |
|---|---|---|
| 2026-04-24 | Use TS Compiler API directly (not VSCode's language service) | Full control, no dependency on internal extension APIs, works outside VSCode |
| 2026-04-24 | React Flow over Mermaid for visualization | Custom node components needed for inline docs; Mermaid is static SVG |
| 2026-04-24 | Dagre as default layout | Best for dependency graphs (hierarchical), simple API, synchronous |
| 2026-04-24 | Custom graph class (not digraph-js directly) | Need richer edge metadata and incremental patch operations |
| 2026-04-24 | esbuild + Vite dual build | esbuild for extension host (Node), Vite for webview (browser) |
| 2026-04-24 | postMessage protocol (not shared state) | Webview is sandboxed iframe; postMessage is the only communication channel |
