import { describe, it, expect, beforeEach } from "vitest";
import { DirectedGraph } from "./graph";

describe("DirectedGraph", () => {
  describe("node operations", () => {
    it("adds and retrieves nodes", () => {
      const g = new DirectedGraph<string, string>();
      g.addNode("a", "node-a");
      expect(g.hasNode("a")).toBe(true);
      expect(g.getNode("a")).toBe("node-a");
      expect(g.hasNode("b")).toBe(false);
      expect(g.nodeCount).toBe(1);
    });

    it("does not duplicate nodes on re-add", () => {
      const g = new DirectedGraph<string, string>();
      g.addNode("a", "original");
      g.addNode("a", "updated");
      expect(g.nodeCount).toBe(1);
      expect(g.getNode("a")).toBe("original"); // data not overwritten on addNode
    });

    it("updates node data", () => {
      const g = new DirectedGraph<string, string>();
      g.addNode("a", "original");
      g.updateNode("a", "updated");
      expect(g.getNode("a")).toBe("updated");
    });

    it("removes a node and its edges", () => {
      const g = new DirectedGraph<string, string>();
      g.addNode("a", "A");
      g.addNode("b", "B");
      g.addNode("c", "C");
      g.addEdge("a", "b", "a→b");
      g.addEdge("a", "c", "a→c");
      g.addEdge("b", "c", "b→c");

      g.removeNode("b");

      expect(g.hasNode("b")).toBe(false);
      expect(g.nodeCount).toBe(2);
      expect(g.edgeCount).toBe(1); // only a→c remains
      expect(g.hasEdge("a", "b")).toBe(false);
      expect(g.hasEdge("b", "c")).toBe(false);
      expect(g.hasEdge("a", "c")).toBe(true);
    });

    it("returns all nodes as a readonly map", () => {
      const g = new DirectedGraph<number, string>();
      g.addNode("a", 1);
      g.addNode("b", 2);
      const nodes = g.getNodes();
      expect(nodes.size).toBe(2);
      expect(nodes.get("a")).toBe(1);
      expect(nodes.get("b")).toBe(2);
    });
  });

  describe("edge operations", () => {
    it("adds and retrieves edges", () => {
      const g = new DirectedGraph<string, { weight: number }>();
      g.addNode("a", "A");
      g.addNode("b", "B");
      g.addEdge("a", "b", { weight: 5 });

      expect(g.hasEdge("a", "b")).toBe(true);
      expect(g.hasEdge("b", "a")).toBe(false);
      expect(g.edgeCount).toBe(1);
      expect(g.getEdge("a", "b")?.data).toEqual({ weight: 5 });
    });

    it("throws when adding edge with missing nodes", () => {
      const g = new DirectedGraph<string, string>();
      g.addNode("a", "A");
      expect(() => g.addEdge("a", "missing", "data")).toThrow(
        "Cannot add edge: node not found"
      );
      expect(() => g.addEdge("missing", "a", "data")).toThrow(
        "Cannot add edge: node not found"
      );
    });

    it("removes an edge without affecting other edges", () => {
      const g = new DirectedGraph<string, string>();
      g.addNode("a", "A");
      g.addNode("b", "B");
      g.addNode("c", "C");
      g.addEdge("a", "b", "a→b");
      g.addEdge("a", "c", "a→c");

      g.removeEdge("a", "b");
      expect(g.hasEdge("a", "b")).toBe(false);
      expect(g.hasEdge("a", "c")).toBe(true);
      expect(g.edgeCount).toBe(1);
    });

    it("supports multiple edges from same source", () => {
      const g = new DirectedGraph<string, string>();
      g.addNode("a", "A");
      g.addNode("b", "B");
      g.addNode("c", "C");
      g.addEdge("a", "b", "1");
      g.addEdge("a", "c", "2");

      expect(g.edgeCount).toBe(2);
      expect(g.getDependenciesOf("a")).toEqual(expect.arrayContaining(["b", "c"]));
    });
  });

  describe("graph queries", () => {
    let g: DirectedGraph<string, string>;

    beforeEach(() => {
      // Graph: a → b → d
      //        a → c → d
      //        e (orphan)
      g = new DirectedGraph<string, string>();
      g.addNode("a", "A");
      g.addNode("b", "B");
      g.addNode("c", "C");
      g.addNode("d", "D");
      g.addNode("e", "E");
      g.addEdge("a", "b", "a→b");
      g.addEdge("a", "c", "a→c");
      g.addEdge("b", "d", "b→d");
      g.addEdge("c", "d", "c→d");
    });

    it("getDependenciesOf returns outgoing targets", () => {
      expect(g.getDependenciesOf("a")).toEqual(["b", "c"]);
      expect(g.getDependenciesOf("d")).toEqual([]);
      expect(g.getDependenciesOf("missing")).toEqual([]);
    });

    it("getDependentsOf returns incoming sources", () => {
      expect(g.getDependentsOf("d")).toEqual(["b", "c"]);
      expect(g.getDependentsOf("a")).toEqual([]);
    });

    it("getOutEdges returns outgoing edge objects", () => {
      const edges = g.getOutEdges("a");
      expect(edges).toHaveLength(2);
      expect(edges.map((e) => e.target)).toEqual(["b", "c"]);
      expect(edges.every((e) => e.source === "a")).toBe(true);
    });

    it("getInEdges returns incoming edge objects", () => {
      const edges = g.getInEdges("d");
      expect(edges).toHaveLength(2);
      expect(edges.map((e) => e.source)).toEqual(["b", "c"]);
    });

    it("getEntryNodes returns nodes with no incoming edges", () => {
      const entries = g.getEntryNodes();
      expect(entries).toEqual(expect.arrayContaining(["a", "e"]));
      expect(entries).not.toContain("b");
      expect(entries).not.toContain("d");
    });

    it("getLeafNodes returns nodes with no outgoing edges", () => {
      const leaves = g.getLeafNodes();
      expect(leaves).toEqual(expect.arrayContaining(["d", "e"]));
      expect(leaves).not.toContain("a");
    });

    it("getOrphanNodes returns nodes with no edges at all", () => {
      expect(g.getOrphanNodes()).toEqual(["e"]);
    });
  });

  describe("incremental updates", () => {
    it("patchNodes updates existing and adds new", () => {
      const g = new DirectedGraph<string, string>();
      g.addNode("a", "old-A");
      g.addNode("b", "old-B");

      g.patchNodes([
        { id: "a", data: "new-A" },
        { id: "c", data: "new-C" },
      ]);

      expect(g.getNode("a")).toBe("new-A");
      expect(g.getNode("b")).toBe("old-B");
      expect(g.getNode("c")).toBe("new-C");
      expect(g.nodeCount).toBe(3);
    });

    it("patchEdges removes and adds edges", () => {
      const g = new DirectedGraph<string, string>();
      g.addNode("a", "A");
      g.addNode("b", "B");
      g.addNode("c", "C");
      g.addEdge("a", "b", "old");

      g.patchEdges(
        [{ source: "a", target: "b" }],
        [{ source: "a", target: "c", data: "new" }]
      );

      expect(g.hasEdge("a", "b")).toBe(false);
      expect(g.hasEdge("a", "c")).toBe(true);
      expect(g.getEdge("a", "c")?.data).toBe("new");
    });

    it("patchEdges skips edges to non-existent nodes", () => {
      const g = new DirectedGraph<string, string>();
      g.addNode("a", "A");

      // Should not throw
      g.patchEdges([], [{ source: "a", target: "missing", data: "x" }]);
      expect(g.edgeCount).toBe(0);
    });
  });

  describe("serialization", () => {
    it("round-trips through JSON", () => {
      const g = new DirectedGraph<string, { weight: number }>();
      g.addNode("a", "A");
      g.addNode("b", "B");
      g.addNode("c", "C");
      g.addEdge("a", "b", { weight: 1 });
      g.addEdge("b", "c", { weight: 2 });

      const json = g.toJSON();
      const g2 = DirectedGraph.fromJSON<string, { weight: number }>(json);

      expect(g2.nodeCount).toBe(3);
      expect(g2.edgeCount).toBe(2);
      expect(g2.getNode("a")).toBe("A");
      expect(g2.getEdge("a", "b")?.data).toEqual({ weight: 1 });
      expect(g2.getDependenciesOf("a")).toEqual(["b"]);
      expect(g2.getDependentsOf("c")).toEqual(["b"]);
    });

    it("serializes empty graph", () => {
      const g = new DirectedGraph<string, string>();
      const json = g.toJSON();
      const g2 = DirectedGraph.fromJSON(json);
      expect(g2.nodeCount).toBe(0);
      expect(g2.edgeCount).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("handles self-loops", () => {
      const g = new DirectedGraph<string, string>();
      g.addNode("a", "A");
      g.addEdge("a", "a", "self");

      expect(g.hasEdge("a", "a")).toBe(true);
      expect(g.getDependenciesOf("a")).toEqual(["a"]);
      expect(g.getDependentsOf("a")).toEqual(["a"]);
    });

    it("handles large graphs efficiently", () => {
      const g = new DirectedGraph<number, number>();
      const N = 1000;

      // Create a chain: 0 → 1 → 2 → ... → N-1
      for (let i = 0; i < N; i++) {
        g.addNode(String(i), i);
      }
      for (let i = 0; i < N - 1; i++) {
        g.addEdge(String(i), String(i + 1), i);
      }

      expect(g.nodeCount).toBe(N);
      expect(g.edgeCount).toBe(N - 1);
      expect(g.getEntryNodes()).toEqual(["0"]);
      expect(g.getLeafNodes()).toEqual([String(N - 1)]);

      // Dependency lookup should be fast
      const deps = g.getDependenciesOf("500");
      expect(deps).toEqual(["501"]);
    });

    it("handles removeNode on node with many edges", () => {
      const g = new DirectedGraph<string, string>();
      g.addNode("hub", "HUB");
      for (let i = 0; i < 50; i++) {
        g.addNode(`n${i}`, `N${i}`);
        g.addEdge(`n${i}`, "hub", `n${i}→hub`);
      }
      expect(g.edgeCount).toBe(50);

      g.removeNode("hub");
      expect(g.edgeCount).toBe(0);
      expect(g.nodeCount).toBe(50);
    });
  });
});
