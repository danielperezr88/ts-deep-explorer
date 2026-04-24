# Backlog — ts-deep-explorer

> **Status**: active — drives GitHub issues
> Architecture: `05-architecture.md` | FOSS refs: `06-foss-references.md`

---

## Milestone 1: Foundation (Analysis Engine)

### ISSUE-01: Scaffold extension project [S]
**Labels**: `epic:scaffolding`, `good first issue`
Set up the VSCode extension project with:
- `package.json` with `contributes.commands`, `activationEvents`
- `tsconfig.json` + `tsconfig.webview.json`
- `esbuild.config.mjs` for extension bundling
- `.vscodeignore`
- Basic `src/extension.ts` with `activate()` / `deactivate()`
- "Hello World" command that shows a notification
- Verify F5 launches Extension Development Host
**Depends on**: nothing

### ISSUE-02: Directed graph data structure [S]
**Labels**: `epic:analysis`
Implement `src/graph/graph.ts`:
- Generic `DirectedGraph<T>` class with `addNode`, `addEdge`, `getNode`, `getDependenciesOf`, `getDependentsOf`, `getNodes`, `getEdges`
- Edge metadata support (type, symbols)
- `toJSON()` / `fromJSON()` serialization
- Unit tests with Vitest
**Reference**: Skott's `DiGraph` — see `06-foss-references.md`
**Depends on**: ISSUE-01

### ISSUE-03: TypeScript program creation [S]
**Labels**: `epic:analysis`
Implement workspace file discovery + TS program creation:
- Read `tsconfig.json` from workspace root
- Use `vscode.workspace.findFiles()` to collect `.ts`/`.tsx` files
- Create `ts.createProgram(files, compilerOptions)`
- Handle missing tsconfig gracefully (use defaults)
- Unit tests with mock file system
**Depends on**: ISSUE-01

### ISSUE-04: Import extraction [M]
**Labels**: `epic:analysis`
Implement `src/analysis/import-extractor.ts`:
- Walk `sourceFile.imports` for each source file
- Resolve module specifiers via `ts.resolveModuleName()`
- Classify: static, dynamic, type-only, re-export
- Handle path aliases from tsconfig `paths`
- Collect imported symbol names per edge
- Unit tests with fixture TS files
**Reference**: TypeScript-Graph + TS Compiler API — see `06-foss-references.md`
**Depends on**: ISSUE-03

### ISSUE-05: Analysis orchestrator [M]
**Labels**: `epic:analysis`
Implement `src/analysis/analyzer.ts`:
- `analyzeWorkspace()` — creates program, runs extractors, builds graph
- `analyzeFile()` — scoped analysis for a single file
- Coordinate import extraction + graph building
- Return `AnalysisResult` with nodes, edges, metadata
**Depends on**: ISSUE-02, ISSUE-04

### ISSUE-06: Cycle detection [S]
**Labels**: `epic:analysis`
Implement `src/analysis/cycle-detector.ts`:
- Tarjan's strongly connected components algorithm
- `detectCycles(graph): string[][]`
- Return full cycle paths
- Unit tests with known cyclic graphs
**Reference**: Skott's `GraphApi`
**Depends on**: ISSUE-02

### ISSUE-07: Module classification [S]
**Labels**: `epic:analysis`
Implement `src/analysis/classifier.ts`:
- Classify each node: entry, leaf, barrel, core, utility, test
- Rules based on in-degree, out-degree, re-export count, file patterns
- Unit tests with fixture graphs
**Depends on**: ISSUE-02

---

## Milestone 2: Documentation Extraction

### ISSUE-08: JSDoc/TSDoc extraction [M]
**Labels**: `epic:docs`
Implement `src/analysis/doc-extractor.ts`:
- Extract module-level JSDoc comments
- Extract per-export JSDoc: description, `@param`, `@returns`, `@deprecated`, `@example`
- Get export signatures via `checker.typeToString()`
- Get export kind (function, class, interface, type, const, enum)
- Detect `@internal`, `@experimental` tags
- Unit tests with documented fixture files
**Reference**: TS Compiler API — `symbol.getDocumentationComment(checker)`
**Depends on**: ISSUE-03

