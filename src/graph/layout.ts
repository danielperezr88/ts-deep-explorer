import dagre from "@dagrejs/dagre";
import type { GraphNodeData, GraphEdgeData } from "../../shared/protocol";

export type LayoutDirection = "TB" | "LR";

export interface LayoutOptions {
  direction?: LayoutDirection;
  nodeWidth?: number;
  nodeHeight?: number;
  rankSpacing?: number;
  nodeSpacing?: number;
}

export interface LayoutPosition {
  id: string;
  x: number;
  y: number;
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  direction: "LR",
  nodeWidth: 200,
  nodeHeight: 80,
  rankSpacing: 100,
  nodeSpacing: 50,
};

/**
 * Compute a hierarchical layout using dagre.
 * Returns positions keyed by node ID.
 */
export function computeLayout(
  nodes: GraphNodeData[],
  edges: GraphEdgeData[],
  options?: LayoutOptions
): LayoutPosition[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: opts.direction,
    ranksep: opts.rankSpacing,
    nodesep: opts.nodeSpacing,
  });

  for (const node of nodes) {
    g.setNode(node.id, { width: opts.nodeWidth, height: opts.nodeHeight });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      id: node.id,
      x: pos.x - opts.nodeWidth / 2,
      y: pos.y - opts.nodeHeight / 2,
    };
  });
}
