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
import { DependencyEdge } from "./edges/DependencyEdge";
import { DocPanel } from "./panels/DocPanel";
import { FilterPanel, DEFAULT_FILTER, type FilterState } from "./panels/FilterPanel";
import { useExtensionHost } from "../hooks/useExtensionHost";
import { postMessageToHost } from "../lib/vscode-api";
import type { GraphNodeData, ModuleClassification } from "../../../shared/protocol";

const nodeTypes: NodeTypes = {
  module: ModuleNode,
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

  const flowNodes: Node[] = useMemo(() => {
    return state.nodes.map((n) => {
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
  }, [state.nodes, state.positions, filter]);

  const matchedNodeIds = useMemo(() => {
    return new Set(
      state.nodes.filter((n) => matchesFilter(n, filter)).map((n) => n.id)
    );
  }, [state.nodes, filter]);

  const flowEdges: Edge[] = useMemo(() => {
    return state.edges.map((e) => ({
      id: `${e.source}-${e.target}`,
      type: "dependency",
      source: e.source,
      target: e.target,
      data: { importType: e.importType, symbols: e.symbols },
      style: {
        opacity: matchedNodeIds.has(e.source) && matchedNodeIds.has(e.target) ? 1 : 0.1,
      },
    }));
  }, [state.edges, matchedNodeIds]);

  const handleNodeClick: OnNodeClick = useCallback((_event, node) => {
    setSelectedNode(node.data as unknown as GraphNodeData);
  }, []);

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
