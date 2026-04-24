import { DirectedGraph } from "../graph/graph";

/**
 * Detect cycles in a directed graph using Tarjan's SCC algorithm.
 * Returns an array of cycles, where each cycle is a path of node IDs.
 */
export function detectCycles<N, E>(graph: DirectedGraph<N, E>): string[][] {
  const nodes = [...graph.getNodes().keys()];
  const cycles: string[][] = [];

  // Tarjan's algorithm state
  let index = 0;
  const stack: string[] = [];
  const onStack = new Set<string>();
  const indices = new Map<string, number>();
  const lowLinks = new Map<string, number>();

  function strongConnect(v: string): void {
    indices.set(v, index);
    lowLinks.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);

    for (const w of graph.getDependenciesOf(v)) {
      if (!indices.has(w)) {
        strongConnect(w);
        lowLinks.set(v, Math.min(lowLinks.get(v)!, lowLinks.get(w)!));
      } else if (onStack.has(w)) {
        lowLinks.set(v, Math.min(lowLinks.get(v)!, indices.get(w)!));
      }
    }

    // If v is a root node, pop the SCC
    if (lowLinks.get(v) === indices.get(v)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);

      // SCC with more than 1 node = cycle
      if (scc.length > 1) {
        // Reorder to start from the "entry" of the cycle
        cycles.push(reorderCycle(scc, graph));
      } else if (scc.length === 1) {
        // Self-loop check
        if (graph.hasEdge(v, v)) {
          cycles.push([v, v]);
        }
      }
    }
  }

  for (const node of nodes) {
    if (!indices.has(node)) {
      strongConnect(node);
    }
  }

  return cycles;
}

/**
 * Reorder SCC nodes so the cycle starts from the node that has
 * an incoming edge from outside the SCC (or the first node if none).
 */
function reorderCycle<N, E>(
  scc: string[],
  graph: DirectedGraph<N, E>
): string[] {
  const sccSet = new Set(scc);

  // Find a node in SCC that has an incoming edge from outside the SCC
  for (const node of scc) {
    const dependents = graph.getDependentsOf(node);
    if (dependents.some((d) => !sccSet.has(d))) {
      // Rotate SCC to start from this node
      const idx = scc.indexOf(node);
      return [...scc.slice(idx), ...scc.slice(0, idx), node];
    }
  }

  // No external entry point found — just close the loop
  return [...scc, scc[0]];
}
