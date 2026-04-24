import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext): void {
  console.log("TS Deep Explorer activated");

  const helloCmd = vscode.commands.registerCommand(
    "tsDeepExplorer.helloWorld",
    () => {
      vscode.window.showInformationMessage("TS Deep Explorer says hello!");
    }
  );

  context.subscriptions.push(helloCmd);
}

export function deactivate(): void {
  console.log("TS Deep Explorer deactivated");
}
