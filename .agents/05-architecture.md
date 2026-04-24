# Software Architecture — ts-deep-explorer

> **Status**: active
> Requirements: `02-functional-requirements.md` | Processes: `03-processes.md` | FOSS refs: `06-foss-references.md`

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Extension host | TypeScript, VSCode Extension API | Commands, file watcher, lifecycle |
| Analysis engine | TypeScript Compiler API (`typescript` npm) | AST parsing, import resolution, symbol extraction |
| Graph model | Custom directed graph (inspired by `digraph-js`) | Node/edge storage, graph queries, cycle detection |
| Layout engine | `@dagrejs/dagre` | Hierarchical node positioning |
| Webview frontend | React 18 + `@xyflow/react` (React Flow v12) | Interactive graph rendering |
| Frontend tooling | Vite | Bundling webview React app |
| Extension bundling | esbuild | Bundling extension host code |
| Testing | Vitest | Unit + integration tests |
| Styling | CSS with VSCode variables (`var(--vscode-*)`) | Theme-aware styling |

---

## Project Structure

```
ts-deep-explorer/
├── src/                              # Extension host (Node.js target)
│   ├── extension.ts                  # activate(), deactivate(), command registration
│   ├── commands/
│   │   ├── openExplorer.ts           # "TS Deep Explorer: Open Explorer"
│   │   ├── analyzeFile.ts            # "TS Deep Explorer: Analyze Current File"
│   │   ├── showCycles.ts             # "TS Deep Explorer: Show Circular Dependencies"
│   │   └── exportGraph.ts            # "TS Deep Explorer: Export Graph"
│   ├── analysis/
│   │   ├── analyzer.ts               # Orchestrates TS program + graph build
│   │   ├── import-extractor.ts       # Walks SourceFile.imports, resolves modules
│   │   ├── doc-extractor.ts          # JSDoc/TSDoc + symbol extraction via checker
│   │   ├── classifier.ts             # Module role classification logic
│   │   └── cycle-detector.ts         # Tarjan's algorithm for SCC detection
│   ├── graph/
│   │   ├── graph.ts                  # DirectedGraph<T> class
│   │   ├── types.ts                  # ModuleNode, DependencyEdge, ImportType
│   │   └── layout.ts                 # dagre layout computation
│   ├── watch/
│   │   └── watcher.ts                # onDidSaveTextDocument listener + debounce
│   └── webview/
│       ├── panel.ts                  # WebviewPanel lifecycle, HTML generation
│       └── messaging.ts              # Typed postMessage protocol (host → webview, webview → host)
├── webview/                          # Frontend (browser target)
│   ├── src/
│   │   ├── App.tsx                   # Root: React Flow + panels
│   │   ├── main.tsx                  # React DOM entry point
│   │   ├── components/
│   │   │   ├── GraphCanvas.tsx       # React Flow wrapper with config
│   │   │   ├── nodes/
│   │   │   │   ├── ModuleNode.tsx    # Custom node: name, path, exports, doc snippet
│   │   │   │   └── GroupNode.tsx     # Collapsible directory aggregate
│   │   │   └── edges/
│   │   │       └── DependencyEdge.tsx # Custom edge: type-only dashed, re-export bold
│   │   ├── panels/
│   │   │   ├── DocPanel.tsx          # Side panel: full docs, exports, used-by list
│   │   │   └── FilterPanel.tsx       # Search bar + classification filters
│   │   ├── hooks/
│   │   │   ├── useExtensionHost.ts   # postMessage listener + state dispatch
│   │   │   └── useGraphLayout.ts     # Layout computation hook
│   │   ├── lib/
│   │   │   └── vscode-api.ts         # acquireVsCodeApi() wrapper
│   │   └── types.ts                  # Webview-local types
│   ├── index.html                    # HTML shell for webview
│   ├── vite.config.ts
│   └── tsconfig.json
├── shared/
│   └── protocol.ts                   # Shared message types (host ↔ webview)
├── .agents/                          # Planning documents
├── package.json                      # Extension manifest + deps
├── tsconfig.json                     # Extension host TS config
├── esbuild.config.mjs                # Extension bundler config
├── .vscodeignore
└── README.md
```

---

## Data Model

