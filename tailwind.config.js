/** @type {import('tailwindcss').Config} */
// Dose Certa brand tokens. Keep in sync with src/shared/brand.ts (checked by src/brandIdentity.test.ts).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Petróleo (700) and lighter/darker steps for states.
        brand: { 50: '#E6F4F1', 100: '#CDE7E3', 200: '#9FCFC9', 600: '#0E7180', 700: '#0B5F6B', 800: '#084852', 900: '#063840' },
        // Âmbar: fills for highlights and alerts, always with ink text.
        accent: { 100: '#FDEBD3', 500: '#F2A23A', 600: '#D9871F' },
        ink: '#1F2D30', // Grafite: main text
        muted: '#4B5B5E', // Cinza: secondary text
        mist: '#F7FBFA', // Névoa: app background
        mint: '#E6F4F1', // Menta: soft backgrounds
      },
      fontFamily: {
        display: ['Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
      },
      // Minimum text size is 18px (1rem): small sizes never go below the body text.
      fontSize: {
        xs: ['1rem', { lineHeight: '1.4' }],
        sm: ['1rem', { lineHeight: '1.4' }],
      },
    },
  },
  plugins: [],
};
