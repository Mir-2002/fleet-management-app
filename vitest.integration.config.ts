import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./apps/web/src", import.meta.url)),
      "@fleetman/shared": fileURLToPath(new URL("./packages/shared/src/index.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["testing/rls/**/*.test.ts"], // testing/integration/** was cut 2026-08-28 (see testing/README.md) -- the two DB-free auth tests moved to testing/unit/
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 20_000,
    hookTimeout: 60_000,
    mockReset: true,
    restoreMocks: true,
  },
});
