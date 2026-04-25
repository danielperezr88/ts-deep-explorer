export type ImportType = "static" | "dynamic" | "type-only" | "re-export";

export type ModuleClassification =
  | "entry"
  | "leaf"
  | "barrel"
  | "core"
  | "utility"
  | "test";

export interface GraphNodeData {
  id: string;
  relativePath: string;
  moduleName: string;
  directory: string;
  classification: ModuleClassification;
  lineCount: number;
  exports: ExportedSymbol[];
  moduleDoc: string | null;
  deprecated: boolean;
  deprecationMessage?: string;
}

export interface GraphEdgeData {
  source: string;
  target: string;
  importType: ImportType;
  symbols: string[];
}

export interface ExportedSymbol {
  name: string;
  kind: "function" | "class" | "interface" | "type" | "const" | "enum";
  doc: string | null;
  deprecated: boolean;
  deprecationMessage?: string;
  signature: string;
  usedBy: string[];
}

export interface LayoutPosition {
  x: number;
  y: number;
}

// === Message Protocol ===

export type HostToWebviewMessage =
  | {
      type: "graphData";
      nodes: GraphNodeData[];
      edges: GraphEdgeData[];
      positions: Array<{ id: string; x: number; y: number }>;
    }
  | {
      type: "graphUpdate";
      nodes: GraphNodeData[];
      edges: GraphEdgeData[];
      positions: Array<{ id: string; x: number; y: number }>;
    }
  | {
      type: "analysisStatus";
      status: "scanning" | "analyzing" | "layout" | "ready" | "error";
      message?: string;
    }
  | {
      type: "cycles";
      cycles: string[][];
    };

export type LayoutAlgorithm = "dagre" | "force" | "radial";

export type WebviewToHostMessage =
  | { type: "navigateTo"; filePath: string; symbolName?: string }
  | { type: "requestCycles" }
  | { type: "exportGraph"; format: "png" | "svg" | "mermaid" | "json" }
  | { type: "changeLayout"; algorithm: LayoutAlgorithm }
  | { type: "ready" };
