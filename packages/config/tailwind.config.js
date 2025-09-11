/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./index.html",
  ],
  theme: {
    extend: {
      colors: {
        pva: {
          sage: {
            DEFAULT: "#3a5a40", // Deep Sage Green
            light: "#588157",
            dark: "#2c4231",
          },
          terracotta: {
            DEFAULT: "#a44a3f", // Warm Terracotta
            light: "#c95b4d",
            dark: "#7d3830",
          },
          gold: {
            DEFAULT: "#d4af37", // Deep Gold
          },
        },
      },
    },
  },
  plugins: [],
};
