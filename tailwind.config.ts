import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#e6f7ef",
          100: "#ccefdf",
          200: "#99dfbf",
          300: "#66cf9f",
          400: "#33bf7f",
          500: "#00913A",
          600: "#007a31",
          700: "#006328",
          800: "#004c1f",
          900: "#003516",
        },
        arkreen: {
          DEFAULT: "#00913A",
          light: "#33bf7f",
          dark: "#006328",
        },
      },
      animation: {
        fadeIn: "fadeIn 0.6s ease-in",
        slideUp: "slideUp 0.5s ease-out",
        "spin-slow": "spin 1.5s linear infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
