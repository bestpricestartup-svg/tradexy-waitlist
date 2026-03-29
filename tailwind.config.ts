import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tx: {
          bg: "#0b0c0d",
          surface: "#12141a",
          elevated: "#181b24",
          neon: "#22f3a0",
          cyan: "#22d3ee",
          muted: "#94a3b8",
        },
      },
      boxShadow: {
        neon: "0 0 32px -6px rgba(34, 243, 160, 0.45)",
        "neon-sm": "0 0 20px -4px rgba(34, 243, 160, 0.35)",
        card: "0 24px 48px -12px rgba(0, 0, 0, 0.55)",
      },
      backgroundImage: {
        "gradient-cta":
          "linear-gradient(135deg, #22f3a0 0%, #14d9b0 45%, #22d3ee 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
