/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#0e0e0e',
        },
        neon: {
          cyan: '#22d3ee',
          purple: '#a855f7',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 16px 40px rgba(0,0,0,0.45)',
        'neon-cyan':
          '0 0 0 1px rgba(34,211,238,0.35), 0 0 30px rgba(34,211,238,0.18)',
        'neon-purple':
          '0 0 0 1px rgba(168,85,247,0.35), 0 0 30px rgba(168,85,247,0.18)',
      },
      backgroundImage: {
        'neon-radial':
          'radial-gradient(1200px circle at 10% 0%, rgba(34,211,238,0.14), transparent 55%), radial-gradient(900px circle at 90% 20%, rgba(168,85,247,0.12), transparent 55%)',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'pulse-soft': 'pulse-soft 1.6s ease-in-out infinite',
        floaty: 'floaty 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

