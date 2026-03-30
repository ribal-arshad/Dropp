import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const root = resolve(process.cwd());
const cliBin = join(root, "bin", "run.js");

function runSmokeCommand(cwd, args) {
  return execFileSync(process.execPath, [cliBin, ...args], {
    cwd,
    env: {
      ...process.env,
      DOTENV_CONFIG_QUIET: "true",
    },
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
}

function parseJsonFromOutput(output) {
  const startArray = output.indexOf("[");
  const startObject = output.indexOf("{");
  const start =
    startArray === -1
      ? startObject
      : startObject === -1
        ? startArray
        : Math.min(startArray, startObject);

  if (start === -1) {
    throw new Error("Smoke test failed: command did not output JSON.");
  }

  return JSON.parse(output.slice(start));
}

async function main() {
  const workdir = await mkdtemp(join(tmpdir(), "droppjs-smoke-"));

  try {
    const cfg = {
      orm: { driver: "json" },
      storage: {
        driver: "local",
        local: { baseDir: "media", baseUrl: "/media" },
      },
      queue: { enabled: false },
    };

    await writeFile(join(workdir, "dropp.config.json"), JSON.stringify(cfg));
    await writeFile(join(workdir, "sample.jpg"), "fake-image");
    await writeFile(join(workdir, "sample.mp3"), "fake-audio");
    await writeFile(join(workdir, "sample.pdf"), "fake-doc");

    runSmokeCommand(workdir, [
      "attach",
      "./sample.jpg",
      "--model",
      "post",
      "--modelId",
      "1",
      "--collection",
      "images",
    ]);

    runSmokeCommand(workdir, [
      "attach",
      "./sample.mp3",
      "--model",
      "post",
      "--modelId",
      "1",
      "--collection",
      "audio",
    ]);

    runSmokeCommand(workdir, [
      "attach",
      "./sample.pdf",
      "--model",
      "post",
      "--modelId",
      "1",
      "--collection",
      "docs",
    ]);

    const listJson = runSmokeCommand(workdir, ["list", "--json"]);
    const items = parseJsonFromOutput(listJson);

    if (!Array.isArray(items) || items.length < 3) {
      throw new Error("Smoke test failed: expected at least 3 media entries.");
    }

    const kinds = new Set(items.map((i) => i?.metadata?.mediaKind));
    if (!kinds.has("image") || !kinds.has("audio") || !kinds.has("document")) {
      throw new Error(
        "Smoke test failed: missing mediaKind(s) for image/audio/document.",
      );
    }

    const storeFile = join(workdir, ".dropp", "media.json");
    const raw = await readFile(storeFile, "utf8");
    if (
      !raw.includes("sample.jpg") ||
      !raw.includes("sample.mp3") ||
      !raw.includes("sample.pdf")
    ) {
      throw new Error(
        "Smoke test failed: expected files not found in repository store.",
      );
    }

    console.log("Smoke test passed.");
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
