import * as ts from "typescript";
import * as path from "path";
import { DirectedGraph } from "../graph/graph";
import type { ModuleNodeData, DependencyEdgeData } from "../../shared/types";
import { readTsConfig, createTsProgram } from "./tsconfig-reader";
import { extractImports, type ImportType } from "./import-extractor";

export interface AnalysisOptions {
  /** Root directory of the project to analyze */
  projectRoot: string;
  /** Glob patterns to exclude */
  exclude?: string[];
}

export interface AnalysisResult {
  graph: DirectedGraph<ModuleNodeData, DependencyEdgeData>;
  program: ts.Program;
  nodeCount: number;
  edgeCount: number;
  errors: ts.Diagnostic[];
}

/**
 * Analyze a TypeScript workspace: create program, extract imports,
 * build dependency graph with metadata.
 */
export function analyzeWorkspace(options: AnalysisOptions): AnalysisResult {
  const { projectRoot } = options;

  // 1. Read tsconfig
  const { compilerOptions, fileNames, errors: configErrors } =
    readTsConfig(projectRoot);

  if (fileNames.length === 0) {
    const emptyGraph = new DirectedGraph<ModuleNodeData, DependencyEdgeData>();
    return {
      graph: emptyGraph,
      program: ts.createProgram([], compilerOptions),
      nodeCount: 0,
      edgeCount: 0,
      errors: configErrors,
    };
  }

  // 2. Create TS program
  const program = createTsProgram(fileNames, compilerOptions);

  // 3. Build graph
  const graph = new DirectedGraph<ModuleNodeData, DependencyEdgeData>();

  // Add nodes for each source file
  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.fileName.endsWith(".d.ts")) continue;
    if (sourceFile.fileName.includes("node_modules")) continue;

    const relativePath = path.relative(projectRoot, sourceFile.fileName);
    const moduleName = path.basename(sourceFile.fileName, path.extname(sourceFile.fileName));
    const directory = path.dirname(relativePath);
    const lineCount = sourceFile.getLineAndCharacterOfPosition(
      sourceFile.text.length
    ).line + 1;

    graph.addNode(sourceFile.fileName, {
      id: sourceFile.fileName,
      relativePath,
      moduleName,
      directory,
      classification: "core", // default, will be refined by classifier
      lineCount,
      exports: [],
      moduleDoc: null,
      deprecated: false,
    });
  }

  // Add edges from imports
  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.fileName.endsWith(".d.ts")) continue;
    if (sourceFile.fileName.includes("node_modules")) continue;

    const imports = extractImports(sourceFile, program);

    for (const imp of imports) {
      // Only add edges for imports that resolve to project files
      if (!graph.hasNode(imp.resolvedPath)) continue;

      const existingEdge = graph.getEdge(sourceFile.fileName, imp.resolvedPath);
      if (existingEdge) {
        // Merge symbols into existing edge
        const mergedSymbols = [...new Set([...existingEdge.data.symbols, ...imp.symbols])];
        graph.removeEdge(sourceFile.fileName, imp.resolvedPath);
        graph.addEdge(sourceFile.fileName, imp.resolvedPath, {
          source: sourceFile.fileName,
          target: imp.resolvedPath,
          importType: mergeImportType(existingEdge.data.importType, imp.importType),
          symbols: mergedSymbols,
        });
      } else {
        graph.addEdge(sourceFile.fileName, imp.resolvedPath, {
          source: sourceFile.fileName,
          target: imp.resolvedPath,
          importType: imp.importType,
          symbols: imp.symbols,
        });
      }
    }
  }

  return {
    graph,
    program,
    nodeCount: graph.nodeCount,
    edgeCount: graph.edgeCount,
    errors: configErrors,
  };
}

/**
 * When a module imports from the same target via both type-only and value imports,
 * the merged edge should be 'static' (value import takes precedence).
 */
function mergeImportType(a: ImportType, b: ImportType): ImportType {
  if (a === "static" || b === "static") return "static";
  if (a === "re-export" || b === "re-export") return "re-export";
  if (a === "dynamic" || b === "dynamic") return "dynamic";
  return "type-only";
}
