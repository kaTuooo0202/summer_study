// tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/IntegrationCalendar.{js,jsx,ts,tsx}", // ← この行を追加・確認
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}