import { parentPort, workerData } from "node:worker_threads";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";

type WorkerInput = {
  cwd: string;
  file: string;
};

async function main(): Promise<void> {
  const { cwd, file } = workerData as WorkerInput;
  const fullPath = join(cwd, file);
  await access(fullPath, constants.F_OK);
  parentPort?.postMessage({ ok: true, file });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  parentPort?.postMessage({ ok: false, error: message });
});
