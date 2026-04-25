import * as vscode from "vscode";
import { MessageBridge } from "./messaging";
import type { WebviewToHostMessage } from "../../shared/protocol";

export class ExplorerPanel {
  public static currentPanel: ExplorerPanel | undefined;
  public static readonly viewType = "tsDeepExplorer";

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private readonly bridge: MessageBridge;
  private disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri): ExplorerPanel {
    if (ExplorerPanel.currentPanel) {
      ExplorerPanel.currentPanel.panel.reveal();
      return ExplorerPanel.currentPanel;
    }

    ExplorerPanel.currentPanel = new ExplorerPanel(extensionUri);
    return ExplorerPanel.currentPanel;
  }

  private constructor(extensionUri: vscode.Uri) {
    this.extensionUri = extensionUri;

    this.panel = vscode.window.createWebviewPanel(
      ExplorerPanel.viewType,
      "TS Deep Explorer",
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, "out", "webview"),
        ],
      }
    );

    this.bridge = new MessageBridge(this.panel);

    this.panel.iconPath = vscode.Uri.joinPath(
      extensionUri,
      "resources",
      "icon.svg"
    );

    this.panel.webview.html = this.getHtmlForWebview();

    this.registerDefaultHandlers();
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  /**
   * Register default message handlers for navigation and other built-in actions.
   */
  private registerDefaultHandlers(): void {
    this.onMessage((message: WebviewToHostMessage) => {
      switch (message.type) {
        case "navigateTo":
          this.handleNavigateTo(message.filePath, message.symbolName);
          break;
        case "requestCycles":
          // Will be wired up when cycle detection is integrated
          break;
        case "exportGraph":
          // Will be wired up when export is integrated
          break;
        case "ready":
          // Webview is ready — handled by the analysis orchestrator
          break;
      }
    });
  }

  /**
   * Handle navigateTo message from webview: open file in editor.
   */
  private async handleNavigateTo(filePath: string, _symbolName?: string): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) return;

    const rootUri = workspaceFolders[0].uri;
    const fileUri = vscode.Uri.joinPath(rootUri, filePath);

    try {
      const doc = await vscode.workspace.openTextDocument(fileUri);
      await vscode.window.showTextDocument(doc, {
        viewColumn: vscode.ViewColumn.One,
        preserveFocus: false,
      });
    } catch {
      vscode.window.showErrorMessage(`Could not open ${filePath}`);
    }
  }

  /**
   * Get the message bridge for communicating with the webview.
   */
  getBridge(): MessageBridge {
    return this.bridge;
  }

  /**
   * Register a handler for messages from the webview.
   */
  onMessage(handler: (message: WebviewToHostMessage) => void): void {
    const disposable = this.bridge.onWebviewMessage(handler);
    this.disposables.push(disposable);
  }

  /**
   * Update the webview HTML (e.g., after rebuilding the webview frontend).
   */
  refresh(): void {
    this.panel.webview.html = this.getHtmlForWebview();
  }

  private getHtmlForWebview(): string {
    const nonce = getNonce();
    const webviewUri = this.panel.webview
      .asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "out", "webview", "index.js"))
      .toString();

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
    script-src 'nonce-${nonce}';
    style-src 'unsafe-inline';
    img-src 'self' data:;
    connect-src 'self';">
  <title>TS Deep Explorer</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${webviewUri}"></script>
</body>
</html>`;
  }

  private dispose(): void {
    ExplorerPanel.currentPanel = undefined;
    this.panel.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }
}

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
