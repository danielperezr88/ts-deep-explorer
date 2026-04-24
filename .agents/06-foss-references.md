# FOSS Code References — ts-deep-explorer

> **Status**: active
> Maps functional requirements (`02-functional-requirements.md`) to specific open source implementations.

---

## Analysis — Import Extraction

### TypeScript Compiler API (official)
The primary approach. No external dependency needed.

**Key APIs**:
- `ts.createProgram(rootNames, options)` — create a program from file list + tsconfig
- `sourceFile.imports` — pre-collected import declarations (faster than walking AST)
- `ts.resolveModuleName(moduleSpecifier, containingFile, options, host)` — resolve `@/x` to `./src/x`
- `ts.isImportDeclaration(node)`, `ts.isExportDeclaration(node)` — type guards
- `importDeclaration.importClause.isTypeOnly` — detect type-only imports
- `checker.getExportsOfModule(symbol)` — get all exported symbols
- `symbol.getDocumentationComment(checker)` — extract JSDoc

**Reference**: TypeScript-Graph uses this approach directly.
- Repo: https://github.com/ysk8hori/typescript-graph
- Key files: `src/` — uses `ts.createProgram()` and walks `SourceFile` imports

**Relevant for**: FR-ANALYSIS-01 through FR-ANALYSIS-08, FR-DOCS-01

---

### Skott — Pipeline + Graph API
- Repo: https://github.com/antoine-coulon/skott
- Stars: 853 | License: MIT

**Architecture to reference**:
- `src/skott.ts` — orchestrator class. Creates `DiGraph`, walks files, extracts imports, populates graph
- Two build modes: entrypoint-based (DFS following imports) and directory-based (scan all)
- Output: `SkottStructure = { graph: Record<string, SkottNode>, files: string[] }`
- Node metadata: `{ id, adjacentTo, body: { size, thirdParty, builtin } }`
- Graph API: `GraphApi` class with cycle detection, deep/shallow deps, unused files
- Incremental: content hashing in `.skott/cache.json`, re-analyzes only changed files
- Watch: `@parcel/watcher` + SSE events to webapp

**Relevant for**: FR-GRAPH-01, FR-GRAPH-02, FR-GRAPH-03 (incremental), FR-PERF-02

**Note**: Skott uses `meriyah` (JS) and `typescript-estree` (TS) for parsing, NOT the TS Compiler API. We'll use the Compiler API instead for more accurate type-aware analysis, but the pipeline architecture and graph API design are excellent references.

---

### Dependency Cruiser — Rule Engine + Extraction
- Repo: https://github.com/sverweij/dependency-cruiser
- Stars: 5000+ | License: MIT

**Architecture to reference**:
- `src/extract/` — AST-based dependency extraction using acorn
- `.dependency-cruiser.json` — rule configuration format (for future FF-02)
- JSON output format: detailed module and dependency arrays
- HTML reporter: interactive SVG with expand/collapse, search, cycle highlighting
- Validation engine: runs custom rules against extracted dependencies

**Relevant for**: FF-02 (dependency rule validation), export formats (FR-VISUAL-05 cycle highlighting), JSON export (FE-03)

---

## Graph Model

### digraph-js (used by Skott)
- Repo: https://github.com/nicolo-ribaudo/changelog-diff (part of Skott monorepo)
- Zero-dependency directed graph library
- API: `addNode()`, `addEdge()`, `getDependenciesOf()`, `getDependentsOf()`, `hasCycle()`
- Generic type parameter for node data: `DiGraph<T>`

**Relevant for**: FR-GRAPH-01, FR-GRAPH-02

**Our approach**: Build a custom `DirectedGraph<T>` class inspired by digraph-js but with:
- Richer edge metadata (import type, imported symbols)
- Built-in query methods for our specific use cases
- Serialization to/from JSON for host↔webview transfer
- Patch methods for incremental updates

---

## Visualization — VSCode Webview

### CodeVisualizer — Webview Extension Pattern
- Repo: https://github.com/DucPhamNgoc08/CodeVisualizer
- Stars: 555 | License: MIT

**Architecture to reference**:
- `src/extension.ts` (243 lines) — command registration, provider initialization
- `src/view/CodebaseFlowProvider.ts` (505 lines) — webview panel implementation:
  - `resolveWebviewView()` / `resolveCustomTextEditor()` — panel lifecycle
  - HTML generation with CSP nonce
  - `panel.webview.onDidReceiveMessage()` — message handler
  - `panel.webview.postMessage()` — send data to webview
  - `webview.asWebviewUri()` — load local resources
