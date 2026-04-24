import * as ts from "typescript";
import * as path from "path";

export interface TsConfigResult {
  compilerOptions: ts.CompilerOptions;
  fileNames: string[];
  errors: ts.Diagnostic[];
}

/**
 * Read and parse tsconfig.json from the given directory.
 * Returns compiler options and the list of source files included.
 */
export function readTsConfig(
  projectRoot: string
): TsConfigResult {
  // Check directly in projectRoot — don't walk up the tree,
  // as we don't want to pick up a parent repo's tsconfig.
  const directPath = path.join(projectRoot, "tsconfig.json");
  const configPath = ts.sys.fileExists(directPath)
    ? directPath
    : undefined;

  if (!configPath) {
    return {
      compilerOptions: defaultCompilerOptions(),
      fileNames: [],
      errors: [
        {
          category: ts.DiagnosticCategory.Warning,
          code: 0,
          file: undefined,
          start: undefined,
          length: undefined,
          messageText: "No tsconfig.json found; using default compiler options",
        },
      ],
    };
  }

  const configDir = path.dirname(configPath);
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

  if (configFile.error) {
    return {
      compilerOptions: defaultCompilerOptions(),
      fileNames: [],
      errors: [configFile.error],
    };
  }

  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    configDir
  );

  return {
    compilerOptions: parsed.options,
    fileNames: parsed.fileNames,
    errors: parsed.errors,
  };
}

/**
 * Create a TypeScript program from the given list of files and options.
 */
export function createTsProgram(
  rootFiles: string[],
  compilerOptions: ts.CompilerOptions
): ts.Program {
  return ts.createProgram(rootFiles, compilerOptions);
}

function defaultCompilerOptions(): ts.CompilerOptions {
  return {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
  };
}
