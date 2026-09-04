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
        // THE DOORKEEPER — cores do manual de identidade.
        doorkeeperGreen: "#3B433A",
        doorkeeperTurquoise: "#00A29B",
        doorkeeperTerracotta: "#AC4735",
        doorkeeperBrown: "#543B31",
        graphite: "#2E2D2C",
        // Aliases mantidos para a migração visual dos módulos existentes.
        britishGreen: "#3B433A",
        britishGreenDeep: "#2E2D2C",
        britishGreenSoft: "#E9F5F4",
        warmBeige: "#D8D5CF",
        softCream: "#F6F6F3",
        oliveGray: "#6D706B",
        ink: "#2E2D2C",
        paper: "#FFFFFF",
        night: "#343332",
        nightSoft: "#3B433A",
        success: "#3B6E60",
        alert: "#AC4735",
      },
      fontFamily: {
        // A marca usa Silvalyn; esta pilha mantém o desenho editorial até os
        // ficheiros licenciados da fonte serem adicionados ao projecto.
        title: ["Bodoni 72", "Didot", "Bodoni MT", "Times New Roman", "serif"],
        body: ["Avenir Next", "Inter", "SF Pro Text", "Segoe UI", "sans-serif"],
      },
      fontSize: {
        display: ["3rem", { lineHeight: "1.04", letterSpacing: "-0.04em" }],
        h1: ["2.25rem", { lineHeight: "1.08", letterSpacing: "-0.035em" }],
        h2: ["1.65rem", { lineHeight: "1.15", letterSpacing: "-0.025em" }],
        h3: ["1.25rem", { lineHeight: "1.25", letterSpacing: "-0.015em" }],
      },
      boxShadow: {
        glass: "0 22px 60px rgba(46, 45, 44, 0.055)",
        float: "0 12px 34px rgba(46, 45, 44, 0.09)",
      },
      backdropBlur: {
        glass: "22px",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
