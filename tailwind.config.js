/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // AM2PM warm golden palette
        gold: {
          50:  '#fffde8',
          100: '#fef9c3',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#f5c842',
          500: '#e8a800',
          600: '#c9960a',
          700: '#a07010',
          800: '#7a5000',
          900: '#5a3c00',
        },
        cream: {
          50:  '#fefefe',
          100: '#fffdf5',
          200: '#fdf6e3',
          300: '#f5e9c8',
          400: '#ece0b0',
          500: '#e0d098',
        },
        // Green for battle cards
        battle: {
          light: '#e8f8f0',
          mid:   '#d0f0e0',
          border:'#a8dfc0',
          dark:  '#0a7a3c',
        },
        // kept for admin pages
        navy: {
          900: '#0d1440',
          950: '#080d2e',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Rajdhani', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        'full': '9999px',
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'live-pulse': 'livePulse 1.2s infinite',
        'spin':       'spin 1s linear infinite',
        'marquee':    'marquee 30s linear infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        livePulse: { '0%,100%': { opacity: 1, transform: 'scale(1)' }, '50%': { opacity: 0.5, transform: 'scale(1.4)' } },
        marquee:   { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
      },
      boxShadow: {
        'gold':   '0 3px 12px rgba(201,150,10,0.25)',
        'green':  '0 3px 12px rgba(10,122,60,0.2)',
        'card':   '0 2px 10px rgba(180,140,0,0.08)',
      },
    },
  },
  plugins: [],
};