### ISSUE-09: Symbol usage tracking [M]
**Labels**: `epic:docs`
Track which exported symbols are consumed by which downstream modules:
- Walk imports to collect symbol references
- Build reverse map: `symbol → [consumer modules]`
- Include in `ExportedSymbol.usedBy` field
**Depends on**: ISSUE-04, ISSUE-08

---

## Milestone 3: Webview + Visualization

### ISSUE-10: Webview panel scaffold [M]
**Labels**: `epic:visualization`
Implement `src/webview/panel.ts`:
- Create webview panel with `vscode.window.createWebviewPanel()`
- HTML generation with CSP nonce
- Load bundled webview JS/CSS via `webview.asWebviewUri()`
- Singleton pattern (one panel at a time)
- `retainContextWhenHidden: true`
**Reference**: CodeVisualizer's `CodebaseFlowProvider`
**Depends on**: ISSUE-01

### ISSUE-11: Webview frontend scaffold [M]
**Labels**: `epic:visualization`
Set up `webview/` directory:
- `vite.config.ts` for browser-targeted build
- `index.html` shell
- `main.tsx` React entry
- `App.tsx` with React Flow placeholder
- Verify webview renders "Hello from React Flow"
**Depends on**: ISSUE-10

### ISSUE-12: Message protocol [S]
**Labels**: `epic:visualization`
Implement `shared/protocol.ts` + `src/webview/messaging.ts`:
- Define `HostToWebviewMessage` and `WebviewToHostMessage` types
- Typed wrappers around `postMessage` in both directions
- Message validation on receive
**Depends on**: ISSUE-10

### ISSUE-13: Dagre layout computation [S]
**Labels**: `epic:visualization`
Implement `src/graph/layout.ts`:
- Wrap `@dagrejs/dagre` to compute node positions
- Support `TB` and `LR` directions
- Configurable spacing
- Map positions back to node IDs
**Reference**: dagre README — ~30 lines
**Depends on**: ISSUE-02

### ISSUE-14: Graph rendering in React Flow [L]
**Labels**: `epic:visualization`
Implement `GraphCanvas.tsx` + `ModuleNode.tsx` + `DependencyEdge.tsx`:
- Receive graph data from extension host via `useExtensionHost` hook
- Create React Flow instance with custom node/edge types
- `ModuleNode` shows: module name (bold), relative path (muted), export count badge, classification color
- `DependencyEdge` shows: solid for static, dashed for type-only, bold for re-export
- `<MiniMap>`, `<Controls>`, `<Background>` components
- Dark/light theme via VSCode CSS variables
**Reference**: React Flow custom nodes — see `06-foss-references.md`
**Depends on**: ISSUE-11, ISSUE-12, ISSUE-13

### ISSUE-15: Documentation panel [M]
**Labels**: `epic:docs`
Implement `DocPanel.tsx`:
- Side panel showing when a node is clicked
- Module name, path, classification
- Full module JSDoc rendered as markdown
- Exported symbols table (name, kind, signature, doc summary)
- "Depends on" list (clickable)
- "Used by" list (clickable)
- Deprecation warnings
**Depends on**: ISSUE-14, ISSUE-08

### ISSUE-16: Search and filter [M]
**Labels**: `epic:visualization`
Implement `FilterPanel.tsx`:
- Search input: filter nodes by name or path
- Classification filter checkboxes
- Dim non-matching nodes, highlight matches
- Clear filter button
**Depends on**: ISSUE-14

---

## Milestone 4: VSCode Integration

### ISSUE-17: Source navigation [S]
**Labels**: `epic:integration`
Implement double-click → open source file:
- Webview sends `navigateTo` message on node double-click
- Extension host calls `vscode.workspace.openTextDocument()` + `showTextDocument()`
- If symbol specified, resolve to line number
**Depends on**: ISSUE-14

