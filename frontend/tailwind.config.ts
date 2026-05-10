import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0D9488', // Accent Teal
          dark: '#0F766E', // Accent Dark Teal
          container: 'rgba(13, 148, 136, 0.1)',
        },
        surface: {
          DEFAULT: '#FFFFFF', // Background Secondary
          cream: '#FAFAF8', // Background Primary
          'on-surface': '#0F172A', // Text Primary
          'on-surface-variant': '#64748B', // Text Secondary
        },
        border: {
          subtle: '#E2E8F0', // Border Subtle
          focus: '#0D9488', // Border Focus
        },
        semantic: {
          success: '#10B981', // Success Green
          error: '#DC2626', // Error Red
        }
      },
      fontFamily: {
        serif: ['Playfair Display', 'Merriweather', 'serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['monospace'],
        manrope: ['var(--font-manrope)', 'sans-serif'],
        'space-grotesk': ['var(--font-space-grotesk)', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 6px -1px rgba(0,0,0,0.02), 0 10px 15px -3px rgba(0,0,0,0.02)',
        elevated: '0 20px 25px -5px rgba(0,0,0,0.05)',
        input: '0 -4px 12px rgba(0,0,0,0.03)',
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config;
