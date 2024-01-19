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
        right: 'right 0.2s ease-in-out',
        flash: 'flash 0.3s ease-in-out',
        drop: 'drop 0.4s ease-in-out',
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
        right: {
          '0%': {
            transform: 'translateX(-100%)',
          },
          '100%': {
            transform: 'translateX(0)',
          },
        },
        flash: {
          '0%': {
            'background-color': '#afcea8',
          },
          '25%': {
            'background-color': '#bcd6b7',
          },
          '50%': {
            'background-color': '#c9dec5',
          },
          '75%': {
            'background-color': '#d7e6d4',
          },
          '100%': {
            'background-color': '#f2f7f1',
          },
        },
        drop: {
          '0%': {
            transform: 'translateY(-50%)',
            opacity: 0,
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: 1,
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
          'base-300': '#f0f0f0',
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
          'base-300': '#334f61',
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
