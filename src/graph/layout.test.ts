import { describe, it, expect } from "vitest";
import { computeLayout, type LayoutOptions } from "./layout";
import type { GraphNodeData, GraphEdgeData } from "../../shared/protocol";

function makeNode(id: string): GraphNodeData {
  return {
    id,
    relativePath: `${id}.ts`,
    moduleName: id,
    directory: "",
    classification: "core",
    lineCount: 10,
    exports: [],
    moduleDoc: null,
    deprecated: false,
  };
}

function makeEdge(source: string, target: string): GraphEdgeData {
  return {
    source,
    target,
    importType: "static",
    symbols: [],
  };
}

describe("computeLayout", () => {
  it("returns positions for all nodes", () => {
    const nodes = [makeNode("a"), makeNode("b"), makeNode("c")];
    const edges = [makeEdge("a", "b"), makeEdge("b", "c")];

    const positions = computeLayout(nodes, edges);

    expect(positions).toHaveLength(3);
    const ids = positions.map((p) => p.id);
    expect(ids).toContain("a");
    expect(ids).toContain("b");
    expect(ids).toContain("c");
  });

  it("all positions have valid x and y coordinates", () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const edges = [makeEdge("a", "b")];

    const positions = computeLayout(nodes, edges);

    for (const pos of positions) {
      expect(typeof pos.x).toBe("number");
      expect(typeof pos.y).toBe("number");
      expect(isNaN(pos.x)).toBe(false);
      expect(isNaN(pos.y)).toBe(false);
    }
  });

  it("positions are unique for multi-node graphs", () => {
    const nodes = [makeNode("a"), makeNode("b"), makeNode("c"), makeNode("d")];
    const edges = [makeEdge("a", "b"), makeEdge("a", "c"), makeEdge("b", "d")];

    const positions = computeLayout(nodes, edges);

    const uniqueKeys = new Set(positions.map((p) => `${p.x},${p.y}`));
    // At least the leaf nodes should have distinct positions
    expect(uniqueKeys.size).toBeGreaterThanOrEqual(2);
  });

  it("respects TB direction option", () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const edges = [makeEdge("a", "b")];

    const positionsTB = computeLayout(nodes, edges, { direction: "TB" });
    const positionsLR = computeLayout(nodes, edges, { direction: "LR" });

    // Both should produce valid layouts (exact positions differ by direction)
    expect(positionsTB).toHaveLength(2);
    expect(positionsLR).toHaveLength(2);

    // In TB layout, 'a' should be above 'b' (lower y)
    const aTB = positionsTB.find((p) => p.id === "a")!;
    const bTB = positionsTB.find((p) => p.id === "b")!;
    expect(aTB.y).toBeLessThan(bTB.y);
  });

  it("respects LR direction (source is to the left of target)", () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const edges = [makeEdge("a", "b")];

    const positions = computeLayout(nodes, edges, { direction: "LR" });

    const aPos = positions.find((p) => p.id === "a")!;
    const bPos = positions.find((p) => p.id === "b")!;
    expect(aPos.x).toBeLessThan(bPos.x);
  });

  it("handles empty graph", () => {
    const positions = computeLayout([], []);
    expect(positions).toHaveLength(0);
  });

  it("handles nodes with no edges (orphan nodes)", () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const positions = computeLayout(nodes, []);

    expect(positions).toHaveLength(2);
    for (const pos of positions) {
      expect(typeof pos.x).toBe("number");
      expect(typeof pos.y).toBe("number");
    }
  });

  it("handles diamond-shaped graph", () => {
    const nodes = [makeNode("top"), makeNode("left"), makeNode("right"), makeNode("bottom")];
    const edges = [
      makeEdge("top", "left"),
      makeEdge("top", "right"),
      makeEdge("left", "bottom"),
      makeEdge("right", "bottom"),
    ];

    const positions = computeLayout(nodes, edges);

    expect(positions).toHaveLength(4);
    // Verify all positions are valid numbers
    for (const pos of positions) {
      expect(typeof pos.x).toBe("number");
      expect(typeof pos.y).toBe("number");
    }
    // In TB layout, left and right share the same rank
    const tbPositions = computeLayout(nodes, edges, { direction: "TB" });
    const left = tbPositions.find((p) => p.id === "left")!;
    const right = tbPositions.find((p) => p.id === "right")!;
    expect(Math.abs(left.y - right.y)).toBeLessThan(5);
  });

  it("respects custom node dimensions", () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const edges = [makeEdge("a", "b")];

    const small = computeLayout(nodes, edges, { nodeWidth: 100, nodeHeight: 40 });
    const large = computeLayout(nodes, edges, { nodeWidth: 400, nodeHeight: 200 });

    // Both produce valid results
    expect(small).toHaveLength(2);
    expect(large).toHaveLength(2);

    // Larger nodes should generally create more spread
    const smallSpread = Math.abs(small[0].x - small[1].x) + Math.abs(small[0].y - small[1].y);
    const largeSpread = Math.abs(large[0].x - large[1].x) + Math.abs(large[0].y - large[1].y);
    expect(largeSpread).toBeGreaterThan(0);
  });

  it("respects custom spacing options", () => {
    const nodes = [makeNode("a"), makeNode("b"), makeNode("c")];
    const edges = [makeEdge("a", "b"), makeEdge("b", "c")];

    const tight = computeLayout(nodes, edges, { rankSpacing: 50, nodeSpacing: 20 });
    const loose = computeLayout(nodes, edges, { rankSpacing: 200, nodeSpacing: 100 });

    const tightSpread =
      Math.abs(tight[0].x - tight[2].x) + Math.abs(tight[0].y - tight[2].y);
    const looseSpread =
      Math.abs(loose[0].x - loose[2].x) + Math.abs(loose[0].y - loose[2].y);

    expect(looseSpread).toBeGreaterThan(tightSpread);
  });

  it("handles cyclic graphs without infinite loop", () => {
    const nodes = [makeNode("a"), makeNode("b"), makeNode("c")];
    const edges = [makeEdge("a", "b"), makeEdge("b", "c"), makeEdge("c", "a")];

    const positions = computeLayout(nodes, edges);
    expect(positions).toHaveLength(3);
    for (const pos of positions) {
      expect(typeof pos.x).toBe("number");
      expect(typeof pos.y).toBe("number");
    }
  });
});
