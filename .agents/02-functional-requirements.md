# Functional Requirements — ts-deep-explorer

> **Status**: active — derived from `01-features.md`
> References: architecture in `05-architecture.md`, FOSS code in `06-foss-references.md`

---

## FR-ANALYSIS — Dependency Extraction

### FR-ANALYSIS-01: Static import resolution
**Given** a TypeScript workspace with `tsconfig.json`, **when** the analyzer runs, **then** it creates a `ts.Program` and extracts all static imports (`import { x } from './y'`, `import './y'`) from every source file, resolving module specifiers to absolute file paths using `ts.resolveModuleName()`.

**Acceptance**: Import from `./utils/helper` in `src/index.ts` produces a directed edge `src/index.ts → src/utils/helper.ts` in the graph.

### FR-ANALYSIS-02: Dynamic import and require detection
**Given** source files using `import('...')` or `require('...')`, **when** analyzed, **then** these appear as edges with a `dynamic: true` flag.

**Acceptance**: `const mod = await import('./heavy')` creates an edge with `{ type: 'dynamic' }`.

### FR-ANALYSIS-03: Path alias resolution
**Given** `tsconfig.json` with `"paths": { "@/*": ["./src/*"] }`, **when** resolving `import { x } from '@/core/engine'`, **then** the edge points to `src/core/engine.ts`.

**Acceptance**: Path aliases resolve identically to relative imports.

### FR-ANALYSIS-04: Re-export chain tracking
**Given** a barrel file with `export * from './module'`, **when** analyzed, **then** the graph shows a `re-export` edge from the barrel to the module, and downstream consumers of the barrel inherit transitive dependencies.

**Acceptance**: Barrel `index.ts` → `module.ts` edge labeled `re-export`.

### FR-ANALYSIS-05: Type-only import classification
**Given** `import type { Config } from './types'`, **when** analyzed, **then** the edge is marked `{ typeOnly: true }` to distinguish from runtime dependencies.

**Acceptance**: Type-only edges rendered with dashed lines in the graph.

### FR-ANALYSIS-06: Circular dependency detection
**Given** modules A → B → C → A, **when** analysis completes, **then** the system reports the cycle `[A, B, C, A]` and marks all participating edges.

**Acceptance**: Status bar shows cycle count; cycles highlighted on demand.

### FR-ANALYSIS-07: Module classification
**Given** the dependency graph, **when** analysis completes, **then** each module is classified as one of: `entry` (no incoming edges from project files), `leaf` (no outgoing edges), `barrel` (>N re-exports), `core` (high in-degree + out-degree), `utility` (leaf with low complexity), `test` (matched by glob pattern).

**Acceptance**: Nodes colored by classification in the graph.

### FR-ANALYSIS-08: Exported symbol extraction
**Given** a module, **when** analyzed, **then** all exported symbols are extracted: name, kind (function/class/interface/type/const), and JSDoc summary. Each symbol tracks which downstream modules consume it.

**Acceptance**: Documentation panel shows "Exported symbols: `parse()` (function) — used by 3 modules".

---

## FR-GRAPH — Graph Data Model

### FR-GRAPH-01: Directed graph with metadata
**Given** analysis results, **then** the graph is a directed graph where each node has: `{ id: string, filePath: string, metadata: ModuleMetadata }` and each edge has: `{ source: string, target: string, type: ImportType, symbols: string[] }`.

**Acceptance**: Graph serializes to JSON and round-trips without data loss.

### FR-GRAPH-02: Graph queries
**Given** a populated graph, **then** the system supports: `getDependenciesOf(nodeId)`, `getDependentsOf(nodeId)`, `getCycles()`, `getOrphans()`, `getSubgraph(nodeId, depth)`, `getShortestPath(from, to)`.

**Acceptance**: Each query returns correct results in O(V+E) or better.

### FR-GRAPH-03: Incremental graph update
**Given** a file change event, **when** the watcher fires, **then** only the changed file and its direct dependents are re-analyzed. The graph is patched with the delta.

**Acceptance**: Re-analysis of a single-file change completes in <200ms for a 200-file project.

---

## FR-VISUAL — Rendering and Interaction

### FR-VISUAL-01: Interactive graph canvas
**Given** a graph with >0 nodes, **then** React Flow renders an interactive canvas with: zoom (scroll), pan (drag background), drag nodes, select nodes/edges, fit-to-view button, minimap.

**Acceptance**: Graph renders and is interactive within 2 seconds for a 200-node project.

### FR-VISUAL-02: Custom module nodes
**Given** a graph node, **then** the rendered component shows: module name (bold), relative file path (muted), export count badge, classification icon, and a truncated JSDoc summary (first line).

