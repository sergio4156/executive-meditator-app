import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0F1E35',
          900: '#1B2B4B',
          800: '#243354',
        },
        sage: {
          600: '#6B8F77',
          500: '#7B9E87',
          300: '#A8C4B0',
        },
        gold: {
          600: '#B89A50',
          500: '#C4A962',
          400: '#D4B96A',
        },
        cream: {
          50: '#FFFDF9',
          100: '#F8F5F0',
          200: '#F2EDE6',
        },
        text: {
          primary: '#1A1A2E',
          muted: '#4A5568',
        },
      },
      fontFamily: {
        serif: ['var(--font-cormorant)', 'Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float-slow': 'float 8s ease-in-out infinite',
        'float-slower': 'float 12s ease-in-out infinite reverse',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
