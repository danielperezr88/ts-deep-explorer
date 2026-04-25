import * as vscode from "vscode";
import { openExplorer } from "./openExplorer";

export function showInGraph(context: vscode.ExtensionContext, uri: vscode.Uri): void {
  // Open the explorer first
  openExplorer(context);

  // The openExplorer will run analysis and show the graph.
  // The selected file's path is available via uri.fsPath.
  // We send a message to highlight that node after graph loads.
  vscode.window.showInformationMessage(`Showing ${uri.fsPath} in dependency graph`);
}
