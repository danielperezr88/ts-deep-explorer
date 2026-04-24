import * as ts from "typescript";

export type ImportType = "static" | "dynamic" | "type-only" | "re-export";

export interface ResolvedImport {
  /** Absolute file path of the source file containing the import */
  sourceFile: string;
  /** Resolved absolute file path of the imported module */
  resolvedPath: string;
  /** Type of import */
  importType: ImportType;
  /** Symbol names imported (empty for side-effect imports) */
  symbols: string[];
  /** Original module specifier as written in the source */
  specifier: string;
}

/**
 * Extract all imports from a TypeScript source file.
 * Handles static imports, type-only imports, re-exports, dynamic imports, and side-effect imports.
 */
export function extractImports(
  sourceFile: ts.SourceFile,
  program: ts.Program
): ResolvedImport[] {
  const results: ResolvedImport[] = [];
  const sourcePath = sourceFile.fileName;
  const compilerOptions = program.getCompilerOptions();
  const host = ts.createCompilerHost(compilerOptions);

  // We need the module resolution host for resolveModuleName
  const moduleResolutionHost: ts.ModuleResolutionHost = {
    fileExists: host.fileExists,
    readFile: host.readFile,
    trace: host.trace,
    directoryExists: host.directoryExists,
    realpath: host.realpath,
    getCurrentDirectory: host.getCurrentDirectory,
    getDirectories: host.getDirectories,
  };

  function resolveSpecifier(specifier: string): string | null {
    const resolved = ts.resolveModuleName(
      specifier,
      sourcePath,
      compilerOptions,
      moduleResolutionHost
    );
    const resolvedModule = resolved.resolvedModule;
    if (!resolvedModule) return null;
    return resolvedModule.resolvedFileName;
  }

  function getSymbolsFromClause(
    clause: ts.ImportClause | ts.ExportDeclaration
  ): string[] {
    // For export declarations
    if (ts.isExportDeclaration(clause)) {
      const decl = clause as ts.ExportDeclaration;
      if (decl.exportClause && ts.isNamedExports(decl.exportClause)) {
        return decl.exportClause.elements.map((e) => e.name.text);
      }
      return [];
    }

    // For import clauses
    const importClause = clause as ts.ImportClause;
    const symbols: string[] = [];

    if (importClause.name) {
      // default import: import X from '...'
      symbols.push("default");
    }

    if (importClause.namedBindings) {
      if (ts.isNamedImports(importClause.namedBindings)) {
        for (const element of importClause.namedBindings.elements) {
          symbols.push(element.name.text);
        }
      } else if (ts.isNamespaceImport(importClause.namedBindings)) {
        symbols.push("*");
      }
    }

    return symbols;
  }

  ts.forEachChild(sourceFile, (node) => {
    // import ... from '...'
    if (ts.isImportDeclaration(node)) {
      const specifier = (node.moduleSpecifier as ts.StringLiteral).text;
      const resolvedPath = resolveSpecifier(specifier);
      if (!resolvedPath) return;

      const isTypeOnly = node.importClause?.isTypeOnly ?? false;
      const symbols = node.importClause
        ? getSymbolsFromClause(node.importClause)
        : [];

      results.push({
        sourceFile: sourcePath,
        resolvedPath,
        importType: isTypeOnly ? "type-only" : "static",
        symbols,
        specifier,
      });
      return;
    }

    // export { ... } from '...' or export * from '...'
    if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      const specifier = (node.moduleSpecifier as ts.StringLiteral).text;
      const resolvedPath = resolveSpecifier(specifier);
      if (!resolvedPath) return;

      const symbols = node.exportClause
        ? getSymbolsFromClause(node)
        : [];

      results.push({
        sourceFile: sourcePath,
        resolvedPath,
        importType: "re-export",
        symbols,
        specifier,
      });
      return;
    }

    // import('...')  dynamic import
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const arg = node.arguments[0];
      if (ts.isStringLiteral(arg)) {
        const specifier = arg.text;
        const resolvedPath = resolveSpecifier(specifier);
        if (!resolvedPath) return;

        results.push({
          sourceFile: sourcePath,
          resolvedPath,
          importType: "dynamic",
          symbols: [],
          specifier,
        });
      }
    }
  });

  return results;
}

/**
 * Extract all imports from all source files in a program,
 * returning them grouped by source file.
 */
export function extractAllImports(
  program: ts.Program
): Map<string, ResolvedImport[]> {
  const results = new Map<string, ResolvedImport[]>();

  for (const sourceFile of program.getSourceFiles()) {
    // Skip declaration files and node_modules
    if (sourceFile.fileName.endsWith(".d.ts")) continue;
    if (sourceFile.fileName.includes("node_modules")) continue;

    const imports = extractImports(sourceFile, program);
    if (imports.length > 0) {
      results.set(sourceFile.fileName, imports);
    }
  }

  return results;
}
