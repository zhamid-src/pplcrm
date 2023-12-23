const { createGlobPatternsForDependencies } = require("@nx/angular/tailwind");
const { join } = require("path");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(__dirname, "src/**/!(*.stories|*.spec).{ts,html}"),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  theme: {
    extend: {},
  },
  daisyui: {
    themes: [
      {
        light: {
          ...require("daisyui/src/theming/themes")["light"],
          "primary-content": "#ffffff",
          primary: "#0ea5e9",
          secondary: "#14e8a6",
          accent: "#0c506e",
          neutral: "#cbd5e1",
          "base-100": "#ffffff",
          info: "#38bdf8",
          success: "#2dd4bf",
          warning: "#e5c963",
          error: "#ef4444",
        },
      },
      {
        dark: {
          ...require("daisyui/src/theming/themes")["dark"],
          primary: "#00b5ff",
          secondary: "#00dfff",
          accent: "#0c506e",
          neutral: "#040404",
          "base-100": "#12232E",
          info: "#38bdf8",
          success: "#2dd4bf",
          warning: "#e5c963",
          error: "#ef4444",
        },
      },
    ],
  },

  plugins: [require("daisyui")],
};
