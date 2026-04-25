import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { GraphNodeData } from "../../../../shared/protocol";

const CLASSIFICATION_COLORS: Record<string, string> = {
  entry: "#4fc3f7",
  leaf: "#81c784",
  barrel: "#ffb74d",
  core: "#e57373",
  utility: "#ba68c8",
  test: "#90a4ae",
};

function ModuleNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as GraphNodeData;
  const color = CLASSIFICATION_COLORS[nodeData.classification] || "#999";
  const isDeprecated = nodeData.deprecated;

  return (
    <div
      className="module-node"
      style={{
        background: "var(--vscode-editor-background, #1e1e1e)",
        border: `2px solid ${color}`,
        borderRadius: "6px",
        padding: "8px 12px",
        minWidth: "160px",
        maxWidth: "240px",
        fontFamily: "var(--vscode-editor-font-family, monospace)",
        fontSize: "12px",
        opacity: isDeprecated ? 0.6 : 1,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color }} />
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
        <span
          style={{
            display: "inline-block",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: color,
          }}
        />
        <strong style={{ color: "var(--vscode-editor-foreground, #ccc)", fontSize: "13px" }}>
          {nodeData.moduleName}
        </strong>
      </div>
      <div style={{ color: "var(--vscode-descriptionForeground, #888)", fontSize: "10px" }}>
        {nodeData.relativePath}
      </div>
      {nodeData.exports.length > 0 && (
        <div style={{ marginTop: "4px", fontSize: "10px", color: "var(--vscode-descriptionForeground, #888)" }}>
          {nodeData.exports.slice(0, 3).map((e) => e.name).join(", ")}
          {nodeData.exports.length > 3 && ` +${nodeData.exports.length - 3}`}
        </div>
      )}
      <div
        style={{
          marginTop: "4px",
          fontSize: "9px",
          color: "var(--vscode-descriptionForeground, #888)",
          textTransform: "uppercase",
        }}
      >
        {nodeData.classification} · {nodeData.lineCount}L
      </div>
      {isDeprecated && (
        <div style={{ color: "#f44336", fontSize: "9px", marginTop: "2px" }}>
          deprecated
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </div>
  );
}

export const ModuleNode = memo(ModuleNodeComponent);
