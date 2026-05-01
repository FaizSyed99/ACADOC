import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#089a9b',
          container: 'rgba(8, 154, 155, 0.1)',
          fixed: {
            dim: '#66d8d8'
          }
        },
        surface: {
          container: {
            DEFAULT: 'rgba(15, 23, 42, 0.5)',
            high: 'rgba(30, 41, 59, 0.8)'
          },
          'on-surface': '#f8fafc',
          'on-surface-variant': '#94a3b8'
        }
      },
      fontFamily: {
        manrope: ['var(--font-manrope)', 'sans-serif'],
        'space-grotesk': ['var(--font-space-grotesk)', 'sans-serif'],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
