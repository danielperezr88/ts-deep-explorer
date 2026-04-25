import * as vscode from "vscode";
import { analyzeWorkspace, type AnalysisOptions } from "../analysis/analyzer";
import { computeLayout, type LayoutDirection } from "../graph/layout";

export interface WatcherCallbacks {
  onGraphUpdate: (
    nodes: import("../../shared/protocol").GraphNodeData[],
    edges: import("../../shared/protocol").GraphEdgeData[],
    positions: Array<{ id: string; x: number; y: number }>
  ) => void;
  onStatusChange: (status: "scanning" | "analyzing" | "layout" | "ready" | "error", message?: string) => void;
}

export class FileWatcher {
  private disposable: vscode.Disposable | undefined;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly debounceMs: number;
  private readonly options: AnalysisOptions;
  private readonly callbacks: WatcherCallbacks;
  private readonly layoutDirection: LayoutDirection;

  constructor(
    options: AnalysisOptions,
    callbacks: WatcherCallbacks,
    layoutDirection: LayoutDirection = "LR",
    debounceMs = 300
  ) {
    this.options = options;
    this.callbacks = callbacks;
    this.layoutDirection = layoutDirection;
    this.debounceMs = debounceMs;
  }

  start(): void {
    if (this.disposable) return;

    this.disposable = vscode.workspace.onDidSaveTextDocument((doc) => {
      if (!this.isTypeScriptFile(doc.uri.fsPath)) return;
      this.scheduleReanalysis(doc.uri.fsPath);
    });
  }

  stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
    if (this.disposable) {
      this.disposable.dispose();
      this.disposable = undefined;
    }
  }

  private isTypeScriptFile(filePath: string): boolean {
    return filePath.endsWith(".ts") || filePath.endsWith(".tsx");
  }

  private scheduleReanalysis(_changedFilePath: string): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.reanalyze();
    }, this.debounceMs);
  }

  private reanalyze(): void {
    try {
      this.callbacks.onStatusChange("analyzing", "File changed, re-analyzing...");

      const result = analyzeWorkspace(this.options);
      const nodes = result.graph.getAllNodesData();
      const edges = result.graph.getAllEdgesData();

      this.callbacks.onStatusChange("layout");

      const positions = computeLayout(nodes, edges, {
        direction: this.layoutDirection,
      });

      this.callbacks.onGraphUpdate(nodes, edges, positions);
      this.callbacks.onStatusChange("ready");
    } catch (err) {
      this.callbacks.onStatusChange("error", String(err));
    }
  }
}
