/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Softmeal brand — expanded palette
        primary: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#2B7A4B',  // brand default
          800: '#166534',
          900: '#14532d',
          DEFAULT: '#2B7A4B',
        },
        accent: {
          DEFAULT: '#F5A623',
          light: '#FEF3C7',
        },
        // Surface levels for layered cards/sections
        surface: {
          1: '#ffffff',
          2: '#f9fafb',
          3: '#f3f4f6',
          4: '#e5e7eb',
        },
        muted: '#6b7280',
        border: '#e5e7eb',
        // IDDSI level colours (official Pantone-derived)
        iddsi: {
          0: '#FFFFFF',
          1: '#9B9B9B',
          2: '#E91E8C',
          3: '#FFD700',
          4: '#2E7D32',
          5: '#E65100',
          6: '#1565C0',
          7: '#E65100',
        },
      },
      fontFamily: {
        // CJK-aware font stack: Traditional Chinese → Simplified → Japanese → Latin
        sans: [
          '"PingFang TC"',
          '"Hiragino Sans"',
          '"Noto Sans CJK TC"',
          '"Microsoft JhengHei"',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
      },
      typography: {
        DEFAULT: {
          css: {
            lineHeight: '1.8',
            color: '#374151',
            a: { color: '#2B7A4B' },
            'h1, h2, h3': { fontWeight: '700' },
          },
        },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
};
