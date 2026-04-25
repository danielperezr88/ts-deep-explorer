import * as vscode from "vscode";
import { ExplorerPanel } from "../webview/panel";
import { analyzeWorkspace } from "../analysis/analyzer";
import { computeLayout } from "../graph/layout";
import { FileWatcher } from "../watch/watcher";
import type { WatcherCallbacks } from "../watch/watcher";

export function openExplorer(context: vscode.ExtensionContext): void {
  const extUri = context.extensionUri;
  const panel = ExplorerPanel.createOrShow(extUri);

  // Get workspace root
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("No workspace folder found");
    return;
  }

  const projectRoot = workspaceFolders[0].uri.fsPath;
  const config = vscode.workspace.getConfiguration("tsDeepExplorer");
  const exclude = config.get<string[]>("exclude", []);
  const layoutDir = config.get<"TB" | "LR">("layout", "LR");

  // Run initial analysis
  panel.getBridge().sendToWebview({
    type: "analysisStatus",
    status: "scanning",
    message: "Analyzing workspace...",
  });

  try {
    const result = analyzeWorkspace({ projectRoot, exclude });
    const nodes = result.graph.getAllNodesData();
    const edges = result.graph.getAllEdgesData();

    panel.getBridge().sendToWebview({ type: "analysisStatus", status: "layout" });

    const positions = computeLayout(nodes, edges, { direction: layoutDir });

    panel.getBridge().sendToWebview({
      type: "graphData",
      nodes,
      edges,
      positions,
    });

    // Set up file watcher for live updates
    const callbacks: WatcherCallbacks = {
      onGraphUpdate: (nodes, edges, positions) => {
        panel.getBridge().sendToWebview({ type: "graphUpdate", nodes, edges, positions });
      },
      onStatusChange: (status, message) => {
        panel.getBridge().sendToWebview({ type: "analysisStatus", status, message });
      },
    };

    const watcher = new FileWatcher({ projectRoot, exclude }, callbacks, layoutDir);
    watcher.start();
    context.subscriptions.push({ dispose: () => watcher.stop() });
  } catch (err) {
    panel.getBridge().sendToWebview({
      type: "analysisStatus",
      status: "error",
      message: String(err),
    });
  }
}
