import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    // i18n: no hardcoded UI strings. Every visible string comes from the
    // message catalogue (src/i18n/messages/en.json) through next-intl.
    // tests/unit/i18n.test.ts covers text-bearing attributes (aria-label, alt…).
    files: ["app/**/*.tsx", "src/**/*.tsx"],
    rules: {
      "react/jsx-no-literals": ["error", { noStrings: true, ignoreProps: true }],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "prototype/**",
    "test-results/**",
    "supabase/.temp/**",
  ]),
]);

export default eslintConfig;
