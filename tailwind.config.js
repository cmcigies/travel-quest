/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sky: '#87CEEB',
        cloud: '#F0F8FF',
        grass: '#7BC67E',
        path: '#D4A96A',
        accent: '#FF6B9D',
        gold: '#FFD700',
        soft: '#FFF0F5',
      },
      fontFamily: {
        game: ['var(--font-game)'],
      },
      animation: {
        blink: 'blink 3s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
        bounce_slow: 'bounce 2s ease-in-out infinite',
        wiggle: 'wiggle 1s ease-in-out infinite',
        'star-pulse': 'starPulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        blink: {
          '0%, 90%, 100%': { transform: 'scaleY(1)' },
          '95%': { transform: 'scaleY(0.1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        starPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.3)', opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
