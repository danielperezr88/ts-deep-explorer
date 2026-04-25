import { describe, it, expect } from "vitest";
import type {
  HostToWebviewMessage,
  WebviewToHostMessage,
  GraphNodeData,
  GraphEdgeData,
  ExportedSymbol,
} from "../shared/protocol";

describe("Protocol types", () => {
  it("HostToWebviewMessage covers all message types", () => {
    const messages: HostToWebviewMessage[] = [
      {
        type: "graphData",
        nodes: [],
        edges: [],
        positions: [],
      },
      {
        type: "graphUpdate",
        nodes: [],
        edges: [],
        positions: [],
      },
      {
        type: "analysisStatus",
        status: "scanning",
      },
      {
        type: "analysisStatus",
        status: "analyzing",
        message: "Processing imports...",
      },
      {
        type: "analysisStatus",
        status: "layout",
      },
      {
        type: "analysisStatus",
        status: "ready",
      },
      {
        type: "analysisStatus",
        status: "error",
        message: "Failed to create TS program",
      },
      {
        type: "cycles",
        cycles: [["a", "b", "c", "a"]],
      },
    ];
    expect(messages).toHaveLength(8);
    expect(messages.every((m) => "type" in m)).toBe(true);
  });

  it("WebviewToHostMessage covers all message types", () => {
    const messages: WebviewToHostMessage[] = [
      { type: "navigateTo", filePath: "src/index.ts" },
      { type: "navigateTo", filePath: "src/util.ts", symbolName: "helper" },
      { type: "requestCycles" },
      { type: "exportGraph", format: "png" },
      { type: "exportGraph", format: "svg" },
      { type: "exportGraph", format: "mermaid" },
      { type: "exportGraph", format: "json" },
      { type: "ready" },
    ];
    expect(messages).toHaveLength(8);
    expect(messages.every((m) => "type" in m)).toBe(true);
  });

  it("GraphNodeData has all required fields", () => {
    const node: GraphNodeData = {
      id: "src/index",
      relativePath: "src/index.ts",
      moduleName: "index",
      directory: "src",
      classification: "entry",
      lineCount: 42,
      exports: [],
      moduleDoc: null,
      deprecated: false,
    };
    expect(node.id).toBe("src/index");
    expect(node.classification).toBe("entry");
    expect(node.deprecated).toBe(false);
  });

  it("GraphEdgeData has all required fields", () => {
    const edge: GraphEdgeData = {
      source: "src/index",
      target: "src/util",
      importType: "static",
      symbols: ["helper", "Config"],
    };
    expect(edge.importType).toBe("static");
    expect(edge.symbols).toHaveLength(2);
  });

  it("ExportedSymbol has all required fields including deprecationMessage", () => {
    const symbol: ExportedSymbol = {
      name: "oldFunction",
      kind: "function",
      doc: "Use newFunction instead",
      deprecated: true,
      deprecationMessage: "Will be removed in v2",
      signature: "function oldFunction(): void",
      usedBy: ["src/index.ts"],
    };
    expect(symbol.deprecated).toBe(true);
    expect(symbol.deprecationMessage).toBe("Will be removed in v2");
    expect(symbol.usedBy).toContain("src/index.ts");
  });
});
