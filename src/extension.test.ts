import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the vscode module before any imports that use it
const mockSubscriptions: unknown[] = [];

vi.mock("vscode", () => ({
  commands: {
    registerCommand: vi.fn((_cmd: string, _handler: () => void) => {
      const disposable = { dispose: vi.fn() };
      mockSubscriptions.push(disposable);
      return disposable;
    }),
  },
  window: {
    showInformationMessage: vi.fn(),
  },
}));

describe("extension scaffold", () => {
  beforeEach(() => {
    mockSubscriptions.length = 0;
  });

  it("activates and registers commands", async () => {
    const { activate } = await import("./extension");
    const mockContext = {
      subscriptions: mockSubscriptions,
    } as unknown as Parameters<typeof activate>[0];

    activate(mockContext);
    expect(mockSubscriptions.length).toBeGreaterThan(0);
  });

  it("deactivate is a no-op function", async () => {
    const { deactivate } = await import("./extension");
    expect(typeof deactivate).toBe("function");
    expect(deactivate).not.toThrow();
  });
});
