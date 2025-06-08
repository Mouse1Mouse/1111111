/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: "#fff7ed",
        caramel: "#f5e9db",
        beige: "#fef2e9",
        graphite: "#3a3a3a",
        brandBrown: "#a66b3f",
        gold: "#d4af37"
      },
      fontFamily: {
        montserrat: ['Montserrat', 'sans-serif'],
      },
      animation: {
        fadeInUp: 'fadeInUp 1s ease-out forwards',
      },
      backgroundImage: {
        'gradient-luxury': 'linear-gradient(to bottom right, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};