- Uses Mermaid.js for rendering (we'll use React Flow instead)
- svg-pan-zoom for interactivity (we'll use React Flow's built-in zoom/pan)

**Relevant for**: FR-INTEGRATION-01 (commands), FR-INTEGRATION-02 (navigation), FR-INTEGRATION-04 (webview lifecycle)

---

### VSCode Dependency Cruiser Extension
- Repo: https://github.com/juanallo/vscode-dependency-cruiser
- Stars: 76 | License: MIT

**Architecture to reference**:
- Wraps dependency-cruiser in a VSCode webview
- Command registration pattern
- Graph data generation on extension host, rendering in webview

**Relevant for**: Extension structure reference, command patterns

---

## Visualization — React Flow

### React Flow / xyflow
- Repo: https://github.com/xyflow/xyflow
- Stars: 36,287 | License: MIT

**Key patterns for our use case**:

1. **Custom Nodes** — `ModuleNode.tsx`
```tsx
// Register custom node type
const nodeTypes = { module: ModuleNode };

function ModuleNode({ data }) {
  return (
    <div className="module-node">
      <strong>{data.moduleName}</strong>
      <span className="path">{data.relativePath}</span>
      <span className="exports">{data.exports.length} exports</span>
      {data.moduleDoc && <p className="doc-snippet">{truncate(data.moduleDoc, 80)}</p>}
    </div>
  );
}
```

2. **Dagre Layout** — ~30 lines of integration
```tsx
import dagre from '@dagrejs/dagre';

function computeLayout(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR' });
  nodes.forEach(n => g.setNode(n.id, { width: 200, height: 80 }));
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map(n => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x, y: pos.y } };
  });
}
```

3. **Built-in Components**: `<MiniMap>`, `<Controls>`, `<Background>`, `<Panel>`
4. **Event Handlers**: `onNodeClick`, `onNodeDoubleClick`, `onEdgeClick`

**Relevant for**: FR-VISUAL-01 through FR-VISUAL-06, FR-DOCS-02

---

### Graph-It-Live — Live Updating
- Repo: https://github.com/magic5644/Graph-It-Live
- Stars: 27 | License: MIT

**Architecture to reference**:
- Live-updating dependency graph in VSCode
- File watcher integration
- MCP support (interesting for AI agent integration)

**Relevant for**: FR-INTEGRATION-04 (live updates)

---

## Layout Algorithms

### dagre
- Repo: https://github.com/dagrejs/dagre
- License: MIT
- Hierarchical layout for directed graphs
- Best for dependency graphs (clear top→bottom or left→right flow)
- Synchronous API, fast for <500 nodes

### elkjs (future alternative)
- Repo: https://github.com/kieler/elkjs
- License: EPL-2.0
- More sophisticated layout options: layered, force, mrtree, radial
- Async API, supports edge routing and sub-flows
- Better for very large graphs (>500 nodes)

**Relevant for**: FR-VISUAL-06 (layout switching), FR-PERF-03

---

## Export

### Mermaid.js — Diagram Generation
- Repo: https://github.com/mermaid-js/mermaid
- Stars: 87,565 | License: MIT
- Text-to-diagram syntax
- We generate Mermaid syntax from our graph, not use Mermaid as the renderer
- GitHub-native rendering in `.md` files

**Relevant for**: FE-02 (Mermaid export)

---

## Summary: Which FOSS to Study per Module

| Our Module | Best FOSS Reference | What to Learn |
|---|---|---|
| `import-extractor.ts` | TypeScript-Graph + TS Compiler API docs | AST walking, module resolution |
| `doc-extractor.ts` | TS Compiler API (`getDocumentationComment`) | JSDoc extraction, type signatures |
| `graph.ts` | Skott's `DiGraph` | Graph data structure API design |
| `cycle-detector.ts` | Skott's `GraphApi` | Tarjan's SCC algorithm |
| `layout.ts` | dagre README | Layout computation integration |
| `panel.ts` | CodeVisualizer's `CodebaseFlowProvider` | VSCode webview lifecycle, CSP, messaging |
| `watcher.ts` | Skott's watch mode + Graph-It-Live | File watching, incremental updates |
| `ModuleNode.tsx` | React Flow docs + examples | Custom node components |
| `DocPanel.tsx` | React Flow Panel API | Side panel UI pattern |
| `exportGraph.ts` | Dependency Cruiser's reporters | Mermaid/JSON export formats |
