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

        paper: {
          warm: "#F5F0E6",
          cool: "#EFEEEA",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-fraunces)",
          "var(--font-noto-sans-jp)",
          "system-ui",
          "sans-serif",
        ],
        display: [
          "var(--font-fraunces)",
          "var(--font-shippori-mincho)",
          "Georgia",
          "serif",
        ],
        mincho: [
          "var(--font-shippori-mincho)",
          "Georgia",
          "ヒラギノ明朝 ProN",
          "Yu Mincho",
          "serif",
        ],
        mono: [
          "var(--font-jetbrains-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
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
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        countSlideUp: {
          "0%": { opacity: "0", transform: "translateY(40%)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 300ms ease-out both",
        ticker: "ticker 60s linear infinite",
        countSlideUp: "countSlideUp 1.1s cubic-bezier(0.22, 1, 0.36, 1) both",
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
