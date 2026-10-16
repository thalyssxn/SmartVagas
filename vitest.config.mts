import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    // Máquina em UTC, como o servidor: pega código que dependa do fuso local por acidente.
    env: { TZ: "UTC" },
  },
});
