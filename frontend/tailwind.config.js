/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}" // Ensure Tailwind scans Vue components
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
