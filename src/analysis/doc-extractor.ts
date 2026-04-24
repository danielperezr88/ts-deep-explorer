import * as ts from "typescript";
import type { ExportedSymbol } from "../../shared/types";

export interface ModuleDocResult {
  /** Module-level JSDoc comment (first block before any export) */
  moduleDoc: string | null;
  /** All exported symbols with their documentation */
  exports: ExportedSymbol[];
}

/**
 * Extract documentation from a TypeScript source file.
 * Returns the module-level doc and all exported symbols with their JSDoc.
 */
export function extractModuleDoc(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker
): ModuleDocResult {
  const moduleDoc = extractModuleLevelDoc(sourceFile);
  const exports = extractExports(sourceFile, checker);

  return { moduleDoc, exports };
}

/**
 * Extract the module-level JSDoc comment (typically the first JSDoc
 * block at the top of the file before any statements).
 */
function extractModuleLevelDoc(sourceFile: ts.SourceFile): string | null {
  // The module-level doc is the JSDoc attached to the first statement
  if (sourceFile.statements.length === 0) return null;

  const firstStatement = sourceFile.statements[0];
  const doc = getJSDocText(firstStatement);
  return doc;
}

/**
 * Extract all exported symbols from a source file with their documentation.
 */
function extractExports(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker
): ExportedSymbol[] {
  const exports: ExportedSymbol[] = [];
  const symbol = checker.getSymbolAtLocation(sourceFile);

  if (!symbol) return exports;

  const exportsOfModule = checker.getExportsOfModule(symbol);

  for (const exportSymbol of exportsOfModule) {
    const name = exportSymbol.getName();
    const kind = getSymbolKind(exportSymbol, checker);
    const doc = getSymbolDoc(exportSymbol, checker);
    const signature = getSymbolSignature(exportSymbol, checker);
    const deprecated = isDeprecated(exportSymbol);
    const deprecationMessage = getDeprecationMessage(exportSymbol);

    exports.push({
      name,
      kind,
      doc,
      deprecated,
      signature,
      usedBy: [], // filled in later by symbol usage tracking
      ...(deprecationMessage ? { deprecationMessage } : {}),
    });
  }

  return exports;
}

/**
 * Get the kind of an exported symbol.
 */
function getSymbolKind(
  symbol: ts.Symbol,
  _checker: ts.TypeChecker
): ExportedSymbol["kind"] {
  // Check for class
  if (symbol.flags & ts.SymbolFlags.Class) return "class";
  // Check for interface
  if (symbol.flags & ts.SymbolFlags.Interface) return "interface";
  // Check for enum
  if (symbol.flags & ts.SymbolFlags.Enum) return "enum";
  // Check for type alias
  if (symbol.flags & ts.SymbolFlags.TypeAlias) return "type";
  // Check for regular enum member
  if (symbol.flags & ts.SymbolFlags.ConstEnum) return "enum";

  // Distinguish function from const by looking at declarations
  const declarations = symbol.getDeclarations();
  if (declarations && declarations.length > 0) {
    const decl = declarations[0];
    if (ts.isFunctionDeclaration(decl)) return "function";
    if (ts.isVariableDeclaration(decl)) {
      // Check if it's an arrow function or function expression
      const initializer = decl.initializer;
      if (
        initializer &&
        (ts.isArrowFunction(initializer) ||
          ts.isFunctionExpression(initializer))
      ) {
        return "function";
      }
      return "const";
    }
    if (ts.isInterfaceDeclaration(decl)) return "interface";
    if (ts.isTypeAliasDeclaration(decl)) return "type";
    if (ts.isEnumDeclaration(decl)) return "enum";
    if (ts.isClassDeclaration(decl)) return "class";
  }

  return "const";
}

/**
 * Get JSDoc text for a symbol using the TypeChecker.
 */
function getSymbolDoc(symbol: ts.Symbol, checker: ts.TypeChecker): string | null {
  const parts = symbol.getDocumentationComment(checker);
  if (parts.length === 0) return null;
  return parts.map((p) => p.text).join("\n");
}

/**
 * Get the type signature string for a symbol.
 */
function getSymbolSignature(
  symbol: ts.Symbol,
  checker: ts.TypeChecker
): string {
  const declarations = symbol.getDeclarations();
  if (!declarations || declarations.length === 0) return symbol.getName();

  const decl = declarations[0];

  // For functions, get the call signature
  if (ts.isFunctionDeclaration(decl) && decl.type) {
    const type = checker.getTypeAtLocation(decl);
    const sigs = type.getCallSignatures();
    if (sigs.length > 0) {
      return checker.signatureToString(sigs[0]);
    }
  }

  // For other declarations, use typeToString
  const type = checker.getTypeAtLocation(decl);
  return checker.typeToString(type);
}

/**
 * Check if a symbol is marked as @deprecated.
 */
function isDeprecated(symbol: ts.Symbol): boolean {
  return symbol.getJsDocTags().some((tag) => tag.name === "deprecated");
}

/**
 * Get the deprecation message from @deprecated tag.
 */
function getDeprecationMessage(symbol: ts.Symbol): string | null {
  const deprecatedTag = symbol
    .getJsDocTags()
    .find((tag) => tag.name === "deprecated");
  if (!deprecatedTag) return null;
  if (deprecatedTag.text && deprecatedTag.text.length > 0) {
    return deprecatedTag.text.map((t) => t.text).join(" ");
  }
  return null;
}

/**
 * Get JSDoc comment text attached to a node via its leading trivia.
 */
function getJSDocText(node: ts.Node): string | null {
  // ts.getJSDocCommentsAndTags is available in TS 5.x
  const jsDocNodes = ts.getJSDocCommentsAndTags(node);
  if (jsDocNodes.length === 0) return null;

  // Get the first JSDoc comment
  const first = jsDocNodes[0];
  if (ts.isJSDoc(first)) {
    return first.comment ? ts.getTextOfJSDocComment(first.comment) ?? null : null;
  }
  return null;
}
