/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['SpaceMono', 'monospace'],
        heading: ['NeueMachina', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#1E1244',
          foreground: 'hsl(210 40% 98%)',    // text-slate-50
        },
        secondary: {
          DEFAULT: '#482AA2',
          foreground: 'hsl(210 40% 98%)', // text-slate-400
        },
        accent: {
          DEFAULT: '#0FC7D2',
          foreground: '#1E1244',
        },
        destructive: {
          DEFAULT: '#DE3D64',
          foreground: 'hsl(0 85.7% 97.3%)',
        },
      },
    },
  },
  plugins: [],
}
