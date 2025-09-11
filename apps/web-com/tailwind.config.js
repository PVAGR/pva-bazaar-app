import base from "@pva/config/tailwind.config";

/** @type {import('tailwindcss').Config} */
export default {
  ...base,
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}"
  ]
};
