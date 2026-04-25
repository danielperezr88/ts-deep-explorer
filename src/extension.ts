import * as vscode from "vscode";
import { openExplorer } from "./commands/openExplorer";
import { analyzeFile } from "./commands/analyzeFile";
import { showCycles } from "./commands/showCycles";
import { exportGraph } from "./commands/exportGraph";

export function activate(context: vscode.ExtensionContext): void {
  console.log("TS Deep Explorer activated");

  context.subscriptions.push(
    vscode.commands.registerCommand("tsDeepExplorer.openExplorer", () =>
      openExplorer(context)
    ),
    vscode.commands.registerCommand("tsDeepExplorer.analyzeFile", () =>
      analyzeFile()
    ),
    vscode.commands.registerCommand("tsDeepExplorer.showCycles", () =>
      showCycles(context)
    ),
    vscode.commands.registerCommand("tsDeepExplorer.exportGraph", () =>
      exportGraph()
    )
  );
}

export function deactivate(): void {
  console.log("TS Deep Explorer deactivated");
}
