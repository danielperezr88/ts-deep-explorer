import * as vscode from "vscode";
import { analyzeWorkspace } from "../analysis/analyzer";

export async function exportGraph(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("No workspace folder found");
    return;
  }

  const format = await vscode.window.showQuickPick(
    ["JSON", "Mermaid", "PNG", "SVG"] as const,
    { placeHolder: "Select export format" }
  );

  if (!format) return;

  const projectRoot = workspaceFolders[0].uri.fsPath;
  const config = vscode.workspace.getConfiguration("tsDeepExplorer");
  const exclude = config.get<string[]>("exclude", []);

  try {
    const result = analyzeWorkspace({ projectRoot, exclude });
    const nodes = result.graph.getAllNodesData();
    const edges = result.graph.getAllEdgesData();

    switch (format) {
      case "JSON":
        await exportAsJson(nodes, edges);
        break;
      case "Mermaid":
        await exportAsMermaid(nodes, edges);
        break;
      case "PNG":
      case "SVG":
        vscode.window.showInformationMessage(
          `${format} export requires the graph to be rendered in the webview. Open the explorer and use the export button there.`
        );
        break;
    }
  } catch (err) {
    vscode.window.showErrorMessage(`Export failed: ${err}`);
  }
}

async function exportAsJson(
  nodes: import("../../shared/protocol").GraphNodeData[],
  edges: import("../../shared/protocol").GraphEdgeData[]
): Promise<void> {
  const data = JSON.stringify({ nodes, edges }, null, 2);
  const doc = await vscode.workspace.openTextDocument({
    content: data,
    language: "json",
  });
  await vscode.window.showTextDocument(doc);
}

async function exportAsMermaid(
  nodes: import("../../shared/protocol").GraphNodeData[],
  edges: import("../../shared/protocol").GraphEdgeData[]
): Promise<void> {
  const lines: string[] = ["graph LR"];
  for (const node of nodes) {
    lines.push(`  ${safeMermaidId(node.id)}["${node.moduleName}"]`);
  }
  for (const edge of edges) {
    const arrow = edge.importType === "type-only" ? "-.->" : "-->";
    lines.push(`  ${safeMermaidId(edge.source)} ${arrow} ${safeMermaidId(edge.target)}`);
  }

  const doc = await vscode.workspace.openTextDocument({
    content: lines.join("\n"),
    language: "markdown",
  });
  await vscode.window.showTextDocument(doc);
}

function safeMermaidId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "_");
}
