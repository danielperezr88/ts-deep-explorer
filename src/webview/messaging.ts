import * as vscode from "vscode";
import type { HostToWebviewMessage, WebviewToHostMessage } from "../../shared/protocol";

export type WebviewMessageHandler = (message: WebviewToHostMessage) => void;

/**
 * Typed message bridge between extension host and webview.
 */
export class MessageBridge {
  constructor(
    private readonly panel: vscode.WebviewPanel
  ) {}

  /**
   * Send a typed message to the webview.
   */
  sendToWebview(message: HostToWebviewMessage): void {
    this.panel.webview.postMessage(message);
  }

  /**
   * Register a handler for messages from the webview.
   */
  onWebviewMessage(handler: WebviewMessageHandler): vscode.Disposable {
    return this.panel.webview.onDidReceiveMessage((data: unknown) => {
      const message = data as WebviewToHostMessage;
      // Basic validation
      if (message && typeof message === "object" && "type" in message) {
        handler(message);
      }
    });
  }
}
