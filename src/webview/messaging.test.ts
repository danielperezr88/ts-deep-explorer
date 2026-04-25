import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock vscode before importing anything that uses it
vi.mock("vscode", () => {
  const postMessage = vi.fn();
  const onDidReceiveMessage = vi.fn((_handler) => ({
    dispose: vi.fn(),
  }));

  return {
    window: {
      createWebviewPanel: vi.fn(() => ({
        webview: { postMessage, onDidReceiveMessage, asWebviewUri: vi.fn() },
        onDidDispose: vi.fn((_cb, _ctx, disposables) => {
          disposables.push({ dispose: vi.fn() });
        }),
        reveal: vi.fn(),
        dispose: vi.fn(),
        iconPath: undefined,
      })),
    },
    Uri: {
      joinPath: vi.fn(() => ({ toString: () => "mock-uri" })),
    },
    ViewColumn: { Two: 2 },
    Disposable: class {},
  };
});

import { MessageBridge } from "./messaging";

describe("MessageBridge", () => {
  let bridge: MessageBridge;
  let mockPanel: { webview: { postMessage: ReturnType<typeof vi.fn>; onDidReceiveMessage: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPanel = {
      webview: {
        postMessage: vi.fn(),
        onDidReceiveMessage: vi.fn(() => ({ dispose: vi.fn() })),
      },
    };
    bridge = new MessageBridge(mockPanel as any);
  });

  it("sendToWebview calls postMessage with the message", () => {
    const message = {
      type: "analysisStatus" as const,
      status: "ready" as const,
    };
    bridge.sendToWebview(message);
    expect(mockPanel.webview.postMessage).toHaveBeenCalledWith(message);
  });

  it("onWebviewMessage registers a handler and returns a disposable", () => {
    const handler = vi.fn();
    const disposable = bridge.onWebviewMessage(handler);
    expect(mockPanel.webview.onDidReceiveMessage).toHaveBeenCalled();
    expect(disposable).toBeDefined();
    expect(disposable.dispose).toBeDefined();
  });

  it("handler validates message has type field", () => {
    let capturedCallback: (data: unknown) => void = () => {};
    mockPanel.webview.onDidReceiveMessage.mockImplementation((cb) => {
      capturedCallback = cb;
      return { dispose: vi.fn() };
    });

    const handler = vi.fn();
    bridge.onWebviewMessage(handler);

    // Valid message
    capturedCallback({ type: "ready" });
    expect(handler).toHaveBeenCalledWith({ type: "ready" });

    handler.mockClear();

    // Invalid message (no type)
    capturedCallback({ foo: "bar" });
    expect(handler).not.toHaveBeenCalled();
  });
});
