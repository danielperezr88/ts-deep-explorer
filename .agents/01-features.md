# Features — ts-deep-explorer

> **Status**: consolidated into `02-functional-requirements.md`
> This file is preserved as historical context for the feature brainstorming phase.

---

## Graph Analysis

- **FA-01** — Extract static imports (`import ... from '...'`) from TypeScript source files using the TS Compiler API
- **FA-02** — Extract dynamic imports (`import('...')`) and `require()` calls
- **FA-03** — Resolve TypeScript path aliases (`@/*` → `./src/*`) via `tsconfig.json` paths
- **FA-04** — Detect re-export chains (`export * from '...'`, `export { x } from '...'`)
- **FA-05** — Distinguish type-only imports (`import type { ... }`) from value imports
- **FA-06** — Identify barrel files (index.ts files that re-export from many modules)
- **FA-07** — Detect circular dependencies and report the cycle path
- **FA-08** — Compute dependency depth (distance from entry points / leaves)
- **FA-09** — Classify modules by role: entry, core, utility, config, test, barrel
- **FA-10** — Analyze workspace or targeted subdirectory (user chooses scope)
- **FA-11** — Extract exported symbols (functions, classes, interfaces, types, constants) per module
- **FA-12** — Track which exported symbols are actually consumed by downstream modules

## Visualization

- **FV-01** — Render interactive directed graph with zoom, pan, and drag
- **FV-02** — Custom node components showing module name, file path, and export count
- **FV-03** — Collapsible directory groups (collapse/expand entire folders)
- **FV-04** — Minimap for orientation in large graphs
- **FV-05** — Search and filter nodes by name, path, or role
- **FV-06** — Color coding by module role (entry=green, core=blue, utility=gray, test=orange, barrel=purple)
- **FV-07** — Highlight circular dependency cycles on demand
- **FV-08** — Edge labels showing import type (value, type-only, re-export)
- **FV-09** — Adjustable layout algorithms (hierarchical dagre, force-directed, radial)
- **FV-10** — Node size proportional to module complexity (line count or export count)
- **FV-11** — Fit-to-view and reset-view controls
- **FV-12** — Dark/light theme following VSCode settings

## Documentation Overlay

- **FD-01** — Extract JSDoc/TSDoc comments from modules, classes, functions, interfaces
- **FD-02** — Display documentation summary inline in graph nodes
- **FD-03** — Expandable documentation panel when clicking a node (full JSDoc, parameters, return types)
- **FD-04** — Render markdown within documentation panels (links, code blocks, lists)
- **FD-05** — Show export signatures (function signatures, type definitions) in node detail
- **FD-06** — Surface `@deprecated`, `@internal`, `@experimental` tags visually
- **FD-07** — Show "used by" / "depends on" lists in documentation panel with counts

## Workspace Integration

- **FW-01** — File watcher that triggers incremental re-analysis on save
- **FW-02** — Click node to navigate to source file (openDocument + revealRange)
- **FW-03** — Command palette: "Open Dependency Explorer", "Analyze Current File", "Show Circular Dependencies"
- **FW-04** — Status bar indicator showing analysis status (scanning / ready / error count)
- **FW-05** — Context menu in file explorer: "Show in Dependency Graph"
- **FW-06** — Sidebar tree view showing module hierarchy alongside the graph
- **FW-07** — Configuration via VSCode settings (analysis scope, excluded paths, layout preference)

## Export

- **FE-01** — Export graph as PNG/SVG image
- **FE-02** — Generate Mermaid diagram from the dependency graph
- **FE-03** — Export raw graph data as JSON (nodes, edges, metadata)
- **FE-04** — Copy individual module's dependency subtree to clipboard