### ISSUE-18: File watcher + incremental updates [L]
**Labels**: `epic:integration`
Implement `src/watch/watcher.ts`:
- Listen to `vscode.workspace.onDidSaveTextDocument`
- Debounce 300ms
- Re-parse changed file + direct dependents
- Diff and patch graph
- Recompute layout for affected region
- Push delta to webview
**Reference**: Skott's incremental analysis + `@parcel/watcher`
**Depends on**: ISSUE-05, ISSUE-14

### ISSUE-19: Command palette commands [S]
**Labels**: `epic:integration`
Register all commands in `package.json` contributes:
- `tsDeepExplorer.openExplorer`
- `tsDeepExplorer.analyzeFile`
- `tsDeepExplorer.showCycles`
- `tsDeepExplorer.exportGraph`
Implement command handlers in `src/commands/`
**Depends on**: ISSUE-14

### ISSUE-20: File explorer context menu [S]
**Labels**: `epic:integration`
Add "Show in Dependency Graph" to file explorer context menu:
- `package.json` contributes `menus/explorer/context`
- Opens explorer panel centered on the selected file
**Depends on**: ISSUE-19

### ISSUE-21: Status bar indicator [S]
**Labels**: `epic:integration`
Show analysis status in status bar:
- "TS Deep: Scanning..." / "TS Deep: Ready (N modules)" / "TS Deep: N cycles"
- Click to open explorer
**Depends on**: ISSUE-05

### ISSUE-22: VSCode settings [S]
**Labels**: `epic:integration`
Add configuration via `package.json` contributes `configuration`:
- `tsDeepExplorer.exclude`: glob patterns (default: `["**/node_modules/**", "**/*.d.ts"]`)
- `tsDeepExplorer.layout`: default layout direction
- `tsDeepExplorer.autoRefresh`: enable/disable watch mode
**Depends on**: ISSUE-01

---

## Milestone 5: Collapsible Groups + Polish

### ISSUE-23: Collapsible directory groups [L]
**Labels**: `epic:visualization`
Implement `GroupNode.tsx`:
- Detect nodes in same directory
- Add "collapse directory" action on directory header
- Group node shows: directory name, module count, aggregate export count
- Expand restores individual nodes
- Layout recomputes on collapse/expand
**Depends on**: ISSUE-14

### ISSUE-24: Cycle highlighting [M]
**Labels**: `epic:visualization`
Visual cycle highlighting:
- "Show Cycles" toggle button in Controls
- All edges in cycles highlighted red
- Cycle path annotated with step numbers
- Cycle count badge in status bar
**Depends on**: ISSUE-06, ISSUE-14

### ISSUE-25: Export commands [M]
**Labels**: `epic:visualization`
Implement export functionality:
- PNG/SVG: React Flow `toSVG()` / canvas → save dialog
- Mermaid: walk graph → generate flowchart syntax → clipboard
- JSON: serialize graph → save dialog
**Reference**: Dependency Cruiser's reporters
**Depends on**: ISSUE-19

### ISSUE-26: Layout switching [M]
**Labels**: `epic:visualization`
Add layout algorithm selector:
- Hierarchical (dagre) — default
- Force-directed (d3-force via `@xyflow/react` built-in)
- Radial (custom or elkjs)
- Layout recomputes and animates transition
**Depends on**: ISSUE-13

---

## Dependency Graph (Issues)

```
Milestone 1: ISSUE-01 → ISSUE-02, ISSUE-03 → ISSUE-04 → ISSUE-05, ISSUE-06, ISSUE-07
                                      ↓
Milestone 2:                     ISSUE-08 → ISSUE-09

Milestone 3: ISSUE-10 → ISSUE-11 → ISSUE-12 → ISSUE-14 → ISSUE-15, ISSUE-16
                      ISSUE-13 ──────────────────↗

Milestone 4: ISSUE-14 → ISSUE-17, ISSUE-18, ISSUE-19 → ISSUE-20
             ISSUE-05 → ISSUE-18, ISSUE-21
             ISSUE-01 → ISSUE-22

Milestone 5: ISSUE-14 → ISSUE-23, ISSUE-24, ISSUE-26
             ISSUE-19 → ISSUE-25
```
