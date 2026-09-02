import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        gold: '#D4AF37',
        'noble-blue': '#0A2B5B',
        'night-blue': '#031A36',
        'off-black': '#0B0B0B',
        'off-white': '#F8F6F8',
        bronze: '#B8860B',
      },
      fontFamily: {
        serif: ['var(--font-cinzel)', 'Cinzel', 'Georgia', 'serif'],
        sans: ['var(--font-montserrat)', 'Montserrat', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
