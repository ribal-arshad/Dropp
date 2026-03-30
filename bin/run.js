#!/usr/bin/env node
import { execute } from "@oclif/core";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

await execute({
  dir: dirname(fileURLToPath(new URL("../package.json", import.meta.url))),
});
