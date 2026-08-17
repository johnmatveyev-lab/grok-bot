import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          0: "#f6f6f7",
          1: "#c8c8ce",
          2: "#8d8d96",
          3: "#5c5c66",
          4: "#2a2a30",
          5: "#1a1a1f",
          6: "#121215",
          7: "#0c0c0e",
          8: "#08080a",
        },
        pulse: "#3dd68c",
        warn: "#f5c16c",
        danger: "#ef6b6b",
        link: "#8fb0ff",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        pane: "0 0 0 1px rgba(255,255,255,0.06), 0 24px 80px rgba(0,0,0,0.45)",
        lift: "0 8px 32px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
