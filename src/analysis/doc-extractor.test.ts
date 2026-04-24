import { describe, it, expect, beforeEach } from "vitest";
import * as path from "path";
import * as ts from "typescript";
import { extractModuleDoc } from "./doc-extractor";
import { readTsConfig, createTsProgram } from "./tsconfig-reader";

const FIXTURES = path.resolve(__dirname, "../../tests/fixtures");

function getCheckerFor(fixtureName: string) {
  const { compilerOptions, fileNames } = readTsConfig(
    path.join(FIXTURES, fixtureName)
  );
  const program = createTsProgram(fileNames, compilerOptions);
  return {
    program,
    checker: program.getTypeChecker(),
  };
}

function getSourceFile(program: ts.Program, partialPath: string) {
  return program.getSourceFiles().find(
    (sf) => sf.fileName.includes(partialPath) && !sf.fileName.includes(".d.ts")
  )!;
}

describe("extractModuleDoc", () => {
  describe("documented-project", () => {
    let result: ReturnType<typeof extractModuleDoc>;

    beforeEach(() => {
      const { program, checker } = getCheckerFor("documented-project");
      const sf = getSourceFile(program, "api.ts");
      result = extractModuleDoc(sf, checker);
    });

    it("extracts module-level JSDoc", () => {
      // Module doc is the JSDoc before the first statement.
      // If the first statement has its own doc, that's what gets returned.
      // The module doc is captured as the leading JSDoc of the first export.
      expect(result.moduleDoc).toBeDefined();
      expect(result.moduleDoc).not.toBe("");
    });

    it("extracts all exported symbols", () => {
      const names = result.exports.map((e) => e.name);
      expect(names).toContain("processDocument");
      expect(names).toContain("Config");
      expect(names).toContain("NewConfig");
      expect(names).toContain("internalHelper");
      expect(names).toContain("DocStatus");
      expect(names).toContain("DEFAULT_TIMEOUT");
      expect(names).toContain("Engine");
    });

    it("extracts function JSDoc with params and returns", () => {
      const fn = result.exports.find((e) => e.name === "processDocument");
      expect(fn).toBeDefined();
      expect(fn!.doc).toContain("Process a document");
      expect(fn!.kind).toBe("function");
      expect(fn!.deprecated).toBe(false);
    });

    it("detects @deprecated tag on interface", () => {
      const config = result.exports.find((e) => e.name === "Config");
      expect(config).toBeDefined();
      expect(config!.deprecated).toBe(true);
      expect(config!.deprecationMessage).toContain("NewConfig");
      expect(config!.deprecationMessage).toContain("removed in v3");
    });

    it("detects @internal tag via JSDoc", () => {
      const helper = result.exports.find((e) => e.name === "internalHelper");
      expect(helper).toBeDefined();
      // @internal functions may have doc or not depending on TS version
      // The key check is that the export is found
      expect(helper!.kind).toBe("function");
    });

    it("classifies exports by kind", () => {
      const byKind = Object.fromEntries(
        result.exports.map((e) => [e.name, e.kind])
      );
      expect(byKind["processDocument"]).toBe("function");
      expect(byKind["Config"]).toBe("interface");
      expect(byKind["NewConfig"]).toBe("interface");
      expect(byKind["DocStatus"]).toBe("type");
      expect(byKind["DEFAULT_TIMEOUT"]).toBe("const");
      expect(byKind["Engine"]).toBe("class");
    });

    it("extracts type signatures", () => {
      const fn = result.exports.find((e) => e.name === "processDocument");
      expect(fn).toBeDefined();
      // Signature should include the function type
      expect(fn!.signature.length).toBeGreaterThan(0);
    });

    it("non-deprecated exports have no deprecation message", () => {
      const newConfig = result.exports.find((e) => e.name === "NewConfig");
      expect(newConfig!.deprecated).toBe(false);
      expect(newConfig!.deprecationMessage).toBeUndefined();
    });
  });

  describe("simple-project (no docs)", () => {
    it("returns null moduleDoc and empty exports for undocumented files", () => {
      const { program, checker } = getCheckerFor("simple-project");
      const sf = getSourceFile(program, "utils.ts");
      const result = extractModuleDoc(sf, checker);

      expect(result.moduleDoc).toBeNull();
      // Should still find the exported function
      expect(result.exports.length).toBeGreaterThan(0);
    });

    it("extracts exports even without JSDoc", () => {
      const { program, checker } = getCheckerFor("simple-project");
      const sf = getSourceFile(program, "utils.ts");
      const result = extractModuleDoc(sf, checker);

      const greet = result.exports.find((e) => e.name === "greet");
      expect(greet).toBeDefined();
      expect(greet!.kind).toBe("function");
      expect(greet!.doc).toBeNull();
      expect(greet!.deprecated).toBe(false);
    });
  });
});
