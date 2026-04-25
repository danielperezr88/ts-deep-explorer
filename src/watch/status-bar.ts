import * as vscode from "vscode";

export class StatusBarIndicator {
  private readonly statusItem: vscode.StatusBarItem;

  constructor() {
    this.statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
    this.statusItem.command = "tsDeepExplorer.openExplorer";
    this.statusItem.text = "$(graph) TS Deep";
    this.statusItem.tooltip = "TS Deep Explorer — click to open";
    this.statusItem.show();
  }

  setScanning(): void {
    this.statusItem.text = "$(loading~spin) TS Deep: Scanning...";
    this.statusItem.tooltip = "TS Deep Explorer is scanning workspace";
  }

  setAnalyzing(): void {
    this.statusItem.text = "$(loading~spin) TS Deep: Analyzing...";
    this.statusItem.tooltip = "TS Deep Explorer is analyzing dependencies";
  }

  setReady(moduleCount: number, cycleCount?: number): void {
    const cycleText = cycleCount && cycleCount > 0 ? ` (${cycleCount} cycles)` : "";
    this.statusItem.text = `$(graph) TS Deep: ${moduleCount} modules${cycleText}`;
    this.statusItem.tooltip = `TS Deep Explorer — ${moduleCount} modules analyzed${cycleText}. Click to open.`;
  }

  setError(message: string): void {
    this.statusItem.text = "$(error) TS Deep: Error";
    this.statusItem.tooltip = `TS Deep Explorer error: ${message}`;
  }

  dispose(): void {
    this.statusItem.dispose();
  }
}
