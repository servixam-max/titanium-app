import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@next/next/no-img-element": "off",
      // Next 16 / react-hooks 7 flags common intentional patterns (e.g. ClientOnly
      // mounting flag, Math.random in celebratory particles) as errors. We keep them
      // disabled to avoid rewriting the app for lint rules that don't affect runtime
      // correctness.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
    },
  },
];

export default eslintConfig;
