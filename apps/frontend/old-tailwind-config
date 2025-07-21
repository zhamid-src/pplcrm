import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import daisyui from 'daisyui';
import { createGlobPatternsForDependencies } from '@nx/angular/tailwind';
import themes from 'daisyui/src/theming/themes/index.js'; // 👈 critical: add `.js`

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  content: [
    join(__dirname, 'src/**/!(*.stories|*.spec).{html,ts}'),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        light: {
          ...themes.light,
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
          ...themes.dark,
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
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0%)' },
        },
        up: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        right: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        flash: {
          '0%': { backgroundColor: '#afcea8' },
          '25%': { backgroundColor: '#bcd6b7' },
          '50%': { backgroundColor: '#c9dec5' },
          '75%': { backgroundColor: '#d7e6d4' },
          '100%': { backgroundColor: '#f2f7f1' },
        },
        drop: {
          '0%': { transform: 'translateY(-50%)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
      },
    },
  },
};
