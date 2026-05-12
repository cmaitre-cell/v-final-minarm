/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Marianne"', '"IBM Plex Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
        display: ['"Marianne"', '"Space Grotesk"', "sans-serif"],
      },
      colors: {
        // Fond institutionnel — DSFR light theme + accents bleu clair pour panels
        ink: {
          950: "#FFFFFF",
          900: "#F5F5FE", // background-alt-blue-france
          800: "#ECECFE", // background-contrast-blue-france
          700: "#E3E3FD", // border subtle blue-france-950
          600: "#CACAFB", // border-action-low-blue-france
          500: "#9A9AF8",
        },
        // Texte hiérarchique — fort contraste DSFR
        steel: {
          400: "#636878",
          300: "#454C5C",
          200: "#2E3345",
          100: "#11142B",
        },
        // Bleu France DSFR
        signal: {
          DEFAULT: "#000091",
          dim: "#E8E8F8",
          hover: "#1212CC",
        },
        // Codes opérationnels de sévérité
        alert: {
          critical: "#CE0500",
          high: "#C64A00",
          medium: "#8B5E00",
          low: "#18753C",
          nominal: "#18753C",
        },
        dsfr: {
          blue: "#000091",
          "blue-hover": "#1212CC",
          "blue-light": "#E8E8F8",
          red: "#E1000F",
          white: "#FFFFFF",
          grey: "#F4F5F7",
          text: "#11142B",
          "text-muted": "#636878",
          border: "#D0D3D9",
        },
      },
      borderRadius: {
        sm: "8px",
      },
      boxShadow: {
        panel: "0 2px 8px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)",
        "panel-hover": "0 6px 20px rgba(0,0,0,0.11), 0 0 0 1px rgba(0,0,0,0.07)",
        glow: "0 0 28px -6px rgba(0,0,145,0.3)",
        "glow-critical": "0 0 20px -4px rgba(206,5,0,0.35)",
      },
      keyframes: {
        pulse_dot: {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.15)" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        sweep: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        pulse_dot: "pulse_dot 1.8s ease-in-out infinite",
        scan: "scan 4s linear infinite",
        sweep: "sweep 6s linear infinite",
      },
    },
  },
  plugins: [],
};
