import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "work/**",
      "outputs/**",
      "next-env.d.ts",
      // Electron 主进程是 CommonJS，不适用 next/typescript 规则
      "desktop/**",
      "dist/**"
    ]
  }
];

export default eslintConfig;
