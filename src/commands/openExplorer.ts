import * as vscode from "vscode";
import { ExplorerPanel } from "../webview/panel";
import { analyzeWorkspace } from "../analysis/analyzer";
import { computeLayout } from "../graph/layout";
import { detectCycles } from "../analysis/cycle-detector";
import { FileWatcher } from "../watch/watcher";
import { StatusBarIndicator } from "../watch/status-bar";
import type { WatcherCallbacks } from "../watch/watcher";

let statusBar: StatusBarIndicator | undefined;

export function openExplorer(context: vscode.ExtensionContext): void {
  const extUri = context.extensionUri;
  const panel = ExplorerPanel.createOrShow(extUri);

  // Create or reuse status bar
  if (!statusBar) {
    statusBar = new StatusBarIndicator();
    context.subscriptions.push(statusBar);
  }

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
  const autoRefresh = config.get<boolean>("autoRefresh", true);

  // Run initial analysis
  statusBar.setScanning();
  panel.getBridge().sendToWebview({
    type: "analysisStatus",
    status: "scanning",
    message: "Analyzing workspace...",
  });

  try {
    const result = analyzeWorkspace({ projectRoot, exclude });
    const nodes = result.graph.getAllNodesData();
    const edges = result.graph.getAllEdgesData();

    statusBar.setAnalyzing();
    panel.getBridge().sendToWebview({ type: "analysisStatus", status: "layout" });

    const positions = computeLayout(nodes, edges, { direction: layoutDir });

    panel.getBridge().sendToWebview({
      type: "graphData",
      nodes,
      edges,
      positions,
    });

    const cycles = detectCycles(result.graph);
    statusBar.setReady(nodes.length, cycles.length);

    // Set up file watcher for live updates
    const callbacks: WatcherCallbacks = {
      onGraphUpdate: (nodes, edges, positions) => {
        panel.getBridge().sendToWebview({ type: "graphUpdate", nodes, edges, positions });
        statusBar?.setReady(nodes.length);
      },
      onStatusChange: (status, message) => {
        panel.getBridge().sendToWebview({ type: "analysisStatus", status, message });
        if (status === "analyzing") statusBar?.setAnalyzing();
        if (status === "error") statusBar?.setError(message ?? "Unknown error");
      },
    };

    const watcher = new FileWatcher({ projectRoot, exclude }, callbacks, layoutDir);
    if (autoRefresh) {
      watcher.start();
    }
    context.subscriptions.push({ dispose: () => watcher.stop() });
  } catch (err) {
    statusBar.setError(String(err));
    panel.getBridge().sendToWebview({
      type: "analysisStatus",
      status: "error",
      message: String(err),
    });
  }
}
