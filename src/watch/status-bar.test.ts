import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockStatusBarItem, mockCreateStatusBarItem } = vi.hoisted(() => {
  const mockStatusBarItem = {
    text: "",
    tooltip: "",
    command: "",
    show: vi.fn(),
    dispose: vi.fn(),
  };
  const mockCreateStatusBarItem = vi.fn(() => mockStatusBarItem);
  return { mockStatusBarItem, mockCreateStatusBarItem };
});

vi.mock("vscode", () => ({
  window: {
    createStatusBarItem: mockCreateStatusBarItem,
  },
  StatusBarAlignment: { Left: 1 },
}));

import { StatusBarIndicator } from "./status-bar";

describe("StatusBarIndicator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates status bar item on construction", () => {
    new StatusBarIndicator();
    expect(mockCreateStatusBarItem).toHaveBeenCalledWith(1, 50);
    expect(mockStatusBarItem.show).toHaveBeenCalled();
    expect(mockStatusBarItem.command).toBe("tsDeepExplorer.openExplorer");
  });

  it("sets scanning state", () => {
    const bar = new StatusBarIndicator();
    bar.setScanning();
    expect(mockStatusBarItem.text).toContain("Scanning");
  });

  it("sets analyzing state", () => {
    const bar = new StatusBarIndicator();
    bar.setAnalyzing();
    expect(mockStatusBarItem.text).toContain("Analyzing");
  });

  it("sets ready state with module count", () => {
    const bar = new StatusBarIndicator();
    bar.setReady(42);
    expect(mockStatusBarItem.text).toContain("42 modules");
  });

  it("sets ready state with cycle count", () => {
    const bar = new StatusBarIndicator();
    bar.setReady(42, 3);
    expect(mockStatusBarItem.text).toContain("3 cycles");
  });

  it("sets error state", () => {
    const bar = new StatusBarIndicator();
    bar.setError("Something failed");
    expect(mockStatusBarItem.text).toContain("Error");
  });

  it("disposes the status bar item", () => {
    const bar = new StatusBarIndicator();
    bar.dispose();
    expect(mockStatusBarItem.dispose).toHaveBeenCalled();
  });
});
