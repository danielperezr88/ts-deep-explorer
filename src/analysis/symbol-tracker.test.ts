import { describe, it, expect, beforeEach } from "vitest";
import * as path from "path";
import { buildSymbolUsageMap, applySymbolUsage } from "./symbol-tracker";
import { extractModuleDoc } from "./doc-extractor";
import { readTsConfig, createTsProgram } from "./tsconfig-reader";
import type { ExportedSymbol } from "../../shared/types";

const FIXTURES = path.resolve(__dirname, "../../tests/fixtures");

function getExportsForFixture(fixtureName: string) {
  const { compilerOptions, fileNames } = readTsConfig(
    path.join(FIXTURES, fixtureName)
  );
  const program = createTsProgram(fileNames, compilerOptions);
  const checker = program.getTypeChecker();

  const exportsByFile = new Map<string, ExportedSymbol[]>();
  for (const sf of program.getSourceFiles()) {
    if (sf.fileName.endsWith(".d.ts") || sf.fileName.includes("node_modules")) continue;
    const result = extractModuleDoc(sf, checker);
    if (result.exports.length > 0) {
      exportsByFile.set(sf.fileName, result.exports);
    }
  }

  return { program, exportsByFile };
}

describe("buildSymbolUsageMap", () => {
  describe("simple-project", () => {
    it("tracks that 'greet' is used by index.ts", () => {
      const { program, exportsByFile } = getExportsForFixture("simple-project");
      const usageMap = buildSymbolUsageMap(program, exportsByFile);

      const greetConsumers = usageMap.get("greet");
      expect(greetConsumers).toBeDefined();
      expect(greetConsumers!.length).toBeGreaterThan(0);
      expect(greetConsumers!.some((c) => c.includes("index.ts"))).toBe(true);
    });
  });

  describe("complex-project", () => {
    let usageMap: Map<string, string[]>;

    beforeEach(() => {
      const { program, exportsByFile } = getExportsForFixture("complex-project");
      usageMap = buildSymbolUsageMap(program, exportsByFile);
    });

    it("tracks 'processDoc' used by index.ts", () => {
      const consumers = usageMap.get("processDoc");
      expect(consumers).toBeDefined();
      expect(consumers!.some((c) => c.includes("index.ts"))).toBe(true);
    });

    it("tracks 'Config' used by index.ts", () => {
      const consumers = usageMap.get("Config");
      expect(consumers).toBeDefined();
      expect(consumers!.some((c) => c.includes("index.ts"))).toBe(true);
    });

    it("tracks 'validate' used by index.ts", () => {
      const consumers = usageMap.get("validate");
      expect(consumers).toBeDefined();
      expect(consumers!.some((c) => c.includes("index.ts"))).toBe(true);
    });
  });
});

describe("applySymbolUsage", () => {
  it("updates usedBy field on exported symbols", () => {
    const { program, exportsByFile } = getExportsForFixture("simple-project");
    const usageMap = buildSymbolUsageMap(program, exportsByFile);

    applySymbolUsage(exportsByFile, usageMap);

    // Find the greet symbol
    for (const [, exports] of exportsByFile) {
      const greet = exports.find((e) => e.name === "greet");
      if (greet) {
        expect(greet.usedBy.length).toBeGreaterThan(0);
        expect(greet.usedBy.some((u) => u.includes("index.ts"))).toBe(true);
        return;
      }
    }
    // Should not reach here
    expect.unreachable("greet symbol not found");
  });
});
