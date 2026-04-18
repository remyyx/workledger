/**
 * Version 00 — Tailwind theme extension snapshot.
 * Only the extend block; merge into tailwind.config.ts if restoring v00.
 */
export const version00ThemeExtend = {
  colors: {
    gray: {
      50: '#FAFAFA',
      100: '#F2F2F2',
      200: '#E6E6E6',
      300: '#D4D4D4',
      400: '#A3A3A3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0D0D0D',
    },
  },
  fontFamily: {
    sans: ['var(--font-dm-sans)', 'system-ui', '-apple-system', 'sans-serif'],
    mono: ['var(--font-jetbrains)', 'ui-monospace', 'monospace'],
  },
  animation: {
    'fade-in': 'fadeIn 0.3s ease-out forwards',
    'slide-in': 'slideIn 0.3s ease-out forwards',
  },
  keyframes: {
    fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
    slideIn: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
  },
};
