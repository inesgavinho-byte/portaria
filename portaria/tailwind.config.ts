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
        // Paleta GAVINHO — usada como base; cada tenant pode override via CSS vars
        warmBeige: "#ADAA96",
        softCream: "#F2F0E7",
        oliveGray: "#8B8670",
        // Sistema neutro
        ink: "#1A1A1A",
        paper: "#FFFFFF",
        // Tons escuros da landing
        night: "#0A0A0D",
        nightSoft: "#121217",
        // Variantes funcionais
        success: "#5A7A5A",
        alert: "#8B3A3A",
      },
      fontFamily: {
        // Cormorant Garamond para títulos
        title: ["var(--font-title)", "Cormorant Garamond", "Georgia", "serif"],
        // Quattrocento Sans para corpo
        body: ["var(--font-body)", "Quattrocento Sans", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Tipografia em escala harmoniosa
        "display": ["3.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "h1": ["2.5rem", { lineHeight: "1.2" }],
        "h2": ["1.875rem", { lineHeight: "1.3" }],
        "h3": ["1.375rem", { lineHeight: "1.4" }],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
