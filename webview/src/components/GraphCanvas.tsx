import React, { useMemo, useState, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type OnNodeClick,
  type OnNodeDoubleClick,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ModuleNode } from "./nodes/ModuleNode";
import { GroupNode, type GroupNodeData } from "./nodes/GroupNode";
import { DependencyEdge } from "./edges/DependencyEdge";
import { DocPanel } from "./panels/DocPanel";
import { FilterPanel, DEFAULT_FILTER, type FilterState } from "./panels/FilterPanel";
import { useExtensionHost } from "../hooks/useExtensionHost";
import { postMessageToHost } from "../lib/vscode-api";
import { toMermaid, toJSON } from "../lib/export-utils";
import type { GraphNodeData, ModuleClassification } from "../../../shared/protocol";

const nodeTypes: NodeTypes = {
  module: ModuleNode,
  group: GroupNode,
};

const edgeTypes: EdgeTypes = {
  dependency: DependencyEdge,
};

function matchesFilter(node: GraphNodeData, filter: FilterState): boolean {
  if (!filter.enabledClassifications.has(node.classification as ModuleClassification)) {
    return false;
  }
  if (filter.searchQuery) {
    const q = filter.searchQuery.toLowerCase();
    return (
      node.moduleName.toLowerCase().includes(q) ||
      node.relativePath.toLowerCase().includes(q) ||
      node.exports.some((e) => e.name.toLowerCase().includes(q))
    );
  }
  return true;
}

