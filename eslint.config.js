import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    "dist/**",
    ".agent/**",
    ".agents/**",
    ".github/skills/**",
    ".opencode/**",
    ".impeccable/**",
    ".claude/**",
    ".codex/**",
    ".preview-tmp/**",
    "node_modules/**",
  ]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-refresh/only-export-components": "off",
      'no-unused-vars': 'warn',
    },
  },
  {
    files: ["src/**/*.{js,jsx}"],
    ignores: [
      "src/pages/admin/**",
      "src/locales/**",
      "src/i18n/**",
      "src/data/countries.js",
      "src/data/teachers.js",
      "src/services/adminService.js",
      "src/services/studentRequestsService.js",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXText[value=/[\\u0600-\\u06FF]/]",
          message: "Hardcoded Arabic text: move it to src/locales and use t()",
        },
        {
          selector: "Literal[value=/[\\u0600-\\u06FF]/]",
          message: "Hardcoded Arabic text: move it to src/locales and use t()",
        },
        {
          selector: "TemplateElement[value.raw=/[\\u0600-\\u06FF]/]",
          message: "Hardcoded Arabic text: move it to src/locales and use t()",
        },
      ],
    },
  },
]);
