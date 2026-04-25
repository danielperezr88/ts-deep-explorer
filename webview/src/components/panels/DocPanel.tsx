import React from "react";
import type { GraphNodeData, GraphEdgeData, ExportedSymbol } from "../../../../shared/protocol";

interface DocPanelProps {
  node: GraphNodeData | null;
  edges: GraphEdgeData[];
  allNodes: GraphNodeData[];
  onClose: () => void;
  onNavigate: (filePath: string, symbolName?: string) => void;
}

const KIND_ICONS: Record<string, string> = {
  function: "ƒ",
  class: "C",
  interface: "I",
  type: "T",
  const: "c",
  enum: "E",
};

export function DocPanel({ node, edges, allNodes, onClose, onNavigate }: DocPanelProps) {
  if (!node) return null;

  const dependsOn = edges
    .filter((e) => e.source === node.id)
    .map((e) => ({
      ...e,
      targetNode: allNodes.find((n) => n.id === e.target),
    }));

  const usedBy = edges
    .filter((e) => e.target === node.id)
    .map((e) => ({
      ...e,
      sourceNode: allNodes.find((n) => n.id === e.source),
    }));

  return (
    <div
      className="doc-panel"
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: "360px",
        height: "100%",
        background: "var(--vscode-sideBar-background, #252526)",
        borderLeft: "1px solid var(--vscode-editorWidget-border, #444)",
        overflowY: "auto",
        padding: "16px",
        fontFamily: "var(--vscode-editor-font-family, monospace)",
        fontSize: "13px",
        color: "var(--vscode-editor-foreground, #ccc)",
        zIndex: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h3 style={{ margin: 0, fontSize: "15px", color: "var(--vscode-editor-foreground, #ccc)" }}>
          {node.moduleName}
        </h3>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--vscode-descriptionForeground, #888)",
            cursor: "pointer",
            fontSize: "16px",
            padding: "2px 6px",
          }}
        >
          x
        </button>
      </div>

      <div style={{ marginBottom: "12px", color: "var(--vscode-descriptionForeground, #888)", fontSize: "11px" }}>
        {node.relativePath}
      </div>

      <div style={{ marginBottom: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <span
          style={{
            padding: "2px 8px",
            borderRadius: "3px",
            background: "var(--vscode-badge-background, #4d4d4d)",
            color: "var(--vscode-badge-foreground, #fff)",
            fontSize: "10px",
            textTransform: "uppercase",
          }}
        >
          {node.classification}
        </span>
        <span style={{ fontSize: "10px", color: "var(--vscode-descriptionForeground, #888)" }}>
          {node.lineCount} lines
        </span>
      </div>

      {node.deprecated && (
        <div
          style={{
            marginBottom: "12px",
            padding: "8px",
            background: "rgba(244, 67, 54, 0.1)",
            border: "1px solid rgba(244, 67, 54, 0.3)",
            borderRadius: "4px",
            color: "#f44336",
            fontSize: "12px",
          }}
        >
          Deprecated{node.deprecationMessage ? `: ${node.deprecationMessage}` : ""}
        </div>
      )}

      {node.moduleDoc && (
        <div style={{ marginBottom: "16px" }}>
          <h4 style={{ fontSize: "12px", color: "var(--vscode-descriptionForeground, #888)", marginBottom: "6px" }}>
            Documentation
          </h4>
          <div
            style={{
              whiteSpace: "pre-wrap",
              lineHeight: "1.5",
              fontSize: "12px",
            }}
          >
            {node.moduleDoc}
          </div>
        </div>
      )}

      {node.exports.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <h4 style={{ fontSize: "12px", color: "var(--vscode-descriptionForeground, #888)", marginBottom: "6px" }}>
            Exports ({node.exports.length})
          </h4>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {node.exports.map((exp) => (
                <ExportRow key={exp.name} exp={exp} onNavigate={onNavigate} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dependsOn.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <h4 style={{ fontSize: "12px", color: "var(--vscode-descriptionForeground, #888)", marginBottom: "6px" }}>
            Depends on ({dependsOn.length})
          </h4>
          {dependsOn.map((dep) => (
            <div
              key={`${dep.source}-${dep.target}`}
              style={{ marginBottom: "4px" }}
            >
              <span
                style={{ cursor: "pointer", color: "var(--vscode-textLink-foreground, #3794ff)" }}
                onClick={() => dep.targetNode && onNavigate(dep.targetNode.relativePath)}
              >
                {dep.targetNode?.moduleName ?? dep.target}
              </span>
              <span style={{ color: "var(--vscode-descriptionForeground, #888)", fontSize: "10px", marginLeft: "6px" }}>
                {dep.importType}
                {dep.symbols.length > 0 && `: ${dep.symbols.join(", ")}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {usedBy.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <h4 style={{ fontSize: "12px", color: "var(--vscode-descriptionForeground, #888)", marginBottom: "6px" }}>
            Used by ({usedBy.length})
          </h4>
          {usedBy.map((dep) => (
            <div
              key={`${dep.source}-${dep.target}`}
              style={{ marginBottom: "4px" }}
            >
              <span
                style={{ cursor: "pointer", color: "var(--vscode-textLink-foreground, #3794ff)" }}
                onClick={() => dep.sourceNode && onNavigate(dep.sourceNode.relativePath)}
              >
                {dep.sourceNode?.moduleName ?? dep.source}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExportRow({
  exp,
  onNavigate,
}: {
  exp: ExportedSymbol;
  onNavigate: (filePath: string, symbolName?: string) => void;
}) {
  return (
    <tr style={{ borderBottom: "1px solid var(--vscode-editorWidget-border, #333)" }}>
      <td style={{ padding: "4px 8px 4px 0", verticalAlign: "top" }}>
        <span
          style={{
            display: "inline-block",
            width: "16px",
            height: "16px",
            lineHeight: "16px",
            textAlign: "center",
            borderRadius: "3px",
            background: "var(--vscode-badge-background, #4d4d4d)",
            color: "var(--vscode-badge-foreground, #fff)",
            fontSize: "10px",
            fontWeight: "bold",
          }}
        >
          {KIND_ICONS[exp.kind] ?? "?"}
        </span>
      </td>
      <td style={{ padding: "4px 0" }}>
        <div style={{ fontWeight: exp.deprecated ? "normal" : "bold", textDecoration: exp.deprecated ? "line-through" : "none" }}>
          {exp.name}
        </div>
        {exp.signature && (
          <div style={{ color: "var(--vscode-descriptionForeground, #888)", fontSize: "11px", fontFamily: "monospace" }}>
            {exp.signature}
          </div>
        )}
        {exp.doc && (
          <div style={{ color: "var(--vscode-descriptionForeground, #888)", fontSize: "11px", marginTop: "2px" }}>
            {exp.doc}
          </div>
        )}
        {exp.deprecated && (
          <div style={{ color: "#f44336", fontSize: "10px", marginTop: "2px" }}>
            deprecated{exp.deprecationMessage ? `: ${exp.deprecationMessage}` : ""}
          </div>
        )}
        {exp.usedBy.length > 0 && (
          <div style={{ fontSize: "10px", color: "var(--vscode-descriptionForeground, #888)", marginTop: "2px" }}>
            used by: {exp.usedBy.join(", ")}
          </div>
        )}
      </td>
    </tr>
  );
}
