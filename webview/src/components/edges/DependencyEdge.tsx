import React, { memo } from "react";
import { BaseEdge, type EdgeProps } from "@xyflow/react";

function getEdgeStyle(importType: string): { strokeDasharray?: string; strokeWidth: number; style?: string } {
  switch (importType) {
    case "type-only":
      return { strokeDasharray: "5 5", strokeWidth: 1 };
    case "re-export":
      return { strokeWidth: 3 };
    case "dynamic":
      return { strokeDasharray: "8 4", strokeWidth: 1.5 };
    case "static":
    default:
      return { strokeWidth: 1.5 };
  }
}

function DependencyEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  ...rest
}: EdgeProps) {
  const importType = (data as any)?.importType ?? "static";
  const edgeStyle = getEdgeStyle(importType);

  return (
    <BaseEdge
      id={id}
      path={`M ${sourceX},${sourceY} L ${targetX},${targetY}`}
      style={{
        strokeDasharray: edgeStyle.strokeDasharray,
        strokeWidth: edgeStyle.strokeWidth,
        stroke: "var(--vscode-editor-foreground, #555)",
      }}
      {...rest}
    />
  );
}

export const DependencyEdge = memo(DependencyEdgeComponent);
