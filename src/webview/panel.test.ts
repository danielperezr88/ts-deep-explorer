import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPostMessage, mockOnDidReceiveMessage, mockPanelDispose, mockReveal, mockCreateWebviewPanel } =
  vi.hoisted(() => {
    const mockPostMessage = vi.fn();
    const mockOnDidReceiveMessage = vi.fn(() => ({ dispose: vi.fn() }));
    const mockPanelDispose = vi.fn();
    const mockReveal = vi.fn();
    const mockCreateWebviewPanel = vi.fn(() => ({
      webview: {
        postMessage: mockPostMessage,
        onDidReceiveMessage: mockOnDidReceiveMessage,
        asWebviewUri: vi.fn((uri: object) => uri),
      },
      onDidDispose: vi.fn((_cb: () => void, _ctx: unknown, _ds: unknown[]) => {}),
      reveal: mockReveal,
      dispose: mockPanelDispose,
      iconPath: undefined,
    }));
    return { mockPostMessage, mockOnDidReceiveMessage, mockPanelDispose, mockReveal, mockCreateWebviewPanel };
  });

vi.mock("vscode", () => ({
  window: {
    createWebviewPanel: mockCreateWebviewPanel,
  },
  Uri: {
    joinPath: vi.fn((..._args: unknown[]) => ({ toString: () => "mock-uri" })),
  },
  ViewColumn: { Two: 2 },
  Disposable: class {},
}));

import { ExplorerPanel } from "./panel";

describe("ExplorerPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ExplorerPanel.currentPanel = undefined;
  });

  it("createOrShow creates a new panel", () => {
    const extUri = { toString: () => "ext" } as any;
    const panel = ExplorerPanel.createOrShow(extUri);

    expect(panel).toBeDefined();
    expect(ExplorerPanel.currentPanel).toBe(panel);
  });

  it("createOrShow reuses existing panel (calls reveal)", () => {
    const extUri = { toString: () => "ext" } as any;
    const panel1 = ExplorerPanel.createOrShow(extUri);
    const panel2 = ExplorerPanel.createOrShow(extUri);

    expect(panel2).toBe(panel1);
    expect(mockReveal).toHaveBeenCalled();
  });

  it("generates HTML with CSP nonce", () => {
    const extUri = { toString: () => "ext" } as any;
    ExplorerPanel.createOrShow(extUri);

    expect(mockCreateWebviewPanel).toHaveBeenCalledWith(
      "tsDeepExplorer",
      "TS Deep Explorer",
      2,
      expect.objectContaining({ enableScripts: true })
    );
  });

  it("getBridge returns a MessageBridge", () => {
    const extUri = { toString: () => "ext" } as any;
    const panel = ExplorerPanel.createOrShow(extUri);
    const bridge = panel.getBridge();
    expect(bridge).toBeDefined();
    expect(typeof bridge.sendToWebview).toBe("function");
  });

  it("onMessage registers handler via bridge", () => {
    const extUri = { toString: () => "ext" } as any;
    const panel = ExplorerPanel.createOrShow(extUri);
    const handler = vi.fn();
    panel.onMessage(handler);
    expect(mockOnDidReceiveMessage).toHaveBeenCalled();
  });
});
