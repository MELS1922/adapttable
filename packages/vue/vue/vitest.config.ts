import path from "node:path";
import { fileURLToPath } from "node:url";

import { mergeConfig } from "vitest/config";

import { sharedConfig } from "../../../vitest.shared.ts";

const packageDir = path.dirname(fileURLToPath(import.meta.url));

export default mergeConfig(sharedConfig, {
  resolve: {
    alias: [
      {
        find: /^@adapttable\/core$/,
        replacement: path.resolve(packageDir, "../../shared/core/src/index.ts"),
      },
      {
        find: /^@adapttable\/core\/(.+)$/,
        replacement: path.resolve(packageDir, "../../shared/core/src/$1.ts"),
      },
    ],
  },
  test: {
    pool: "forks",
    setupFiles: ["./vitest.setup.ts"],
  },
});
