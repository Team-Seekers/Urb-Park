/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        blueCar: 'blueCar 5s linear infinite',
        yellowCar: 'yellowCar 5s linear infinite',
        breathe: 'breathe 2s ease-in-out infinite',
      },
      keyframes: {
        blueCar: {
          '0%': { transform: 'translate(0, 0)' },
          '100%': { transform: 'translate(-100vw, 100vh)' },
        },
        yellowCar: {
          '0%': { transform: 'translate(0, 0)' },
          '100%': { transform: 'translate(100vw, -100vh)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
      }
    },
  },
  plugins: [],
}