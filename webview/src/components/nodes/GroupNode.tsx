import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export interface GroupNodeData {
  directory: string;
  moduleCount: number;
  classificationCounts: Record<string, number>;
  totalExports: number;
  isCollapsed: boolean;
}

const CLASSIFICATION_COLORS: Record<string, string> = {
  entry: "#4fc3f7",
  leaf: "#81c784",
  barrel: "#ffb74d",
  core: "#e57373",
  utility: "#ba68c8",
  test: "#90a4ae",
};

function GroupNodeComponent({ data }: NodeProps) {
  const groupData = data as unknown as GroupNodeData;

  const topClassification = Object.entries(groupData.classificationCounts || {}).sort(
    ([, a], [, b]) => b - a
  )[0];

  const color = topClassification ? CLASSIFICATION_COLORS[topClassification[0]] || "#999" : "#999";

  return (
    <div
      className="group-node"
      style={{
        background: "var(--vscode-editor-background, #1e1e1e)",
        border: `2px dashed ${color}`,
        borderRadius: "8px",
        padding: "10px 14px",
        minWidth: "120px",
        fontFamily: "var(--vscode-editor-font-family, monospace)",
        fontSize: "12px",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color }} />
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
        <span
          style={{
            display: "inline-block",
            width: "10px",
            height: "10px",
            borderRadius: "2px",
            background: color,
          }}
        />
        <strong style={{ color: "var(--vscode-editor-foreground, #ccc)", fontSize: "13px" }}>
          {groupData.directory || "(root)"}
        </strong>
      </div>
      <div style={{ color: "var(--vscode-descriptionForeground, #888)", fontSize: "10px" }}>
        {groupData.moduleCount} module{groupData.moduleCount !== 1 ? "s" : ""}
        {groupData.totalExports > 0 && ` · ${groupData.totalExports} exports`}
      </div>
      {topClassification && (
        <div style={{ marginTop: "2px", fontSize: "9px", color: "var(--vscode-descriptionForeground, #888)" }}>
          mostly {topClassification[0]}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </div>
  );
}

export const GroupNode = memo(GroupNodeComponent);
