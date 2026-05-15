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
        // Starry Night — deep Prussian blues, cool moonlight, archival cream text.
        bg: "#071525",
        surface: "rgba(16, 38, 62, 0.72)",
        "surface-hi": "rgba(24, 52, 82, 0.78)",
        border: "rgba(100, 150, 190, 0.28)",
        "border-hi": "rgba(180, 210, 235, 0.38)",
        text: "#f4f1e8",
        muted: "#9fb4c9",
        faint: "#5c7694",

        // Golden starlight accent (moon & stars from the painting).
        accent: {
          DEFAULT: "#e8cf5a",
          hi: "#f5e088",
          dim: "#b89a38",
        },

        // Verdict colors — jewel tones that stay legible on a blue night field.
        verdict: {
          green: "#6bc4a8",
          yellow: "#e0c86a",
          orange: "#e8a06a",
          red: "#e07078",
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
        "sky-spin": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "sky-spin-ccw": {
          from: { transform: "rotate(360deg)" },
          to: { transform: "rotate(0deg)" },
        },
        "star-twinkle": {
          "0%, 100%": { opacity: "0.35", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.15)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
        "sky-spin": "sky-spin 200s linear infinite",
        "sky-spin-ccw": "sky-spin-ccw 260s linear infinite",
        "star-twinkle": "star-twinkle var(--tw-duration, 3.5s) ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
