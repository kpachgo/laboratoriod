/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Public Sans"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: '#F5F6F3',
        surface: '#FFFFFF',
        border: '#DCE2DF',
        divider: '#EAEDEC',
        dashed: '#C7CFCC',
        text: {
          DEFAULT: '#1C2624',
          secondary: '#5C6A67',
          muted: '#9AA6A3',
          faint: '#6E7A77',
        },
        primary: {
          DEFAULT: '#0E7C86',
          dark: '#0A5D65',
          light: '#E3F1F0',
        },
        status: {
          procesoBg: '#FBEEDD',
          procesoText: '#9A5C0A',
          procesoDot: '#C2790A',
          finalBg: '#E7EEF8',
          finalText: '#2E5FA3',
          entregadoBg: '#E7F5EC',
          entregadoText: '#2F8F5B',
        },
      },
      borderRadius: {
        card: '14px',
        input: '9px',
      },
    },
  },
  plugins: [],
};
