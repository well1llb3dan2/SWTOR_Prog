import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const pkg = (name: string, entry = "src/index.ts") =>
  fileURLToPath(new URL(`./packages/${name}/${entry}`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@swtor/shared": pkg("shared"),
      "@swtor/parser": pkg("parser"),
      "@swtor/analytics": pkg("analytics"),
      "@swtor/db": pkg("db"),
      "@swtor/game-data": pkg("game-data"),
    },
  },
  test: {
    include: ["packages/*/test/**/*.test.ts", "apps/*/test/**/*.test.ts"],
    environment: "node",
    globals: false,
  },
});
