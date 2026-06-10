/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  // Preflight is disabled so Tailwind's reset doesn't fight Naive UI's
  // component styles (buttons, inputs). A minimal reset lives in style.css.
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        ink: '#101622',
        panel: '#172033',
        edge: '#243049',
      },
    },
  },
  plugins: [],
};
