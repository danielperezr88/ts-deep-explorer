import { describe, it, expect } from "vitest";
import { DirectedGraph } from "../graph/graph";
import type { ModuleNodeData, DependencyEdgeData } from "../../shared/types";
import { classifyModule, classifyAllModules } from "./classifier";

function makeNode(overrides: Partial<ModuleNodeData> = {}): ModuleNodeData {
  return {
    id: "test.ts",
    relativePath: "test.ts",
    moduleName: "test",
    directory: ".",
    classification: "core",
    lineCount: 100,
    exports: [],
    moduleDoc: null,
    deprecated: false,
    ...overrides,
  };
}

function makeEdge(
  source: string,
  target: string,
  importType: DependencyEdgeData["importType"] = "static"
): { source: string; target: string; data: DependencyEdgeData } {
  return {
    source,
    target,
    data: { source, target, importType, symbols: [] },
  };
}

describe("classifyModule", () => {
  it("classifies entry nodes (no incoming, has outgoing)", () => {
    const g = new DirectedGraph<ModuleNodeData, DependencyEdgeData>();
    g.addNode("index.ts", makeNode({ id: "index.ts" }));
    g.addNode("utils.ts", makeNode({ id: "utils.ts" }));
    g.addEdge("index.ts", "utils.ts", makeEdge("index.ts", "utils.ts").data);

    expect(classifyModule("index.ts", g)).toBe("entry");
  });

  it("classifies leaf/utility nodes (no outgoing, small)", () => {
    const g = new DirectedGraph<ModuleNodeData, DependencyEdgeData>();
    g.addNode("index.ts", makeNode({ id: "index.ts" }));
    g.addNode("helper.ts", makeNode({ id: "helper.ts", lineCount: 20 }));
    g.addEdge("index.ts", "helper.ts", makeEdge("index.ts", "helper.ts").data);

    expect(classifyModule("helper.ts", g)).toBe("utility");
  });

  it("classifies barrel nodes (many re-exports)", () => {
    const g = new DirectedGraph<ModuleNodeData, DependencyEdgeData>();
    g.addNode("index.ts", makeNode({ id: "index.ts" }));
    g.addNode("a.ts", makeNode({ id: "a.ts" }));
    g.addNode("b.ts", makeNode({ id: "b.ts" }));
    g.addNode("c.ts", makeNode({ id: "c.ts" }));
    g.addEdge("index.ts", "a.ts", makeEdge("index.ts", "a.ts", "re-export").data);
    g.addEdge("index.ts", "b.ts", makeEdge("index.ts", "b.ts", "re-export").data);
    g.addEdge("index.ts", "c.ts", makeEdge("index.ts", "c.ts", "re-export").data);

    expect(classifyModule("index.ts", g)).toBe("barrel");
  });

  it("classifies core nodes (both incoming and outgoing)", () => {
    const g = new DirectedGraph<ModuleNodeData, DependencyEdgeData>();
    g.addNode("entry.ts", makeNode({ id: "entry.ts" }));
    g.addNode("core.ts", makeNode({ id: "core.ts" }));
    g.addNode("util.ts", makeNode({ id: "util.ts" }));
    g.addEdge("entry.ts", "core.ts", makeEdge("entry.ts", "core.ts").data);
    g.addEdge("core.ts", "util.ts", makeEdge("core.ts", "util.ts").data);

    expect(classifyModule("core.ts", g)).toBe("core");
  });

  it("classifies test files by path pattern", () => {
    const g = new DirectedGraph<ModuleNodeData, DependencyEdgeData>();
    g.addNode("foo.test.ts", makeNode({ id: "foo.test.ts" }));
    g.addNode("bar.spec.ts", makeNode({ id: "bar.spec.ts" }));
    g.addNode("__tests__/baz.ts", makeNode({ id: "__tests__/baz.ts" }));
    g.addNode("test/qux.ts", makeNode({ id: "test/qux.ts" }));

    expect(classifyModule("foo.test.ts", g)).toBe("test");
    expect(classifyModule("bar.spec.ts", g)).toBe("test");
    expect(classifyModule("__tests__/baz.ts", g)).toBe("test");
    expect(classifyModule("test/qux.ts", g)).toBe("test");
  });

  it("classifies isolated small files as utility", () => {
    const g = new DirectedGraph<ModuleNodeData, DependencyEdgeData>();
    g.addNode("small.ts", makeNode({ id: "small.ts", lineCount: 10 }));

    expect(classifyModule("small.ts", g)).toBe("utility");
  });

  it("classifies isolated large files as core", () => {
    const g = new DirectedGraph<ModuleNodeData, DependencyEdgeData>();
    g.addNode("big.ts", makeNode({ id: "big.ts", lineCount: 200 }));

    expect(classifyModule("big.ts", g)).toBe("core");
  });
});

describe("classifyAllModules", () => {
  it("classifies all nodes in a realistic graph", () => {
    const g = new DirectedGraph<ModuleNodeData, DependencyEdgeData>();
    g.addNode("src/index.ts", makeNode({ id: "src/index.ts" }));
    g.addNode("src/core/engine.ts", makeNode({ id: "src/core/engine.ts" }));
    g.addNode("src/utils/helper.ts", makeNode({ id: "src/utils/helper.ts", lineCount: 15 }));
    g.addNode("src/utils/format.test.ts", makeNode({ id: "src/utils/format.test.ts" }));
    g.addNode("src/barrel.ts", makeNode({ id: "src/barrel.ts" }));
    g.addNode("src/types.ts", makeNode({ id: "src/types.ts", lineCount: 8 }));

    g.addEdge("src/index.ts", "src/core/engine.ts", makeEdge("src/index.ts", "src/core/engine.ts").data);
    g.addEdge("src/index.ts", "src/barrel.ts", makeEdge("src/index.ts", "src/barrel.ts").data);
    g.addEdge("src/core/engine.ts", "src/utils/helper.ts", makeEdge("src/core/engine.ts", "src/utils/helper.ts").data);
    g.addEdge("src/utils/format.test.ts", "src/utils/helper.ts", makeEdge("src/utils/format.test.ts", "src/utils/helper.ts").data);

    // Add re-exports to barrel
    g.addNode("src/a.ts", makeNode({ id: "src/a.ts" }));
    g.addNode("src/b.ts", makeNode({ id: "src/b.ts" }));
    g.addNode("src/c.ts", makeNode({ id: "src/c.ts" }));
    g.addEdge("src/barrel.ts", "src/a.ts", makeEdge("src/barrel.ts", "src/a.ts", "re-export").data);
    g.addEdge("src/barrel.ts", "src/b.ts", makeEdge("src/barrel.ts", "src/b.ts", "re-export").data);
    g.addEdge("src/barrel.ts", "src/c.ts", makeEdge("src/barrel.ts", "src/c.ts", "re-export").data);

    classifyAllModules(g);

    expect(g.getNode("src/index.ts")!.classification).toBe("entry");
    expect(g.getNode("src/core/engine.ts")!.classification).toBe("core");
    expect(g.getNode("src/utils/helper.ts")!.classification).toBe("utility");
    expect(g.getNode("src/utils/format.test.ts")!.classification).toBe("test");
    expect(g.getNode("src/barrel.ts")!.classification).toBe("barrel");
  });
});
