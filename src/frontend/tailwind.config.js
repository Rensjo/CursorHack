/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Instrument Serif"', "serif"],
        sans: ['"Geist"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        // Warm dark palette — feels like a forensic terminal, not a SaaS app.
        bg: "#0c0908",
        surface: "#161412",
        "surface-hi": "#1f1c19",
        border: "#2a2725",
        "border-hi": "#3a3633",
        text: "#f5f0e8",
        muted: "#8b8580",
        faint: "#5a554f",

        // Amber accent — archival, evidence-doc feel.
        accent: {
          DEFAULT: "#e8a44a",
          hi: "#f4b15c",
          dim: "#a87830",
        },

        // Verdict colors — muted versions of the heatmap palette.
        verdict: {
          green: "#5a9a5a",
          yellow: "#d4a040",
          orange: "#d47a40",
          red: "#c44a4a",
        },
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
