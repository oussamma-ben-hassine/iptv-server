/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        google: {
          blue: '#1a73e8',
          'blue-hover': '#174ea6',
          'blue-light': '#e8f0fe',
          green: '#1e8e3e',
          'green-light': '#e6f4ea',
          red: '#d93025',
          'red-light': '#fce8e6',
          yellow: '#f9ab00',
          'yellow-light': '#fef7e0',
          text: '#202124',
          subtext: '#5f6368',
          border: '#dadce0',
          bg: '#f8f9fa',
          surface: '#ffffff',
        },
        brand: {
          50: '#eff6ff',
          500: '#1a73e8',
          600: '#174ea6',
          700: '#185abc',
        }
      }
    },
  },
  plugins: [],
}

