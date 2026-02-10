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
        'brand-green': 'var(--color-brand-green)',
        'brand-cream': 'var(--color-brand-cream)',
        'brand-black': 'var(--color-brand-black)',
        'primary': 'var(--color-primary)',
        'primary-dark': 'var(--color-primary-dark)',
        'text-dark': 'var(--color-text-dark)',
        'bg-light': 'var(--color-bg-light)',
        'bg-cream': 'var(--color-bg-cream)',
        'cartoon-lime': 'var(--color-cartoon-lime)',
        'cartoon-pink': 'var(--color-cartoon-pink)',
        'cartoon-orange': 'var(--color-cartoon-orange)',
        'cartoon-blue': 'var(--color-cartoon-blue)',
        'cartoon-purple': 'var(--color-cartoon-purple)',
        'cartoon-yellow': 'var(--color-cartoon-yellow)',
      },
      boxShadow: {
        'cartoon-sm': 'var(--shadow-cartoon-sm)',
        'cartoon-md': 'var(--shadow-cartoon-md)',
        'cartoon-lg': 'var(--shadow-cartoon-lg)',
        'cartoon-xl': 'var(--shadow-cartoon-xl)',
      },
      fontFamily: {
        sans: ['var(--font-nunito-sans)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        anton: ['var(--font-anton)', 'Impact', 'Arial Black', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
