import type { GraphNodeData, GraphEdgeData } from "../../../shared/protocol";

/**
 * Generate Mermaid flowchart syntax from graph data.
 */
export function toMermaid(nodes: GraphNodeData[], edges: GraphEdgeData[]): string {
  const lines: string[] = ["graph LR"];

  for (const node of nodes) {
    const id = safeId(node.id);
    const label = node.moduleName.replace(/"/g, "'");
    const classLabel = node.classification;
    lines.push(`  ${id}["${label}<br/><small>${classLabel}</small>"]`);
  }

  for (const edge of edges) {
    const source = safeId(edge.source);
    const target = safeId(edge.target);
    const arrow = edge.importType === "type-only" ? "-.->" : "-->";
    const label = edge.symbols.length > 0 ? `|${edge.symbols.join(", ")}|` : "";
    lines.push(`  ${source} ${arrow} ${label} ${target}`);
  }

  // Styling
  lines.push("");
  const colorMap: Record<string, string> = {
    entry: "#4fc3f7",
    leaf: "#81c784",
    barrel: "#ffb74d",
    core: "#e57373",
    utility: "#ba68c8",
    test: "#90a4ae",
  };

  for (const node of nodes) {
    const color = colorMap[node.classification] || "#999";
    lines.push(`  style ${safeId(node.id)} stroke:${color},stroke-width:2px`);
  }

  return lines.join("\n");
}

/**
 * Export graph as JSON.
 */
export function toJSON(nodes: GraphNodeData[], edges: GraphEdgeData[]): string {
  return JSON.stringify({ nodes, edges }, null, 2);
}

function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_");
}
