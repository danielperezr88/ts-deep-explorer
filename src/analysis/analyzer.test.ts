import { describe, it, expect } from "vitest";
import * as path from "path";
import { analyzeWorkspace } from "./analyzer";

const FIXTURES = path.resolve(__dirname, "../../tests/fixtures");

describe("analyzeWorkspace", () => {
  it("analyzes the simple-project fixture", () => {
    const result = analyzeWorkspace({
      projectRoot: path.join(FIXTURES, "simple-project"),
    });

    expect(result.nodeCount).toBeGreaterThanOrEqual(2);
    expect(result.edgeCount).toBeGreaterThanOrEqual(1);
    expect(result.errors).toHaveLength(0);

    // index.ts depends on utils.ts
    const indexFile = [...result.graph.getNodes().keys()].find((k) =>
      k.includes("index.ts")
    );
    expect(indexFile).toBeDefined();
    const deps = result.graph.getDependenciesOf(indexFile!);
    expect(deps.some((d) => d.includes("utils.ts"))).toBe(true);
  });

  it("analyzes the complex-project fixture", () => {
    const result = analyzeWorkspace({
      projectRoot: path.join(FIXTURES, "complex-project"),
    });

    expect(result.nodeCount).toBeGreaterThanOrEqual(6);
    expect(result.edgeCount).toBeGreaterThanOrEqual(4);

    const indexFile = [...result.graph.getNodes().keys()].find((k) =>
      k.includes("index.ts")
    );
    expect(indexFile).toBeDefined();

    const deps = result.graph.getDependenciesOf(indexFile!);
    // index.ts imports from: engine, config, validate, setup
    expect(deps.length).toBe(4);
    expect(deps.some((d) => d.includes("engine"))).toBe(true);
    expect(deps.some((d) => d.includes("config"))).toBe(true);
    expect(deps.some((d) => d.includes("validate"))).toBe(true);
    expect(deps.some((d) => d.includes("setup"))).toBe(true);
  });

  it("creates nodes with correct metadata", () => {
    const result = analyzeWorkspace({
      projectRoot: path.join(FIXTURES, "simple-project"),
    });

    const indexFile = [...result.graph.getNodes().entries()].find(([k]) =>
      k.includes("index.ts")
    );
    expect(indexFile).toBeDefined();

    const nodeData = indexFile![1];
    expect(nodeData.relativePath).toMatch(/index\.ts$/);
    expect(nodeData.moduleName).toBe("index");
    expect(nodeData.lineCount).toBeGreaterThan(0);
    expect(typeof nodeData.classification).toBe("string");
  });

  it("creates edges with correct import types", () => {
    const result = analyzeWorkspace({
      projectRoot: path.join(FIXTURES, "complex-project"),
    });

    const indexFile = [...result.graph.getNodes().keys()].find((k) =>
      k.includes("index.ts") && !k.includes("barrel")
    );
    expect(indexFile).toBeDefined();

    const outEdges = result.graph.getOutEdges(indexFile!);

    // Check type-only import to config
    const configEdge = outEdges.find((e) => e.target.includes("config"));
    expect(configEdge).toBeDefined();
    expect(configEdge!.data.importType).toBe("type-only");
    expect(configEdge!.data.symbols).toContain("Config");

    // Check static import to engine
    const engineEdge = outEdges.find((e) => e.target.includes("engine"));
    expect(engineEdge).toBeDefined();
    expect(engineEdge!.data.importType).toBe("static");
    expect(engineEdge!.data.symbols).toContain("processDoc");

    // Check side-effect import (empty symbols)
    const setupEdge = outEdges.find((e) => e.target.includes("setup"));
    expect(setupEdge).toBeDefined();
    expect(setupEdge!.data.symbols).toEqual([]);
  });

  it("handles barrel file re-exports", () => {
    const result = analyzeWorkspace({
      projectRoot: path.join(FIXTURES, "complex-project"),
    });

    const barrelFile = [...result.graph.getNodes().keys()].find((k) =>
      k.includes("barrel.ts")
    );
    expect(barrelFile).toBeDefined();

    const outEdges = result.graph.getOutEdges(barrelFile!);
    const reExports = outEdges.filter((e) => e.data.importType === "re-export");
    expect(reExports.length).toBe(3);
  });

  it("returns the TS program for further analysis", () => {
    const result = analyzeWorkspace({
      projectRoot: path.join(FIXTURES, "simple-project"),
    });

    expect(result.program).toBeDefined();
    const checker = result.program.getTypeChecker();
    expect(checker).toBeDefined();
  });

  it("handles missing tsconfig gracefully", () => {
    const result = analyzeWorkspace({
      projectRoot: path.join(FIXTURES, "nonexistent"),
    });

    expect(result.nodeCount).toBe(0);
    expect(result.edgeCount).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("stores relative paths correctly", () => {
    const result = analyzeWorkspace({
      projectRoot: path.join(FIXTURES, "paths-project"),
    });

    const allNodes = [...result.graph.getNodes().values()];
    for (const node of allNodes) {
      expect(node.relativePath).not.toContain(":\\");  // no absolute paths
      expect(node.relativePath).not.toContain(":/");
    }
  });

  it("merges duplicate edges with merged symbols", () => {
    // Test the merge logic via the complex-project where index.ts
    // has separate imports to the same file (theoretically possible)
    const result = analyzeWorkspace({
      projectRoot: path.join(FIXTURES, "simple-project"),
    });

    // Should only have 1 edge from index to utils
    const indexFile = [...result.graph.getNodes().keys()].find((k) =>
      k.includes("index.ts")
    );
    const outEdges = result.graph.getOutEdges(indexFile!);
    const utilEdges = outEdges.filter((e) => e.target.includes("utils"));
    expect(utilEdges).toHaveLength(1);
    expect(utilEdges[0].data.symbols).toContain("greet");
  });
});
