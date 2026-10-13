import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: {
          light: '#F7F8FA',
          dark: '#0B1220',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#111827',
          elevated: {
            light: '#FAFBFC',
            dark: '#172033',
          },
        },
        border: {
          subtle: '#E5E7EB',
          dark: '#2F3A4D',
        },
        accent: {
          primary: '#2563EB',
          'primary-hover': '#1D4ED8',
          'primary-soft': '#DBEAFE',
          teal: '#0F766E',
          'teal-soft': '#CCFBF1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
