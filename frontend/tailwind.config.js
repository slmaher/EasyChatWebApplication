/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'Inter', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        light: {
          ...require("daisyui/src/theming/themes")["light"],
          primary: "#0F766E",
          "primary-focus": "#115E59",
          secondary: "#2563EB",
          accent: "#14B8A6",
          neutral: "#0F172A",
          "base-100": "#F7FAFC",
          "base-200": "#EAF2F8",
          "base-300": "#D8E4EF",
          "base-content": "#0F172A",
        },
        synthwave: {
          ...require("daisyui/src/theming/themes")["synthwave"],
          primary: "#2DD4BF",
          "primary-focus": "#14B8A6",
          secondary: "#60A5FA",
          accent: "#34D399",
          neutral: "#020617",
          "base-100": "#07111F",
          "base-200": "#0B1627",
          "base-300": "#152338",
          "base-content": "#D9E8F5",
        },
      },
    ],
  },
}
