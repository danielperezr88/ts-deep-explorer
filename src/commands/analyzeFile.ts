import * as vscode from "vscode";
import { analyzeWorkspace } from "../analysis/analyzer";

export function analyzeFile(): void {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active file");
    return;
  }

  const filePath = editor.document.uri.fsPath;
  if (!filePath.endsWith(".ts") && !filePath.endsWith(".tsx")) {
    vscode.window.showErrorMessage("Active file is not a TypeScript file");
    return;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("No workspace folder found");
    return;
  }

  const projectRoot = workspaceFolders[0].uri.fsPath;
  const config = vscode.workspace.getConfiguration("tsDeepExplorer");
  const exclude = config.get<string[]>("exclude", []);

  try {
    const result = analyzeWorkspace({ projectRoot, exclude });
    const relativePath = filePath.replace(projectRoot + "/", "").replace(projectRoot + "\\", "");

    const node = result.graph.getNode(relativePath.replace(/\.ts$/, "").replace(/\.tsx$/, ""));

    if (node) {
      const deps = result.graph.getDependenciesOf(node.id);
      const dependents = result.graph.getDependentsOf(node.id);
      vscode.window.showInformationMessage(
        `${relativePath}: ${deps.length} dependencies, ${dependents.length} dependents`
      );
    } else {
      vscode.window.showInformationMessage(`${relativePath}: not found in dependency graph`);
    }
  } catch (err) {
    vscode.window.showErrorMessage(`Analysis failed: ${err}`);
  }
}
