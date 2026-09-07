/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
      "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
      extend: {
        screens: {
          xs: '420px',
        },
        fontFamily: {
          sans: ['"Quicksand"', 'ui-rounded', '"Segoe UI"', 'system-ui', 'sans-serif'],
        },
        boxShadow: {
          'glass': '0 8px 32px rgba(147, 51, 234, 0.08), 0 2px 8px rgba(0,0,0,0.04)',
          'glass-lg': '0 20px 60px rgba(147, 51, 234, 0.14), 0 4px 12px rgba(0,0,0,0.05)',
          'glow': '0 0 24px rgba(192, 38, 211, 0.35)',
          'glow-sm': '0 0 12px rgba(192, 38, 211, 0.25)',
        },
        keyframes: {
          'float': {
            '0%, 100%': { transform: 'translateY(0px) rotate(0deg)', opacity: '0.6' },
            '50%': { transform: 'translateY(-22px) rotate(10deg)', opacity: '0.85' },
          },
          'drift': {
            '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
            '33%': { transform: 'translate(30px, -40px) scale(1.08)' },
            '66%': { transform: 'translate(-25px, 25px) scale(0.95)' },
          },
          'shimmer': {
            '0%': { backgroundPosition: '-200% center' },
            '100%': { backgroundPosition: '200% center' },
          },
        },
        animation: {
          float: 'float 6s ease-in-out infinite',
          drift: 'drift 18s ease-in-out infinite',
          shimmer: 'shimmer 3s linear infinite',
        },
      },
    },
    plugins: [],
  }
