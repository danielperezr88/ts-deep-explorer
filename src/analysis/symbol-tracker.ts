import * as ts from "typescript";
import type { ExportedSymbol } from "../../shared/types";

/**
 * Build a map of symbol → consumer module IDs.
 * For each exported symbol, track which other modules import it.
 */
export function buildSymbolUsageMap(
  program: ts.Program,
  exportsByFile: Map<string, ExportedSymbol[]>
): Map<string, string[]> {
  const usageMap = new Map<string, string[]>();

  // Initialize all exported symbols with empty usage lists
  for (const [, exports] of exportsByFile) {
    for (const exp of exports) {
      usageMap.set(exp.name, []);
    }
  }

  const checker = program.getTypeChecker();

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.fileName.endsWith(".d.ts")) continue;
    if (sourceFile.fileName.includes("node_modules")) continue;

    // Find all identifiers in this file that reference exported symbols
    const importedSymbols = findImportedSymbols(sourceFile, checker);

    for (const symbolName of importedSymbols) {
      const consumers = usageMap.get(symbolName);
      if (consumers && !consumers.includes(sourceFile.fileName)) {
        consumers.push(sourceFile.fileName);
      }
    }
  }

  return usageMap;
}

/**
 * Find all symbol names that a source file imports from other project modules.
 */
function findImportedSymbols(
  sourceFile: ts.SourceFile,
  _checker: ts.TypeChecker
): Set<string> {
  const symbols = new Set<string>();

  ts.forEachChild(sourceFile, (node) => {
    // Handle import declarations: import { a, b } from './mod'
    if (ts.isImportDeclaration(node) && node.importClause) {
      collectImportClauseSymbols(node.importClause, symbols);
    }

    // Handle export declarations: export { a, b } from './mod'
    if (ts.isExportDeclaration(node) && node.exportClause) {
      if (ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          symbols.add(element.name.text);
        }
      }
    }
  });

  return symbols;
}

/**
 * Collect symbol names from an import clause.
 */
function collectImportClauseSymbols(
  clause: ts.ImportClause,
  symbols: Set<string>
): void {
  if (clause.name) {
    symbols.add("default");
  }

  if (clause.namedBindings) {
    if (ts.isNamedImports(clause.namedBindings)) {
      for (const element of clause.namedBindings.elements) {
        symbols.add(element.name.text);
      }
    } else if (ts.isNamespaceImport(clause.namedBindings)) {
      // namespace import: import * as X — we track the namespace name
      symbols.add(clause.namedBindings.name.text);
    }
  }
}

/**
 * Apply the symbol usage map to exported symbols, updating their usedBy field.
 */
export function applySymbolUsage(
  exportsByFile: Map<string, ExportedSymbol[]>,
  usageMap: Map<string, string[]>
): void {
  for (const [, exports] of exportsByFile) {
    for (const exp of exports) {
      const consumers = usageMap.get(exp.name);
      if (consumers) {
        exp.usedBy = consumers;
      }
    }
  }
}
