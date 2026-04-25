import * as vscode from "vscode";
import { MessageBridge } from "./messaging";
import type { WebviewToHostMessage } from "../../shared/protocol";

let currentPanel: ExplorerPanel | undefined;

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

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
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
