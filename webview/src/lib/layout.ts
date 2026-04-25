import type { GraphNodeData, GraphEdgeData, LayoutAlgorithm } from "../../../shared/protocol";

export interface LayoutPosition {
  id: string;
  x: number;
  y: number;
}

/**
 * Client-side layout computation (force-directed and radial).
 * Dagre layout is computed on the extension host side.
 */
export function computeClientLayout(
  nodes: GraphNodeData[],
  edges: GraphEdgeData[],
  algorithm: LayoutAlgorithm,
  spacing = 100
): Map<string, LayoutPosition> {
  if (nodes.length === 0) return new Map();

  switch (algorithm) {
    case "force":
      return computeForceLayout(nodes, edges, spacing);
    case "radial":
      return computeRadialLayout(nodes, edges, spacing);
    default:
      return new Map();
  }
}

function computeForceLayout(
  nodes: GraphNodeData[],
  edges: GraphEdgeData[],
  spacing: number
): Map<string, LayoutPosition> {
  const iterations = 150;
  const idealLength = spacing;
  const repulsion = idealLength * idealLength * 2;
  const attraction = 0.01;
  const damping = 0.9;
  const epsilon = 0.001;

  const positions = new Map<string, { x: number; y: number; vx: number; vy: number }>();
  const radius = idealLength * Math.sqrt(nodes.length);

  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    positions.set(node.id, {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
      vx: 0,
      vy: 0,
    });
  });

  for (let iter = 0; iter < iterations; iter++) {
    const temperature = 1 - iter / iterations;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = positions.get(nodes[i].id)!;
        const b = positions.get(nodes[j].id)!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || epsilon;
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force * temperature;
        const fy = (dy / dist) * force * temperature;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }

    for (const edge of edges) {
      const a = positions.get(edge.source);
      const b = positions.get(edge.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || epsilon;
      const force = (dist - idealLength) * attraction * temperature;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    for (const node of nodes) {
      const p = positions.get(node.id)!;
      p.vx *= damping;
      p.vy *= damping;
      p.x += p.vx;
      p.y += p.vy;
    }
  }

  const result = new Map<string, LayoutPosition>();
  for (const node of nodes) {
    const p = positions.get(node.id)!;
    result.set(node.id, { id: node.id, x: p.x, y: p.y });
  }
  return result;
}

function computeRadialLayout(
  nodes: GraphNodeData[],
  edges: GraphEdgeData[],
  spacing: number
): Map<string, LayoutPosition> {
  const children = new Map<string, string[]>();
  const nodeSet = new Set(nodes.map((n) => n.id));
  for (const node of nodes) {
    children.set(node.id, []);
  }
  for (const edge of edges) {
    if (nodeSet.has(edge.source) && nodeSet.has(edge.target)) {
      children.get(edge.source)?.push(edge.target);
    }
  }

  const hasIncoming = new Set(edges.map((e) => e.target));
  const entries = nodes.filter((n) => !hasIncoming.has(n.id));
  const roots = entries.length > 0 ? entries.map((e) => e.id) : [nodes[0].id];

  const ring = new Map<string, number>();
  const queue = [...roots];
  const visited = new Set<string>();
  for (const r of roots) {
    ring.set(r, 0);
    visited.add(r);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentRing = ring.get(current) ?? 0;
    for (const child of children.get(current) ?? []) {
      if (!visited.has(child)) {
        visited.add(child);
        ring.set(child, currentRing + 1);
        queue.push(child);
      }
    }
  }

  let maxRing = 0;
  for (const r of ring.values()) {
    if (r > maxRing) maxRing = r;
  }
  for (const node of nodes) {
    if (!ring.has(node.id)) {
      maxRing++;
      ring.set(node.id, maxRing);
    }
  }

  const ringGroups = new Map<number, string[]>();
  for (const [id, r] of ring) {
    if (!ringGroups.has(r)) ringGroups.set(r, []);
    ringGroups.get(r)!.push(id);
  }

  const positions = new Map<string, LayoutPosition>();
  for (const [r, ids] of ringGroups) {
    const r2 = r * spacing;
    const angleStep = (2 * Math.PI) / ids.length;
    for (let i = 0; i < ids.length; i++) {
      const angle = angleStep * i;
      positions.set(ids[i], { id: ids[i], x: r2 * Math.cos(angle), y: r2 * Math.sin(angle) });
    }
  }

  return positions;
}
