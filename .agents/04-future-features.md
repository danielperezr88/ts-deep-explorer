# Future Features — ts-deep-explorer

> **Status**: backlog — post-v1 ideas
> These features are explicitly deferred but inform architecture decisions to ensure extensibility.

---

## Near-term (v2 candidates)

### FF-01: AI-Powered Architecture Summaries
- Integrate LLM (via VS Code's LM API or external) to generate natural-language descriptions of module clusters and dependency patterns
- "This cluster of 8 modules handles HTTP request routing. It depends on the auth middleware and the validation layer."
- Auto-generate architecture decision records (ADRs) from the dependency structure

### FF-02: Dependency Rule Validation
- Like dependency-cruiser's rule engine: define allowed/forbidden dependency patterns
- Rules like "src/core/ must not import from src/cli/" or "test files must not be imported by non-test files"
- Show violations as red edges in the graph and as diagnostics in the Problems panel
- Configuration via `.ts-deep-explorer-rules.json`

### FF-03: Monorepo / Multi-package Support
- Detect workspace-style monorepos (pnpm workspaces, yarn workspaces, npm workspaces, turborepo)
- Render package-level dependency graph alongside file-level graph
- Cross-package dependency edges with version info from `package.json`

### FF-04: Historical Dependency Evolution
- Use `git log` to track how the dependency graph changes over time
- Timeline slider showing graph state at each commit
- Highlight added/removed dependencies between two points in time
- "Dependency churn" metric for code review

## Mid-term (v3 candidates)

### FF-05: Test Coverage Overlay
- Integrate with Istanbul/c8 coverage data
- Color-code nodes by coverage percentage (green → red)
- Show which dependencies are exercised by tests vs. untested paths
- Highlight dead code (modules with no test dependents)

### FF-06: Bundle Size Impact Analysis
- Estimate the runtime bundle impact of each module (tree-shaken size)
- Show cumulative bundle size along dependency chains
- "If you import this module, you pull in X KB of transitive dependencies"
- Integrate with bundle visualization tools (webpack-bundle-analyzer, rollup-visualizer)

### FF-07: Architecture Decision Records Integration
- Link dependency patterns to ADR documents
- Surface ADRs in documentation panel when viewing affected modules
- Validate that current architecture matches documented decisions

### FF-08: Export to Knowledge Graph Formats
- Export dependency graph as doc-store-compatible edges (`RelationshipEdge` format)
- Map module classifications to doc-store categories
- Enable cross-referencing code dependencies with document consolidation graph
- Bidirectional sync: code changes flag affected documents in doc-store

### FF-09: Collaborative Annotations
- Allow team members to annotate modules with notes directly in the explorer
- Annotations stored in `.ts-deep-explorer/annotations.json` (git-trackable)
- Show annotation indicators on nodes, expand in documentation panel

## Long-term (v4+)

### FF-10: Call Graph Analysis
- Beyond import graphs: trace actual function call chains using TS control flow analysis
- Render call graphs at the function level (not just file level)
- "Who calls `processDocument()`?" with full call stack visualization

### FF-11: Dependency Impact Simulation
- "What if I delete/refactor this module?" — simulate the blast radius
- Show all modules that would break, tests that would fail
- Suggest safe refactoring paths (minimum-dependency-change approaches)

### FF-12: Performance Regression Detection
- Track analysis time and graph complexity metrics over time
- Alert when dependency count crosses configurable thresholds
- CI integration: fail PRs that increase circular dependency count

### FF-13: Natural Language Queries
- "Show me all modules that depend on the database layer but aren't in the test folder"
- "Find circular dependencies in the auth module"
- Powered by LLM with graph API as tool

### FF-14: Custom Visualization Plugins
- Allow third-party React components as custom node/edge renderers
- Plugin API for custom analysis passes (e.g., security audit, license compliance)
- User-defined layout algorithms
