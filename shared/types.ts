export interface ModuleNodeData {
  id: string;
  relativePath: string;
  moduleName: string;
  directory: string;
  classification: "entry" | "leaf" | "barrel" | "core" | "utility" | "test";
  lineCount: number;
  exports: ExportedSymbol[];
  moduleDoc: string | null;
  deprecated: boolean;
  deprecationMessage?: string;
}

export interface DependencyEdgeData {
  source: string;
  target: string;
  importType: "static" | "dynamic" | "type-only" | "re-export";
  symbols: string[];
}

export interface ExportedSymbol {
  name: string;
  kind: "function" | "class" | "interface" | "type" | "const" | "enum";
  doc: string | null;
  deprecated: boolean;
  signature: string;
  usedBy: string[];
}

export interface AnalysisResult {
  nodes: ModuleNodeData[];
  edges: DependencyEdgeData[];
  cycles: string[][];
}
