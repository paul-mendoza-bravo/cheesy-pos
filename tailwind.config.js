/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {},
  },
  // Preflight desactivado para no pisar el sistema de CSS variables existente del POS
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};
