import { describe, it, expect } from "vitest";
import * as ts from "typescript";
import * as path from "path";
import { readTsConfig, createTsProgram } from "./tsconfig-reader";

const FIXTURES = path.resolve(__dirname, "../../tests/fixtures");

describe("readTsConfig", () => {
  it("reads a valid tsconfig.json", () => {
    const result = readTsConfig(path.join(FIXTURES, "simple-project"));
    expect(result.errors).toHaveLength(0);
    expect(result.fileNames.length).toBeGreaterThanOrEqual(2);
    expect(
      result.fileNames.some((f) => f.includes("index.ts"))
    ).toBe(true);
    expect(
      result.fileNames.some((f) => f.includes("utils.ts"))
    ).toBe(true);
  });

  it("reads tsconfig with path aliases", () => {
    const result = readTsConfig(path.join(FIXTURES, "paths-project"));
    expect(result.errors).toHaveLength(0);
    expect(result.compilerOptions.paths).toBeDefined();
    expect(result.compilerOptions.paths?.["@/*"]).toEqual(["./src/*"]);
    expect(result.fileNames.length).toBeGreaterThanOrEqual(2);
  });

  it("returns defaults when no tsconfig.json found", () => {
    const result = readTsConfig(path.join(FIXTURES, "nonexistent"));
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.fileNames).toEqual([]);
    expect(result.compilerOptions.target).toBeDefined();
  });
});

describe("createTsProgram", () => {
  it("creates a program from fixture files", () => {
    const { compilerOptions, fileNames } = readTsConfig(
      path.join(FIXTURES, "simple-project")
    );
    const program = createTsProgram(fileNames, compilerOptions);

    expect(program).toBeDefined();
    const sourceFiles = program.getSourceFiles();
    const projectFiles = sourceFiles.filter(
      (sf) => !sf.fileName.includes("node_modules") && !sf.fileName.includes(".d.ts")
    );
    expect(projectFiles.length).toBeGreaterThanOrEqual(2);
  });

  it("program source files have import declarations", () => {
    const { compilerOptions, fileNames } = readTsConfig(
      path.join(FIXTURES, "simple-project")
    );
    const program = createTsProgram(fileNames, compilerOptions);

    const indexFile = program.getSourceFiles().find(
      (sf) => sf.fileName.includes("index.ts")
    );
    expect(indexFile).toBeDefined();
    // SourceFile has imports property at runtime but not in types;
    // verify we can walk the AST to find import declarations
    let importCount = 0;
    ts.forEachChild(indexFile!, (node) => {
      if (ts.isImportDeclaration(node)) importCount++;
    });
    expect(importCount).toBeGreaterThan(0);
  });

  it("program provides a type checker", () => {
    const { compilerOptions, fileNames } = readTsConfig(
      path.join(FIXTURES, "simple-project")
    );
    const program = createTsProgram(fileNames, compilerOptions);
    const checker = program.getTypeChecker();

    expect(checker).toBeDefined();
    const indexFile = program.getSourceFiles().find(
      (sf) => sf.fileName.includes("index.ts")
    );
    expect(indexFile).toBeDefined();

    // Verify checker API works
    expect(typeof checker.getSymbolsInScope).toBe("function");
  });
});
