# Processes — ts-deep-explorer

> **Status**: active
> References: requirements in `02-functional-requirements.md`, architecture in `05-architecture.md`

---

## P1: Full Analysis Pipeline

**Trigger**: User opens the explorer panel or runs "Analyze Current File".

```
┌──────────────┐    ┌──────────────────┐    ┌───────────────────┐
│ 1. Discover  │───▶│ 2. Create TS     │───▶│ 3. Extract        │
│    TS files  │    │    Program       │    │    Imports         │
└──────────────┘    └──────────────────┘    └───────────────────┘
                                                    │
┌──────────────┐    ┌──────────────────┐    ┌───────▼───────────┐
│ 6. Render    │◀───│ 5. Compute       │◀───│ 4. Build Graph +  │
│    Webview   │    │    Layout        │    │    Enrich Metadata│
└──────────────┘    └──────────────────┘    └───────────────────┘
```

### Step 1: Discover TypeScript files
- Use `vscode.workspace.findFiles('**/*.{ts,tsx}', excludes)` to collect source files
- Read `tsconfig.json` from workspace root for compiler options and path aliases
- Apply exclusion patterns from `tsDeepExplorer.exclude` setting

### Step 2: Create TypeScript Program
- Call `ts.createProgram(filePaths, compilerOptions)` with resolved tsconfig
- This gives us `SourceFile` objects with full AST access
- Program creation is the most expensive step (~60% of analysis time)

### Step 3: Extract imports
- For each `SourceFile`, walk `sourceFile.imports` (pre-collected import declarations)
- For each import, call `ts.resolveModuleName()` to resolve the specifier to an absolute path
- Classify imports: static, dynamic, type-only, re-export
- Collect imported symbol names per edge

### Step 4: Build graph + enrich metadata
- Create directed graph: add node per file, add edge per import relationship
- Enrichment pass per node:
  - Extract exported symbols via `ts.getExportsOfModule(symbol)` + `checker.getTypeAtLocation()`
  - Extract JSDoc via `ts.displayPartsToString(symbol.getDocumentationComment(checker))`
  - Collect file stats (line count, size)
  - Classify module role (entry, leaf, barrel, core, utility, test)

### Step 5: Compute layout
- Run dagre layout algorithm on the graph
- Input: nodes with dimensions, edges
- Output: `{ x, y }` position for each node
- Layout runs on extension host (Node.js), positions sent to webview

### Step 6: Render in webview
- Send serialized graph (nodes + positions + edges + metadata) to webview via `postMessage`
- React Flow renders custom `ModuleNode` components at computed positions
- User sees the interactive graph immediately

---

## P2: Incremental Update Pipeline

**Trigger**: File save event from VSCode's `onDidSaveTextDocument` watcher.

```
┌──────────────┐    ┌──────────────────┐    ┌───────────────────┐
│ 1. Detect    │───▶│ 2. Re-parse      │───▶│ 3. Diff & Patch   │
│    change    │    │    changed file  │    │    Graph           │
└──────────────┘    └──────────────────┘    └───────────────────┘
                                                    │
                            ┌──────────────────┐    │
                            │ 5. Push delta    │◀───┤
                            │    to webview    │    │
                            └──────────────────┘    │
                                                    │
                            ┌──────────────────┐    │
                            │ 4. Recompute     │◀───┘
                            │    layout        │
                            └──────────────────┘
```

### Step 1: Detect change
- `vscode.workspace.onDidSaveTextDocument` fires
- Filter: only `.ts`/`.tsx` files, skip files matching exclude patterns
- Debounce: wait 300ms for rapid successive saves

### Step 2: Re-parse changed file
- Get the updated `SourceFile` from the existing `ts.Program` (or create new program if structural changes like new files)
- Re-extract imports and metadata for the changed file only
- Also re-extract metadata for direct dependents (files that import the changed file), since their "used symbols" may have changed

### Step 3: Diff & patch graph
- Compare new imports vs. old imports for the changed file
- Add new edges, remove deleted edges, update metadata on affected nodes
- Re-run cycle detection on affected subgraph only

### Step 4: Recompute layout
- If edges changed: recompute layout for affected region (or full graph if structure changed significantly)
- If only metadata changed: reuse existing positions

### Step 5: Push delta to webview
- Send `{ type: 'graphUpdate', nodes: [...], edges: [...], layout: [...] }` via postMessage
- Webview merges delta into existing React Flow state

---

## P3: User Interaction — Source Navigation

**Trigger**: User double-clicks a node in the graph.

```
┌──────────────┐    ┌──────────────────┐    ┌───────────────────┐
│ 1. Node      │───▶│ 2. postMessage   │───▶│ 3. Extension host │
│    double-   │    │    to host       │    │    resolves URI   │
│    click     │    └──────────────────┘    └───────────────────┘
                                                              │
┌──────────────┐    ┌──────────────────┐    ┌─────────────────▼┐
│ 5. Editor    │◀───│ 4. Open document │◀──┤
│    shows     │    │    at position   │    │
│    file      │    └──────────────────┘    └───────────────────┘
└──────────────┘
```

1. React Flow fires `onNodeDoubleClick` event
2. Webview sends `{ type: 'navigateTo', filePath, symbolName? }` to extension host
3. Extension host calls `vscode.workspace.openTextDocument(filePath)` then `vscode.window.showTextDocument(doc, { selection })`
4. If `symbolName` provided, resolve to line number via `sourceFile.getPositionOfLineAndCharacter()`

---

## P4: User Interaction — Documentation Panel

**Trigger**: User single-clicks a node.

```
┌──────────────┐    ┌──────────────────┐
│ 1. Node      │───▶│ 2. Show DocPanel │
│    click     │    │    in webview    │
└──────────────┘    └──────────────────┘
```

1. React Flow fires `onNodeClick` event
2. Webview updates local state: `selectedNodeId = node.id`
3. `DocPanel` component reads node metadata from graph state and renders:
   - Module name and path
   - Module-level JSDoc (rendered as markdown)
   - Exported symbols table (name, kind, JSDoc summary, deprecation status)
   - "Depends on" list (clickable — navigates to that node)
   - "Used by" list (clickable)
   - Metrics: line count, export count, dependency depth

---

## P5: Export Process

**Trigger**: User runs "Export Graph" command.

### PNG/SVG export
1. Webview calls `toSVG()` or `toCanvas()` on React Flow instance
2. Converts to blob, sends to extension host
3. Extension host saves via `vscode.window.showSaveDialog()`

### Mermaid export
1. Extension host walks graph nodes and edges
2. Generates Mermaid flowchart syntax:
   ```
   graph LR
     A[src/index] --> B[src/core/engine]
     A --> C[src/utils/helper]
   ```
3. Copies to clipboard or saves to file

### JSON export
1. Serialize full graph: `{ nodes: ModuleNode[], edges: DependencyEdge[], metadata: AnalysisMetadata }`
2. Save as `.json` file via save dialog
