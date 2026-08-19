import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Drizzle generates SQL + meta JSON — nothing to lint here.
    "drizzle/**",
  ]),
  {
    // The "reset page to 1 when filters change" pattern is a textbook
    // useEffect use, but the new React 19 lint rule flags it. Revisit
    // when we move pagination state to URL search params (Sprint 12).
    rules: {
      "react-hooks/set-state-in-effect": "off",
      // Standard TS convention: `_`-prefixed identifiers are
      // intentionally unused (e.g. route handlers that take `_req` but
      // only consume `ctx`, destructured fields we don't need yet,
      // caught errors we only re-throw). Allow them at lint time so
      // the warning queue stays focused on actually-dead code.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
