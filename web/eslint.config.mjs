import { globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import reactHooks from "eslint-plugin-react-hooks";

const config = [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "ui-features/**",
      "tmp/**",
    ],
  },
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@typescript-eslint": tseslint,
      import: importPlugin,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      // BUGS REAIS (mantém forte)
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Por padrão nesta fase: permitir any (warn) para reduzir ruído
      "@typescript-eslint/no-explicit-any": "warn",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // COISAS QUE PODEM ESPERAR
      "no-console": "warn",
      "no-param-reassign": "off",
      "no-underscore-dangle": "off",
      "import/no-unresolved": "off",
      "import/extensions": "off",
    },
  },
  // Regras específicas por pasta/arquivo
  {
    files: [
      "lib/**",
      "hooks/**",
      "features/**/services.ts",
    ],
    rules: {
      // Em camadas de domínio/infra, manter 'any' como erro
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: [
      "legacy/**",
    ],
    rules: {
      // Em legacy, aliviar regras para não travar evolução
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
];

export default config;
