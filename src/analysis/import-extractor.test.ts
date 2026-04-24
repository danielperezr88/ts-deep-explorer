import { describe, it, expect, beforeEach } from "vitest";
import * as path from "path";
import * as ts from "typescript";
import { extractImports, extractAllImports, type ResolvedImport } from "./import-extractor";
import { readTsConfig, createTsProgram } from "./tsconfig-reader";

const FIXTURES = path.resolve(__dirname, "../../tests/fixtures");

function getProgramFor(fixtureName: string) {
  const { compilerOptions, fileNames } = readTsConfig(
    path.join(FIXTURES, fixtureName)
  );
  return createTsProgram(fileNames, compilerOptions);
}

function getSourceFile(program: ts.Program, partialPath: string) {
  return program.getSourceFiles().find((sf) =>
    sf.fileName.includes(partialPath) && !sf.fileName.includes(".d.ts")
  )!;
}

describe("extractImports", () => {
  describe("simple-project", () => {
    it("extracts static imports from index.ts", () => {
      const program = getProgramFor("simple-project");
      const sf = getSourceFile(program, "index.ts");
      const imports = extractImports(sf, program);

      expect(imports).toHaveLength(1);
      expect(imports[0].importType).toBe("static");
      expect(imports[0].symbols).toEqual(["greet"]);
      expect(imports[0].resolvedPath).toMatch(/utils\.ts$/);
      expect(imports[0].specifier).toBe("./utils");
    });

    it("returns empty for files with no imports", () => {
      const program = getProgramFor("simple-project");
      const sf = getSourceFile(program, "utils.ts");
      const imports = extractImports(sf, program);
      expect(imports).toHaveLength(0);
    });
  });

  describe("complex-project", () => {
    let imports: ResolvedImport[];

    beforeEach(() => {
      const program = getProgramFor("complex-project");
      const sf = getSourceFile(program, "index.ts");
      imports = extractImports(sf, program);
    });

    it("extracts path alias import (@/core/engine)", () => {
      const engineImport = imports.find((i) => i.specifier === "@/core/engine");
      expect(engineImport).toBeDefined();
      expect(engineImport!.importType).toBe("static");
      expect(engineImport!.symbols).toEqual(["processDoc"]);
      expect(engineImport!.resolvedPath).toMatch(/engine\.ts$/);
    });

    it("extracts type-only import (import type { Config })", () => {
      const typeImport = imports.find((i) => i.specifier === "@/types/config");
      expect(typeImport).toBeDefined();
      expect(typeImport!.importType).toBe("type-only");
      expect(typeImport!.symbols).toEqual(["Config"]);
    });

    it("extracts relative import (./utils/validate)", () => {
      const validateImport = imports.find((i) => i.specifier === "./utils/validate");
      expect(validateImport).toBeDefined();
      expect(validateImport!.importType).toBe("static");
      expect(validateImport!.symbols).toEqual(["validate"]);
    });

    it("extracts side-effect import (./utils/setup)", () => {
      const setupImport = imports.find((i) => i.specifier === "./utils/setup");
      expect(setupImport).toBeDefined();
      expect(setupImport!.importType).toBe("static");
      expect(setupImport!.symbols).toEqual([]);
    });

    it("total import count matches", () => {
      expect(imports).toHaveLength(4);
    });
  });

  describe("barrel file (re-exports)", () => {
    it("extracts re-export declarations", () => {
      const program = getProgramFor("complex-project");
      const sf = getSourceFile(program, "barrel.ts");
      const imports = extractImports(sf, program);

      expect(imports).toHaveLength(3);

      const reExports = imports.filter((i) => i.importType === "re-export");
      expect(reExports).toHaveLength(3);

      const exportedSymbols = reExports.flatMap((i) => i.symbols);
      expect(exportedSymbols).toEqual(
        expect.arrayContaining(["processDoc", "validate", "Config"])
      );
    });
  });

  describe("paths-project", () => {
    it("resolves @/* path aliases correctly", () => {
      const program = getProgramFor("paths-project");
      const sf = getSourceFile(program, "index.ts");
      const imports = extractImports(sf, program);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe("@/core/engine");
      expect(imports[0].resolvedPath).toMatch(/core[\\/]engine\.ts$/);
      expect(imports[0].symbols).toEqual(["engine"]);
    });
  });
});

describe("extractAllImports", () => {
  it("extracts imports from all project files", () => {
    const program = getProgramFor("complex-project");
    const allImports = extractAllImports(program);

    // Should have entries for files that import things
    expect(allImports.size).toBeGreaterThan(0);

    // index.ts should be in the map
    const indexImports = [...allImports.entries()].find(([key]) =>
      key.includes("index.ts") && !key.includes("barrel")
    );
    expect(indexImports).toBeDefined();
    expect(indexImports![1].length).toBe(4);

    // barrel.ts should be in the map
    const barrelImports = [...allImports.entries()].find(([key]) =>
      key.includes("barrel")
    );
    expect(barrelImports).toBeDefined();
    expect(barrelImports![1].length).toBe(3);
  });

  it("skips declaration files and node_modules", () => {
    const program = getProgramFor("simple-project");
    const allImports = extractAllImports(program);

    for (const [filePath] of allImports) {
      expect(filePath).not.toContain("node_modules");
      expect(filePath).not.toMatch(/\.d\.ts$/);
    }
  });

  it("does not include files with zero imports", () => {
    const program = getProgramFor("simple-project");
    const allImports = extractAllImports(program);

    // utils.ts has no imports, so it shouldn't be in the map
    const utilsEntry = [...allImports.entries()].find(([key]) =>
      key.includes("utils.ts")
    );
    expect(utilsEntry).toBeUndefined();
  });
});
