import * as vscode from "vscode";
import { analyzeWorkspace } from "../analysis/analyzer";
import { detectCycles } from "../analysis/cycle-detector";
import { ExplorerPanel } from "../webview/panel";

export function showCycles(context: vscode.ExtensionContext): void {
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
    const cycles = detectCycles(result.graph);

    if (cycles.length === 0) {
      vscode.window.showInformationMessage("No circular dependencies found!");
      return;
    }

    vscode.window.showInformationMessage(
      `Found ${cycles.length} circular ${cycles.length === 1 ? "dependency" : "dependencies"}`
    );

    // Send cycles to webview if panel is open
    const panel = ExplorerPanel.currentPanel;
    if (panel) {
      panel.getBridge().sendToWebview({ type: "cycles", cycles });
    }
  } catch (err) {
    vscode.window.showErrorMessage(`Cycle detection failed: ${err}`);
  }
}
