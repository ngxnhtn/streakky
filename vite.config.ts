import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    // vendored agent skills are pinned by hash in skills-lock.json; generated files are rewritten by their tools
    ignorePatterns: [
      ".agents/**",
      ".claude/**",
      "**/routeTree.gen.ts",
      "**/worker-configuration.d.ts",
    ],
  },
  lint: {
    ignorePatterns: [
      ".agents/**",
      ".claude/**",
      "**/routeTree.gen.ts",
      "**/worker-configuration.d.ts",
    ],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  run: {
    cache: true,
  },
});