```typescript
// shared/protocol.ts

// === Graph Data ===

interface ModuleNodeData {
  id: string;                    // absolute file path
  relativePath: string;          // relative to workspace root
  moduleName: string;            // filename without extension
  directory: string;             // parent directory
  classification: 'entry' | 'leaf' | 'barrel' | 'core' | 'utility' | 'test';
  lineCount: number;
  exports: ExportedSymbol[];
  moduleDoc: string | null;      // module-level JSDoc
  deprecated: boolean;
  deprecationMessage?: string;
}

interface DependencyEdgeData {
  source: string;
  target: string;
  importType: 'static' | 'dynamic' | 'type-only' | 're-export';
  symbols: string[];             // imported symbol names
}

interface ExportedSymbol {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'const' | 'enum';
  doc: string | null;
  deprecated: boolean;
  signature: string;             // type signature string
  usedBy: string[];              // module IDs that import this symbol
}

// === Message Protocol ===

type HostToWebviewMessage =
  | { type: 'graphData'; nodes: ModuleNodeData[]; edges: DependencyEdgeData[]; positions: Map<string, {x:number,y:number}> }
  | { type: 'graphUpdate'; nodes: ModuleNodeData[]; edges: DependencyEdgeData[]; positions: Map<string, {x:number,y:number}> }
  | { type: 'analysisStatus'; status: 'scanning' | 'analyzing' | 'layout' | 'ready' | 'error'; message?: string }
  | { type: 'cycles'; cycles: string[][] };

type WebviewToHostMessage =
  | { type: 'navigateTo'; filePath: string; symbolName?: string }
  | { type: 'requestCycles' }
  | { type: 'exportGraph'; format: 'png' | 'svg' | 'mermaid' | 'json' }
  | { type: 'ready' };
```

---

## Module Responsibilities

### `src/analysis/analyzer.ts` — Analysis Orchestrator
Entry point for analysis. Creates `ts.Program`, coordinates extractors, produces the graph.
- `analyzeWorkspace(config): Promise<AnalysisResult>`
- `analyzeFile(filePath, config): Promise<AnalysisResult>`
- Maintains a cache of the last analysis for incremental updates

### `src/analysis/import-extractor.ts` — Import Extraction
Pure function that takes a `SourceFile` and returns a list of resolved imports.
- `extractImports(sourceFile: ts.SourceFile, program: ts.Program): ResolvedImport[]`
- Uses `ts.resolveModuleName()` for path resolution
- Handles: static, dynamic, type-only, re-exports

### `src/analysis/doc-extractor.ts` — Documentation Extraction
Uses the `ts.TypeChecker` to extract JSDoc and symbol information.
- `extractModuleDoc(sourceFile, checker): ModuleDocResult`
- `extractExports(sourceFile, checker): ExportedSymbol[]`
- Uses `symbol.getDocumentationComment(checker)` for JSDoc
- Uses `checker.typeToString()` for signatures

### `src/analysis/classifier.ts` — Module Classification
Pure function classifying a module based on its graph position and content.
- `classifyModule(nodeId, graph, metadata): ModuleClassification`
- Rules: entry (no in-edges), leaf (no out-edges), barrel (>5 re-exports), core (high fan-in + fan-out), utility (leaf + small), test (glob match)

### `src/analysis/cycle-detector.ts` — Cycle Detection
Tarjan's strongly connected components algorithm.
- `detectCycles(graph): string[][]`
- Returns array of cycle paths

### `src/graph/graph.ts` — Directed Graph
Generic directed graph with metadata-rich nodes.
- `addNode(id, data)`, `addEdge(from, to, data)`
- `getDependenciesOf(id)`, `getDependentsOf(id)`
- `getNodes()`, `getEdges()`, `getNode(id)`
- `patchNodes(updated)`, `patchEdges(updated)` — for incremental updates
- `toJSON()` / `fromJSON()` — serialization

### `src/graph/layout.ts` — Layout Computation
Wraps dagre to compute node positions.
- `computeLayout(graph, options): Map<string, {x, y}>`
- Options: `direction: 'TB' | 'LR'`, `nodeSpacing`, `rankSpacing`

### `src/webview/panel.ts` — Webview Panel Manager
Creates and manages the webview panel lifecycle.
- Singleton pattern (one panel at a time)
- Generates HTML with CSP nonce, loads bundled webview JS/CSS
- Sets up `postMessage` listeners
- Handles panel close/reopen

### `src/webview/messaging.ts` — Typed Message Bridge
Type-safe wrapper around `postMessage`.
- `sendToWebview(msg: HostToWebviewMessage)`
- `onWebviewMessage(handler: (msg: WebviewToHostMessage) => void)`

### `src/watch/watcher.ts` — File Watcher
Debounced file change listener.
- `startWatching(context, analyzer, panel)`
- Debounce: 300ms
- Triggers incremental analysis pipeline (P2)

---

## Build System

### Extension host (esbuild)
- Entry: `src/extension.ts`
- Output: `out/extension.js`
- External: `vscode`
- Bundle all other dependencies
- Target: Node.js 18

### Webview frontend (Vite)
- Entry: `webview/index.html`
- Output: `out/webview/`
- Target: browser (ESNext)
- React + React Flow + dagre bundled
- CSS processed by Vite

### Development workflow
- `npm run build` — builds both extension and webview
- `npm run watch` — watches both for changes
- `npm run test` — runs Vitest
- F5 in VSCode — launches Extension Development Host

---

## Security Considerations

- **Content Security Policy**: Webview HTML sets strict CSP with nonce for scripts
- **No eval()**: All scripts loaded via nonce-tagged `<script>` tags
- **No external resources**: All JS/CSS bundled locally, no CDN
- **postMessage validation**: All messages validated against protocol types before processing
- **Path validation**: Navigation commands validate file paths are within workspace
