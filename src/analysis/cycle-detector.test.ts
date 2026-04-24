import { describe, it, expect } from "vitest";
import { DirectedGraph } from "../graph/graph";
import { detectCycles } from "./cycle-detector";

describe("detectCycles", () => {
  it("returns empty for acyclic graph", () => {
    // a → b → c
    const g = new DirectedGraph<string, string>();
    g.addNode("a", "A");
    g.addNode("b", "B");
    g.addNode("c", "C");
    g.addEdge("a", "b", "x");
    g.addEdge("b", "c", "x");

    expect(detectCycles(g)).toEqual([]);
  });

  it("detects a simple cycle a → b → a", () => {
    const g = new DirectedGraph<string, string>();
    g.addNode("a", "A");
    g.addNode("b", "B");
    g.addEdge("a", "b", "x");
    g.addEdge("b", "a", "x");

    const cycles = detectCycles(g);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toEqual(expect.arrayContaining(["a", "b"]));
    // Cycle should be closed (first === last)
    expect(cycles[0][0]).toBe(cycles[0][cycles[0].length - 1]);
  });

  it("detects a 3-node cycle a → b → c → a", () => {
    const g = new DirectedGraph<string, string>();
    g.addNode("a", "A");
    g.addNode("b", "B");
    g.addNode("c", "C");
    g.addEdge("a", "b", "x");
    g.addEdge("b", "c", "x");
    g.addEdge("c", "a", "x");

    const cycles = detectCycles(g);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toEqual(expect.arrayContaining(["a", "b", "c"]));
    expect(cycles[0][0]).toBe(cycles[0][cycles[0].length - 1]);
  });

  it("detects self-loops", () => {
    const g = new DirectedGraph<string, string>();
    g.addNode("a", "A");
    g.addNode("b", "B");
    g.addEdge("a", "b", "x");
    g.addEdge("a", "a", "x");

    const cycles = detectCycles(g);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toEqual(["a", "a"]);
  });

  it("detects multiple independent cycles", () => {
    // Cycle 1: a → b → a
    // Cycle 2: c → d → c
    // e is outside both cycles
    const g = new DirectedGraph<string, string>();
    g.addNode("a", "A");
    g.addNode("b", "B");
    g.addNode("c", "C");
    g.addNode("d", "D");
    g.addNode("e", "E");
    g.addEdge("a", "b", "x");
    g.addEdge("b", "a", "x");
    g.addEdge("c", "d", "x");
    g.addEdge("d", "c", "x");
    g.addEdge("e", "a", "x");

    const cycles = detectCycles(g);
    expect(cycles).toHaveLength(2);
  });

  it("detects cycle in complex graph with non-cycle branches", () => {
    // a → b → c → d → b (cycle: b → c → d → b)
    // a → e (non-cycle branch)
    const g = new DirectedGraph<string, string>();
    g.addNode("a", "A");
    g.addNode("b", "B");
    g.addNode("c", "C");
    g.addNode("d", "D");
    g.addNode("e", "E");
    g.addEdge("a", "b", "x");
    g.addEdge("b", "c", "x");
    g.addEdge("c", "d", "x");
    g.addEdge("d", "b", "x");
    g.addEdge("a", "e", "x");

    const cycles = detectCycles(g);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toEqual(expect.arrayContaining(["b", "c", "d"]));
  });

  it("returns empty for empty graph", () => {
    const g = new DirectedGraph<string, string>();
    expect(detectCycles(g)).toEqual([]);
  });

  it("returns empty for graph with only orphans", () => {
    const g = new DirectedGraph<string, string>();
    g.addNode("a", "A");
    g.addNode("b", "B");
    expect(detectCycles(g)).toEqual([]);
  });
});
