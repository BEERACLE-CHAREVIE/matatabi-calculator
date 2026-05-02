import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        offwhite: "#F8F6F2",
        ash: "#72665B",
        greige: "#BEB5AA",
        misty: "#9CAEB8",

        canvas: "#F8F6F2",
        ink: "#72665B",
        line: "#BEB5AA",
        accent: "#9CAEB8",
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "var(--font-noto-sans-jp)",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        // ink (#72665B) ベースの rgba。canvas (#F8F6F2) 上で柔らかく見せる
        card: "0 1px 2px 0 rgba(114, 102, 91, 0.05), 0 1px 3px 0 rgba(114, 102, 91, 0.04)",
        "card-hover":
          "0 4px 12px -2px rgba(114, 102, 91, 0.10), 0 2px 4px 0 rgba(114, 102, 91, 0.06)",
        floating: "0 12px 24px -4px rgba(114, 102, 91, 0.12)",
      },
      letterSpacing: {
        // 警告バナー見出し用 (docs/spec/warning-copy.md の 0.05em〜0.08em の中央値)
        warning: "0.06em",
      },
      keyframes: {
        // 警告バナー等で使うフェードイン (docs/spec/warning-copy.md §6.4)
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        // motion-safe バリアントと組み合わせ、prefers-reduced-motion 時は自動的に無効化される
        fadeIn: "fadeIn 300ms ease-out both",
      },
      ringColor: {
        DEFAULT: "#9CAEB8",
      },
      ringWidth: {
        DEFAULT: "2px",
      },
      ringOffsetColor: {
        DEFAULT: "#F8F6F2",
      },
    },
  },
  plugins: [],
};
export default config;