**Acceptance**: Nodes are readable at default zoom without hovering.

### FR-VISUAL-03: Collapsible directory groups
**Given** multiple nodes in the same directory, **when** the user clicks "collapse" on the directory header, **then** all nodes in that directory merge into a single group node showing aggregate stats (module count, total exports). Expanding restores individual nodes.

**Acceptance**: Collapsing `src/utils/` (10 files) into one node reduces visual clutter.

### FR-VISUAL-04: Search and filter
**Given** the graph, **when** the user types in the search box, **then** matching nodes are highlighted and non-matching nodes are dimmed. Filters available: by classification, by path pattern, by import type.

**Acceptance**: Typing "engine" highlights only nodes matching `*engine*`.

### FR-VISUAL-05: Cycle highlighting
**Given** detected cycles, **when** the user activates "Show Cycles", **then** all edges participating in cycles are highlighted in red, and the cycle path is annotated.

**Acceptance**: Cycles visually distinct from normal edges.

### FR-VISUAL-06: Layout switching
**Given** the graph, **then** the user can switch between: hierarchical (dagre — default), force-directed (d3-force), and radial layouts. Layout recomputes in <500ms.

**Acceptance**: Switching layout rearranges nodes without losing the current view focus.

---

## FR-DOCS — Documentation Extraction and Display

### FR-DOCS-01: JSDoc/TSDoc extraction
**Given** a TypeScript module with JSDoc comments, **when** analyzed, **then** the system extracts: module-level doc, per-export JSDoc (description, `@param`, `@returns`, `@deprecated`, `@example`, `@see`), and `@internal`/`@experimental` tags.

**Acceptance**: `/** Calculates foo */ export function calcFoo()` → node shows "Calculates foo".

### FR-DOCS-02: Documentation panel
**Given** a selected node, **when** the user clicks it, **then** a side panel shows: full module documentation, list of all exports with their signatures and JSDoc, "used by" list, "depends on" list, and deprecation notices.

**Acceptance**: Panel renders markdown including code blocks and links.

### FR-DOCS-03: Inline deprecation indicators
**Given** an export marked `@deprecated`, **then** the node shows a strikethrough or warning icon, and the documentation panel shows the deprecation message.

**Acceptance**: Deprecated modules visually distinct at a glance.

---

## FR-INTEGRATION — VSCode Integration

### FR-INTEGRATION-01: Command palette
**Given** the extension is installed, **then** commands are available: `TS Deep Explorer: Open Explorer`, `TS Deep Explorer: Analyze Current File`, `TS Deep Explorer: Show Circular Dependencies`, `TS Deep Explorer: Export Graph`.

**Acceptance**: Typing "TS Deep" in the command palette shows all commands.

### FR-INTEGRATION-02: Source navigation
**Given** a node in the graph, **when** double-clicked, **then** VSCode opens the corresponding file and scrolls to the top of the module (or to the clicked symbol if the node was expanded to show specific exports).

**Acceptance**: Double-click opens the file in the editor.

### FR-INTEGRATION-03: File explorer context menu
**Given** the user right-clicks a file in the VSCode explorer, **when** the context menu appears, **then** "Show in Dependency Graph" is available. Selecting it opens the explorer with that file centered.

**Acceptance**: Context menu item appears for `.ts`/`.tsx` files.

### FR-INTEGRATION-04: File watcher
**Given** the explorer panel is open, **when** the user saves a file, **then** the graph updates within 2 seconds showing the new dependency state.

**Acceptance**: Adding `import { x } from './new'` and saving updates the graph.

### FR-INTEGRATION-05: Configuration
**Given** VSCode settings, **then** the user can configure: `tsDeepExplorer.exclude` (glob patterns to exclude), `tsDeepExplorer.maxDepth` (analysis depth limit), `tsDeepExplorer.layout` (default layout algorithm), `tsDeepExplorer.autoRefresh` (enable/disable watch mode).

**Acceptance**: Settings take effect on next analysis.

---

## FR-PERF — Performance

### FR-PERF-01: Analysis speed
**Given** a project with 200 TypeScript files, **then** full analysis completes in <3 seconds.

### FR-PERF-02: Incremental update speed
**Given** a single file change, **then** incremental re-analysis and graph patch completes in <200ms.

### FR-PERF-03: Rendering performance
**Given** a graph with 200 nodes and 400 edges, **then** React Flow renders the initial frame in <2 seconds, and interactions (zoom, pan, select) respond in <16ms.

### FR-PERF-04: Memory footprint
**Given** a 500-file project, **then** the extension host process uses <150MB RSS, and the webview uses <100MB.
