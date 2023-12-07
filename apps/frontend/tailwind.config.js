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
          primary: "#0ea5e9",
          "primary-content": "#ffffff",
          secondary: "#14b8a6",
          accent: "#0c506e",
          neutral: "#cbd5e1",
          "neutral-content": "#454d63",
        },
      },
    ],
  },
  plugins: [require("daisyui")],
};
