import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    // vendored agent skills are pinned by hash in skills-lock.json; generated files are rewritten by their tools
    ignorePatterns: [".agents/**", ".claude/**", "**/routeTree.gen.ts"],
  },
  lint: {
    ignorePatterns: [".agents/**", ".claude/**", "**/routeTree.gen.ts"],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  run: {
    cache: true,
  },
  test: {
    // agent worktrees under .claude/worktrees hold whole copies of the repo
    exclude: ["**/node_modules/**", "**/dist/**", ".agents/**", ".claude/**"],
  },
});
