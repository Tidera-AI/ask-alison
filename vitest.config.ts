import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts", "{lib,app,scripts}/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/.git/**", "tests/**", "**/*.spec.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "."),
    },
  },
});
