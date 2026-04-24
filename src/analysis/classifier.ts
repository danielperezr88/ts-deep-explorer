import type { DirectedGraph } from "../graph/graph";
import type { ModuleNodeData, DependencyEdgeData } from "../../shared/types";

export type ModuleClassification =
  | "entry"
  | "leaf"
  | "barrel"
  | "core"
  | "utility"
  | "test";

/** Minimum re-export count for a file to be classified as a barrel. */
const BARREL_THRESHOLD = 3;

/** Glob patterns that indicate test files. */
const TEST_PATTERNS = [
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /__tests__/,
  /(^|[/\\])test[/\\]/,
  /(^|[/\\])tests[/\\]/,
];

/**
 * Classify a single module based on its graph position and metadata.
 */
export function classifyModule(
  nodeId: string,
  graph: DirectedGraph<ModuleNodeData, DependencyEdgeData>
): ModuleClassification {
  // Test detection (by path pattern)
  if (TEST_PATTERNS.some((p) => p.test(nodeId))) {
    return "test";
  }

  const outDegree = graph.getDependenciesOf(nodeId).length;
  const inDegree = graph.getDependentsOf(nodeId).length;

  // Barrel: many re-exports, usually an index file
  const outEdges = graph.getOutEdges(nodeId);
  const reExportCount = outEdges.filter(
    (e) => e.data.importType === "re-export"
  ).length;
  if (reExportCount >= BARREL_THRESHOLD) {
    return "barrel";
  }

  // Entry: no incoming edges (nothing depends on this)
  if (inDegree === 0 && outDegree > 0) {
    return "entry";
  }

  // Leaf: no outgoing edges (doesn't depend on anything)
  if (outDegree === 0 && inDegree > 0) {
    return "utility";
  }

  // Isolated: no edges at all — classify as utility if small, core otherwise
  if (outDegree === 0 && inDegree === 0) {
    const node = graph.getNode(nodeId);
    return node && node.lineCount < 50 ? "utility" : "core";
  }

  // Core: well-connected (both incoming and outgoing)
  return "core";
}

/**
 * Classify all modules in a graph, updating their classification field.
 * Returns the updated graph (mutates in place).
 */
export function classifyAllModules(
  graph: DirectedGraph<ModuleNodeData, DependencyEdgeData>
): void {
  for (const [nodeId, data] of graph.getNodes().entries()) {
    const classification = classifyModule(nodeId, graph);
    graph.updateNode(nodeId, { ...data, classification });
  }
}
