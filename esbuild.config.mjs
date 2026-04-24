import * as esbuild from "esbuild";

const isWatch = process.argv.includes("--watch");
const isProd = process.argv.includes("--production");

const buildOpts = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outdir: "out",
  external: ["vscode"],
  format: "cjs",
  platform: "node",
  target: "node18",
  sourcemap: !isProd,
  minify: isProd,
  tsconfig: "tsconfig.json",
};

if (isWatch) {
  const ctx = await esbuild.context(buildOpts);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await esbuild.build(buildOpts);
  console.log("Build complete.");
}
