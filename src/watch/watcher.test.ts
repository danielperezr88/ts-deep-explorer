import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockOnDidSaveTextDocument, mockDispose } = vi.hoisted(() => {
  const mockOnDidSaveTextDocument = vi.fn();
  const mockDispose = vi.fn();
  return { mockOnDidSaveTextDocument, mockDispose };
});

vi.mock("vscode", () => ({
  workspace: {
    onDidSaveTextDocument: mockOnDidSaveTextDocument.mockReturnValue({ dispose: mockDispose }),
  },
}));

vi.mock("../analysis/analyzer", () => ({
  analyzeWorkspace: vi.fn(() => ({
    graph: {
      getAllNodesData: () => [
        {
          id: "src/index",
          relativePath: "src/index.ts",
          moduleName: "index",
          directory: "src",
          classification: "entry",
          lineCount: 10,
          exports: [],
          moduleDoc: null,
          deprecated: false,
        },
      ],
      getAllEdgesData: () => [],
    },
    program: {},
    nodeCount: 1,
    edgeCount: 0,
    errors: [],
  })),
}));

vi.mock("../graph/layout", () => ({
  computeLayout: vi.fn(() => [
    { id: "src/index", x: 0, y: 0 },
  ]),
}));

import { FileWatcher, type WatcherCallbacks } from "./watcher";
import type { AnalysisOptions } from "../analysis/analyzer";

describe("FileWatcher", () => {
  let watcher: FileWatcher;
  let callbacks: WatcherCallbacks;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    callbacks = {
      onGraphUpdate: vi.fn(),
      onStatusChange: vi.fn(),
    };

    const options: AnalysisOptions = {
      projectRoot: "/test/project",
    };

    watcher = new FileWatcher(options, callbacks, "LR", 300);
  });

  afterEach(() => {
    watcher.stop();
    vi.useRealTimers();
  });

  it("registers onDidSaveTextDocument listener on start", () => {
    watcher.start();
    expect(mockOnDidSaveTextDocument).toHaveBeenCalled();
  });

  it("does not register duplicate listeners on double start", () => {
    watcher.start();
    watcher.start();
    expect(mockOnDidSaveTextDocument).toHaveBeenCalledTimes(1);
  });

  it("ignores non-TypeScript files", () => {
    watcher.start();

    const handler = mockOnDidSaveTextDocument.mock.calls[0][0];
    handler({ uri: { fsPath: "/test/style.css" } });

    vi.advanceTimersByTime(500);
    expect(callbacks.onStatusChange).not.toHaveBeenCalled();
  });

  it("triggers reanalysis for .ts files after debounce", () => {
    watcher.start();

    const handler = mockOnDidSaveTextDocument.mock.calls[0][0];
    handler({ uri: { fsPath: "/test/src/index.ts" } });

    // Before debounce fires
    expect(callbacks.onStatusChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(callbacks.onStatusChange).toHaveBeenCalledWith("analyzing", expect.any(String));
    expect(callbacks.onGraphUpdate).toHaveBeenCalled();
    expect(callbacks.onStatusChange).toHaveBeenCalledWith("ready");
  });

  it("triggers reanalysis for .tsx files after debounce", () => {
    watcher.start();

    const handler = mockOnDidSaveTextDocument.mock.calls[0][0];
    handler({ uri: { fsPath: "/test/src/App.tsx" } });

    vi.advanceTimersByTime(300);

    expect(callbacks.onGraphUpdate).toHaveBeenCalled();
  });

  it("debounces rapid saves", () => {
    watcher.start();

    const handler = mockOnDidSaveTextDocument.mock.calls[0][0];

    // Rapid saves
    handler({ uri: { fsPath: "/test/src/a.ts" } });
    vi.advanceTimersByTime(100);
    handler({ uri: { fsPath: "/test/src/b.ts" } });
    vi.advanceTimersByTime(100);
    handler({ uri: { fsPath: "/test/src/c.ts" } });
    vi.advanceTimersByTime(300);

    // Only one reanalysis
    expect(callbacks.onGraphUpdate).toHaveBeenCalledTimes(1);
  });

  it("stops listening on stop()", () => {
    watcher.start();
    watcher.stop();

    expect(mockDispose).toHaveBeenCalled();
  });

  it("clears debounce timer on stop()", () => {
    watcher.start();

    const handler = mockOnDidSaveTextDocument.mock.calls[0][0];
    handler({ uri: { fsPath: "/test/src/a.ts" } });

    watcher.stop();
    vi.advanceTimersByTime(500);

    expect(callbacks.onGraphUpdate).not.toHaveBeenCalled();
  });

  it("sends status updates in correct order", () => {
    watcher.start();

    const handler = mockOnDidSaveTextDocument.mock.calls[0][0];
    handler({ uri: { fsPath: "/test/src/a.ts" } });

    vi.advanceTimersByTime(300);

    const statuses = (callbacks.onStatusChange as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: unknown[]) => c[0]
    );
    expect(statuses).toEqual(["analyzing", "layout", "ready"]);
  });
});
