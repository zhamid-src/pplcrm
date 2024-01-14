const { createGlobPatternsForDependencies } = require('@nx/angular/tailwind');
const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(__dirname, 'src/**/!(*.stories|*.spec).{ts,html}'),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  theme: {
    extend: {
      animation: {
        down: 'down 0.2s ease-in-out',
        up: 'up 0.2s ease-in-out',
      },
      keyframes: {
        down: {
          '0%': {
            transform: 'translateY(-100%)',
          },
          '100%': {
            transform: 'translateY(0%)',
          },
        },
        up: {
          '0%': {
            transform: 'translateY(100%)',
          },
          '100%': {
            transform: 'translateY(0)',
          },
        },
      },
    },
  },
  daisyui: {
    themes: [
      {
        light: {
          ...require('daisyui/src/theming/themes')['light'],
          'primary-content': '#ffffff',
          primary: '#0ea5e9',
          secondary: '#14e8a6',
          accent: '#0c506e',
          neutral: '#cbd5e1',
          'neutral-content': '#1f2937',
          'base-100': '#ffffff',
          info: '#38bdf8',
          success: '#2dd4bf',
          warning: '#e5c963',
          error: '#f37373',
        },
      },
      {
        dark: {
          ...require('daisyui/src/theming/themes')['dark'],
          primary: '#00b5ff',
          secondary: '#00dfff',
          accent: '#0c506e',
          neutral: '#040404',
          'base-100': '#12232E',
          info: '#38bdf8',
          success: '#2dd4bf',
          warning: '#e5c963',
          error: '#ef4444',
        },
      },
    ],
  },

  plugins: [require('daisyui')],
};
