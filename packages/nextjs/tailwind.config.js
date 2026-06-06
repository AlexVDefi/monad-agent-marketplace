/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./utils/**/*.{js,ts,jsx,tsx}"],
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("daisyui")],
  darkTheme: "dark",
  darkMode: ["selector", "[data-theme='dark']"],
  // DaisyUI theme colors
  daisyui: {
    themes: [
      {
        light: {
          // Candy-shop chrome for the wallet connect button + dropdowns + modals.
          primary: "#6C5CE7",
          "primary-content": "#FFFFFF",
          secondary: "#FF7FB0",
          "secondary-content": "#FFFFFF",
          accent: "#1FAE78",
          "accent-content": "#FFFFFF",
          neutral: "#3A2E4A",
          "neutral-content": "#FFFFFF",
          "base-100": "#FFFFFF",
          "base-200": "#F6F0E4",
          "base-300": "#EFE7D8",
          "base-content": "#3A2E4A",
          info: "#5B8DEF",
          success: "#1FAE78",
          warning: "#E89A2B",
          error: "#EF5C86",

          "--rounded-btn": "9999rem",

          ".tooltip": {
            "--tooltip-tail": "6px",
          },
          ".link": {
            textUnderlineOffset: "2px",
          },
          ".link:hover": {
            opacity: "80%",
          },
        },
      },
      {
        dark: {
          primary: "#200052",
          "primary-content": "#F9FBFF",
          secondary: "#836EF9",
          "secondary-content": "#F9FBFF",
          accent: "#4969A6",
          "accent-content": "#F9FBFF",
          neutral: "#F9FBFF",
          "neutral-content": "#836EF9",
          "base-100": "#836EF9",
          "base-200": "#200052",
          "base-300": "#200052",
          "base-content": "#F9FBFF",
          info: "#A0055D",
          success: "#34EEB6",
          warning: "#FFCF72",
          error: "#FF8863",

          "--rounded-btn": "9999rem",

          ".tooltip": {
            "--tooltip-tail": "6px",
            "--tooltip-color": "oklch(var(--p))",
          },
          ".link": {
            textUnderlineOffset: "2px",
          },
          ".link:hover": {
            opacity: "80%",
          },
        },
      },
    ],
  },
  theme: {
    extend: {
      boxShadow: {
        center: "0 0 12px -2px rgb(0 0 0 / 0.05)",
      },
      animation: {
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
};
