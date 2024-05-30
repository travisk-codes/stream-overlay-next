import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      animation: {
        'marquee-top-1': 'marquee-top-1 30s linear infinite',
        'marquee-top-2': 'marquee-top-2 30s linear infinite',
        'marquee-top-3': 'marquee-top-3 30s linear infinite',
        'marquee-bottom-1': 'marquee-bottom-1 20s linear infinite',
        'marquee-bottom-2': 'marquee-bottom-2 20s linear infinite',
        'marquee-bottom-3': 'marquee-bottom-3 20s linear infinite',
      },
      keyframes: {
        'marquee-top-1': {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)'},
        },
        'marquee-top-2': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0%)' },
        },
        'marquee-top-3': {
          '0%': { transform: 'translateX(200%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'marquee-bottom-1': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0%)'},
        },
        'marquee-bottom-2': {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'marquee-bottom-3': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
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
