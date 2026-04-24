# TS Deep Explorer — CLAUDE.md

## Project Overview
VSCode extension for interactive TypeScript dependency graph visualization with documentation overlays. Built with TS Compiler API (analysis), React Flow (visualization), and dagre (layout).

## Key Directories
- `src/` — Extension host code (Node.js target, esbuild bundling)
- `webview/` — React frontend (browser target, Vite bundling)
- `shared/` — Shared types (message protocol)
- `.agents/` — Planning documents (see `.agents/AGENTS.md` for index)

## Commands
- `npm run build` — bundle extension with esbuild
- `npm run watch` — watch mode for extension
- `npm test` — run vitest
- `npm run lint` — type-check with tsc --noEmit

## Architecture Rules
- All of the architecture should be fully tested, so that no human intervention is needed for debugging, only for the refinement of functional aspects of the solution.
- Commit and push at every step, even multiple times per issue if necessary, every time you consolidate an implementation (which of course also involves testing).
- Go through all of the backlog, 1 item at a time, making sure you have the whole context from the documentation at every step, and testing thoroughly.

## Testing Conventions
- `vscode` module is mocked in tests (it's only available at runtime in VSCode)
- Unit tests use Vitest with `vi.mock("vscode", ...)`
- Test files co-located: `src/foo.ts` → `src/foo.test.ts`
- All core modules (graph, analysis, layout) must have >80% test coverage

## VSCode Extension Patterns
- Extension host communicates with webview via `postMessage` protocol (see `shared/protocol.ts`)
- Webview is a sandboxed iframe — no direct access to VSCode APIs
- Use `webview.asWebviewUri()` for loading bundled resources
- CSP nonce required for all scripts in webview HTML
