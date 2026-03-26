import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliDir = resolve(__dirname, "..");
const workspaceRoot = resolve(cliDir, "..", "..");

const internalPackages = [
  "packages/types",
  "packages/plugins/core",
  "packages/config",
  "packages/core",
  "packages/storage/local",
  "packages/storage/s3",
  "packages/storage/r2",
  "packages/storage/azure",
  "packages/storage/gcs",
  "packages/transformer/image",
  "packages/transformer/video",
];

function stripScope(name) {
  return name.replace(/^@[^/]+\//, "");
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const vendorScopeDir = join(cliDir, "node_modules", "@droppjs");
  await rm(vendorScopeDir, { recursive: true, force: true });
  await mkdir(vendorScopeDir, { recursive: true });

  const cliPkg = await readJson(join(cliDir, "package.json"));
  const cliDeps = new Set(Object.keys(cliPkg.dependencies ?? {}));

  const packageMeta = new Map();
  for (const rel of internalPackages) {
    const pkgDir = resolve(workspaceRoot, rel);
    const pkgJsonPath = join(pkgDir, "package.json");
    const pkg = await readJson(pkgJsonPath);
    packageMeta.set(pkg.name, { dir: pkgDir, pkg });
  }

  for (const [pkgName, meta] of packageMeta) {
    const outDir = join(vendorScopeDir, stripScope(pkgName));
    const distDir = join(meta.dir, "dist");

    if (!(await pathExists(distDir))) {
      throw new Error(`Missing dist for ${pkgName}. Run workspace build first.`);
    }

    await mkdir(outDir, { recursive: true });
    await cp(distDir, join(outDir, "dist"), { recursive: true });

    const normalizedDeps = {};
    for (const [depName, depVersion] of Object.entries(meta.pkg.dependencies ?? {})) {
      if (typeof depVersion === "string" && depVersion.startsWith("workspace:")) {
        const internal = packageMeta.get(depName);
        if (internal) {
          normalizedDeps[depName] = internal.pkg.version;
        }
        continue;
      }

      // External deps that also exist at the CLI root should be resolved from the
      // root node_modules to avoid duplicating large dependency trees in each
      // bundled internal package.
      if (cliDeps.has(depName)) {
        continue;
      }

      normalizedDeps[depName] = depVersion;
    }

    const outPkg = {
      name: meta.pkg.name,
      version: meta.pkg.version,
      type: meta.pkg.type,
      author: meta.pkg.author,
      main: meta.pkg.main,
      types: meta.pkg.types,
      exports: meta.pkg.exports,
      dependencies: normalizedDeps,
      peerDependencies: meta.pkg.peerDependencies,
      optionalDependencies: meta.pkg.optionalDependencies,
      files: ["dist"],
    };

    await writeFile(join(outDir, "package.json"), `${JSON.stringify(outPkg, null, 2)}\n`, "utf8");

    const readmePath = join(meta.dir, "README.md");
    if (await pathExists(readmePath)) {
      await cp(readmePath, join(outDir, "README.md"));
    }
  }

  const bundledCount = (await readdir(vendorScopeDir)).length;
  console.log(`Prepared standalone bundle with ${bundledCount} internal packages.`);
}

await main();
