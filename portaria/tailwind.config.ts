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
        // PORTARIA — fresco, digital, institucional. British green como cor de presença.
        britishGreen: "#0B4A35",
        britishGreenDeep: "#073829",
        britishGreenSoft: "#E7F0EC",
        // Aliases mantidos para compatibilidade enquanto os módulos transitam para o novo sistema.
        warmBeige: "#BFCBC5",
        softCream: "#F3F7F5",
        oliveGray: "#65746D",
        ink: "#17201C",
        paper: "#FFFFFF",
        night: "#09110E",
        nightSoft: "#101B17",
        success: "#187653",
        alert: "#B04444",
      },
      fontFamily: {
        // Linguagem de produto: sans neutra, próxima do sistema Apple, sem herança editorial GAVINHO.
        title: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "SF Pro Text", "Inter", "Segoe UI", "sans-serif"],
        body: ["-apple-system", "BlinkMacSystemFont", "SF Pro Text", "Inter", "Segoe UI", "sans-serif"],
      },
      fontSize: {
        display: ["3rem", { lineHeight: "1.04", letterSpacing: "-0.04em" }],
        h1: ["2.25rem", { lineHeight: "1.08", letterSpacing: "-0.035em" }],
        h2: ["1.65rem", { lineHeight: "1.15", letterSpacing: "-0.025em" }],
        h3: ["1.25rem", { lineHeight: "1.25", letterSpacing: "-0.015em" }],
      },
      boxShadow: {
        glass: "0 18px 55px rgba(23, 32, 28, 0.08)",
        float: "0 8px 30px rgba(23, 32, 28, 0.10)",
      },
      backdropBlur: {
        glass: "22px",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