export function GraphCanvas() {
  const state = useExtensionHost();
  const [selectedNode, setSelectedNode] = useState<GraphNodeData | null>(null);
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [collapsedDirs, setCollapsedDirs] = useState<Set<string>>(new Set());
  const [showCycles, setShowCycles] = useState(false);

  // Compute cycle edge set for highlighting
  const cycleEdgeKeys = useMemo(() => {
    if (!showCycles || state.cycles.length === 0) return new Set<string>();
    const keys = new Set<string>();
    for (const cycle of state.cycles) {
      for (let i = 0; i < cycle.length - 1; i++) {
        keys.add(`${cycle[i]}->${cycle[i + 1]}`);
      }
    }
    return keys;
  }, [showCycles, state.cycles]);

  const toggleDirectory = useCallback((dir: string) => {
    setCollapsedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dir)) {
        next.delete(dir);
      } else {
        next.add(dir);
      }
      return next;
    });
  }, []);

  const flowNodes: Node[] = useMemo(() => {
    // Group nodes by directory for collapsed directories
    const collapsedNodeIds = new Set<string>();
    const groupNodes: Node[] = [];

    // Find which directories are collapsed and collect their node IDs
    for (const dir of collapsedDirs) {
      const dirNodes = state.nodes.filter((n) => n.directory === dir);
      if (dirNodes.length === 0) continue;

      dirNodes.forEach((n) => collapsedNodeIds.add(n.id));

      const classCounts: Record<string, number> = {};
      let totalExports = 0;
      let sumX = 0;
      let sumY = 0;

      for (const n of dirNodes) {
        classCounts[n.classification] = (classCounts[n.classification] || 0) + 1;
        totalExports += n.exports.length;
        const pos = state.positions.get(n.id);
        if (pos) {
          sumX += pos.x;
          sumY += pos.y;
        }
      }

      const match = dirNodes.some((n) => matchesFilter(n, filter));

      groupNodes.push({
        id: `group:${dir}`,
        type: "group",
        position: { x: sumX / dirNodes.length, y: sumY / dirNodes.length },
        data: {
          directory: dir,
          moduleCount: dirNodes.length,
          classificationCounts: classCounts,
          totalExports,
          isCollapsed: true,
        } as GroupNodeData,
        style: { opacity: match ? 1 : 0.15 },
      });
    }

    // Individual nodes (not collapsed)
    const individualNodes = state.nodes
      .filter((n) => !collapsedNodeIds.has(n.id))
      .map((n) => {
        const pos = state.positions.get(n.id);
        const match = matchesFilter(n, filter);
        return {
          id: n.id,
          type: "module",
          position: pos ? { x: pos.x, y: pos.y } : { x: 0, y: 0 },
          data: n,
          style: { opacity: match ? 1 : 0.15 },
        };
      });

    return [...individualNodes, ...groupNodes];
  }, [state.nodes, state.positions, filter, collapsedDirs]);

  const matchedNodeIds = useMemo(() => {
    return new Set(
      state.nodes.filter((n) => matchesFilter(n, filter)).map((n) => n.id)
    );
  }, [state.nodes, filter]);

  const flowEdges: Edge[] = useMemo(() => {
    // Map node IDs to their collapsed group ID if applicable
    const nodeToGroup = new Map<string, string>();
    for (const dir of collapsedDirs) {
      const groupId = `group:${dir}`;
      for (const n of state.nodes) {
        if (n.directory === dir) {
          nodeToGroup.set(n.id, groupId);
        }
      }
    }

    const edgeMap = new Map<string, { source: string; target: string; importType: string; symbols: string[] }>();

    for (const e of state.edges) {
      const sourceId = nodeToGroup.get(e.source) ?? e.source;
      const targetId = nodeToGroup.get(e.target) ?? e.target;

      // Skip self-edges (both endpoints collapsed into same group)
      if (sourceId === targetId) continue;

      // Deduplicate edges between same source/target
      const key = `${sourceId}->${targetId}`;
      const existing = edgeMap.get(key);
      if (!existing) {
        edgeMap.set(key, { source: sourceId, target: targetId, importType: e.importType, symbols: [...e.symbols] });
      } else {
        // Merge symbols
        for (const s of e.symbols) {
          if (!existing.symbols.includes(s)) existing.symbols.push(s);
        }
      }
    }

    return Array.from(edgeMap.entries()).map(([key, e]) => {
      // Check if any original edge in this aggregated edge is part of a cycle
      const isCycleEdge = cycleEdgeKeys.size > 0 && state.edges.some(
        (se) => {
          const mappedSource = nodeToGroup.get(se.source) ?? se.source;
          const mappedTarget = nodeToGroup.get(se.target) ?? se.target;
          return mappedSource === e.source && mappedTarget === e.target &&
            (cycleEdgeKeys.has(`${se.source}->${se.target}`));
        }
      );

      return {
        id: key,
        type: "dependency",
        source: e.source,
        target: e.target,
        data: { importType: e.importType, symbols: e.symbols },
        style: {
          opacity: matchedNodeIds.has(state.edges.find((se) =>
            (nodeToGroup.get(se.source) ?? se.source) === e.source ||
            (nodeToGroup.get(se.target) ?? se.target) === e.target
          )?.source ?? "") ? 1 : 0.5,
          stroke: isCycleEdge ? "#f44336" : undefined,
          strokeWidth: isCycleEdge ? 3 : undefined,
        },
        animated: isCycleEdge,
      };
    });
  }, [state.edges, matchedNodeIds, collapsedDirs, state.nodes]);

  const handleNodeClick: OnNodeClick = useCallback((_event, node) => {
    // If clicking a group node, toggle its collapsed state
    if (node.type === "group") {
      const groupData = node.data as unknown as GroupNodeData;
      toggleDirectory(groupData.directory);
      return;
    }
    setSelectedNode(node.data as unknown as GraphNodeData);
  }, [toggleDirectory]);

  const handleNodeDoubleClick: OnNodeDoubleClick = useCallback((_event, node) => {
    const data = node.data as unknown as GraphNodeData;
    postMessageToHost({ type: "navigateTo", filePath: data.relativePath });
  }, []);

  const handleNavigate = useCallback((filePath: string, symbolName?: string) => {
    postMessageToHost({ type: "navigateTo", filePath, symbolName });
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <FilterPanel filter={filter} onFilterChange={setFilter} />
      {state.cycles.length > 0 && (
        <button
          onClick={() => setShowCycles(!showCycles)}
          style={{
            position: "absolute",
            top: "8px",
            left: "280px",
            zIndex: 5,
            background: showCycles
              ? "rgba(244, 67, 54, 0.2)"
              : "var(--vscode-editor-background, #1e1e1e)",
            border: showCycles
              ? "1px solid rgba(244, 67, 54, 0.5)"
              : "1px solid var(--vscode-editorWidget-border, #444)",
            color: showCycles ? "#f44336" : "var(--vscode-editor-foreground, #ccc)",
            padding: "4px 8px",
            borderRadius: "3px",
            cursor: "pointer",
            fontSize: "11px",
            fontFamily: "var(--vscode-editor-font-family, monospace)",
          }}
        >
          {showCycles ? "Hide Cycles" : `${state.cycles.length} Cycle${state.cycles.length !== 1 ? "s" : ""}`}
        </button>
      )}
      {state.nodes.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: state.nodes.length > 0 && selectedNode ? "376px" : "8px",
            zIndex: 5,
            display: "flex",
            gap: "4px",
          }}
        >
          <button
            onClick={() => {
              const mermaid = toMermaid(state.nodes, state.edges);
              postMessageToHost({ type: "exportGraph", format: "mermaid" });
              navigator.clipboard.writeText(mermaid);
            }}
            style={{
              background: "var(--vscode-editor-background, #1e1e1e)",
              border: "1px solid var(--vscode-editorWidget-border, #444)",
              color: "var(--vscode-editor-foreground, #ccc)",
              padding: "4px 8px",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "11px",
              fontFamily: "var(--vscode-editor-font-family, monospace)",
            }}
          >
            Mermaid
          </button>
          <button
            onClick={() => {
              const json = toJSON(state.nodes, state.edges);
              postMessageToHost({ type: "exportGraph", format: "json" });
              navigator.clipboard.writeText(json);
            }}
            style={{
              background: "var(--vscode-editor-background, #1e1e1e)",
              border: "1px solid var(--vscode-editorWidget-border, #444)",
              color: "var(--vscode-editor-foreground, #ccc)",
              padding: "4px 8px",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "11px",
              fontFamily: "var(--vscode-editor-font-family, monospace)",
            }}
          >
            JSON
          </button>
        </div>
      )}
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{ animated: false }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--vscode-editorIndentGuide-background, #333)" />
        <Controls
          style={{
            background: "var(--vscode-editor-background, #1e1e1e)",
            borderColor: "var(--vscode-editorWidget-border, #444)",
          }}
        />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as any;
            const colors: Record<string, string> = {
              entry: "#4fc3f7",
              leaf: "#81c784",
              barrel: "#ffb74d",
              core: "#e57373",
              utility: "#ba68c8",
              test: "#90a4ae",
            };
            return colors[data?.classification] || "#999";
          }}
          maskColor="rgba(0, 0, 0, 0.5)"
          style={{
            background: "var(--vscode-editor-background, #1e1e1e)",
            borderColor: "var(--vscode-editorWidget-border, #444)",
          }}
        />
      </ReactFlow>
      {state.status !== "ready" && state.status !== "waiting" && (
        <div
          className="status-overlay"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "var(--vscode-descriptionForeground, #888)",
            fontSize: "14px",
            fontFamily: "var(--vscode-editor-font-family, monospace)",
            pointerEvents: "none",
          }}
        >
          {state.statusMessage ? `${state.status}: ${state.statusMessage}` : `${state.status}...`}
        </div>
      )}
      {state.status === "waiting" && (
        <div
          className="status-overlay"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "var(--vscode-descriptionForeground, #888)",
            fontSize: "14px",
            fontFamily: "var(--vscode-editor-font-family, monospace)",
            pointerEvents: "none",
          }}
        >
          Connecting to extension host...
        </div>
      )}
      <DocPanel
        node={selectedNode}
        edges={state.edges}
        allNodes={state.nodes}
        onClose={() => setSelectedNode(null)}
        onNavigate={handleNavigate}
      />
    </div>
  );
}
