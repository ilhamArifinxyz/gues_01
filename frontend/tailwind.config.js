/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        digital: ['"VT323"', 'monospace'],
        tech: ['"Chakra Petch"', 'sans-serif'],
        soft: ['"Quicksand"', 'sans-serif'],
        bubble: ['"Comfortaa"', 'cursive'],
      },
      colors: {
        canvas: '#D5DAD4',        /* Soft warm grey background */
        widget: '#E6EAE4',        /* Card widget off-white */
        'widget-pure': '#EFF3ED',
        ink: '#1E2322',           /* Dark charcoal manga ink */
        'ink-muted': '#58615E',
        'ink-light': '#8A9490',
        pill: '#242A28',          /* Inverted black pill */
      },
      boxShadow: {
        'art': '3px 4px 0px #1E2322',
        'art-sm': '2px 2px 0px #1E2322',
        'art-lg': '5px 6px 0px #1E2322',
        'art-pressed': '1px 1px 0px #1E2322',
      }
    },
  },
  plugins: [],
}
