import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRegisterCommand } = vi.hoisted(() => ({
  mockRegisterCommand: vi.fn((_cmd: string, _handler: () => void) => ({ dispose: vi.fn() })),
}));

vi.mock("vscode", () => ({
  commands: {
    registerCommand: mockRegisterCommand,
  },
  window: {
    showInformationMessage: vi.fn(),
  },
}));

vi.mock("./commands/openExplorer", () => ({
  openExplorer: vi.fn(),
}));
vi.mock("./commands/analyzeFile", () => ({
  analyzeFile: vi.fn(),
}));
vi.mock("./commands/showCycles", () => ({
  showCycles: vi.fn(),
}));
vi.mock("./commands/exportGraph", () => ({
  exportGraph: vi.fn(),
}));

import { activate, deactivate } from "./extension";

describe("extension scaffold", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("activates and registers all commands", () => {
    const mockSubscriptions: unknown[] = [];
    const mockContext = {
      subscriptions: mockSubscriptions,
    } as unknown as Parameters<typeof activate>[0];

    activate(mockContext);

    // Check that 4 commands were registered in this activation call
    const callsInThisActivation = mockRegisterCommand.mock.calls.slice(-4);
    expect(callsInThisActivation).toHaveLength(4);

    const commandIds = callsInThisActivation.map((c) => c[0]);
    expect(commandIds).toContain("tsDeepExplorer.openExplorer");
    expect(commandIds).toContain("tsDeepExplorer.analyzeFile");
    expect(commandIds).toContain("tsDeepExplorer.showCycles");
    expect(commandIds).toContain("tsDeepExplorer.exportGraph");
  });

  it("deactivate is a no-op function", () => {
    expect(typeof deactivate).toBe("function");
    expect(deactivate).not.toThrow();
  });
});
