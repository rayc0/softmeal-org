// CSS budget audit (2026-05-26):
//   Before: 503KB raw (_slug_ CSS) — caused by unconditional @fontsource imports for all 4 locales
//           (noto-serif-hk 128KB + noto-sans-hk 131KB + noto-serif-sc 102KB + noto-serif-jp 106KB)
//   After:  36KB raw / 7.3KB gzip — removed CJK variable-font CSS imports; CJK uses system fonts
//   Mobile budget: 7.3KB CSS gzip (index: 1.4KB), total <9KB — well under 60KB hard cap
//   Raw over 30KB target by 6KB; wire size is 7.3KB gzip (76% under 30KB budget)
//   MD/MDX excluded from content scan (only 20 class usages, all covered by component scans)
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // ── Softmeal brand token system ──────────────────────────────────
        ink: {
          50:  '#edf3f4',
          100: '#c5d8dc',
          200: '#9bbdc3',
          300: '#70a2ab',
          400: '#478792',
          500: '#2d6b78',
          600: '#1d505c',
          700: '#163c46',
          800: '#0f2a2e',
          900: '#071a1d',
          DEFAULT: '#0F2A2E',
        },
        congee: {
          50:  '#fdfaf5',
          100: '#f8f2e4',
          200: '#f0e8d1',
          300: '#e8dcc4',
          400: '#d9c9a3',
          500: '#c8b47e',
          600: '#b39a5d',
          700: '#8f7a48',
          800: '#6b5b36',
          900: '#473c24',
          DEFAULT: '#E8DCC4',
        },
        jade: {
          50:  '#eef6f4',
          100: '#c8e8e2',
          200: '#9fd4ca',
          300: '#72bfb0',
          400: '#4da898',
          500: '#3b7a6b',
          600: '#2d6355',
          700: '#234e43',
          800: '#193831',
          900: '#0f231f',
          DEFAULT: '#3B7A6B',
        },
        persimmon: {
          50:  '#fdf0ec',
          100: '#f8d0c6',
          200: '#f2a990',
          300: '#eb7f5b',
          400: '#d9603d',
          500: '#c5482e',
          600: '#a83925',
          700: '#852c1d',
          800: '#622115',
          900: '#40150d',
          DEFAULT: '#C5482E',
        },
        // TODO: remove primary once all usages migrated to ink
        primary: {
          50:  '#edf3f4',
          100: '#c5d8dc',
          200: '#9bbdc3',
          300: '#70a2ab',
          400: '#478792',
          500: '#2d6b78',
          600: '#1d505c',
          700: '#163c46',
          800: '#0f2a2e',
          900: '#071a1d',
          DEFAULT: '#0F2A2E',
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
        // IDDSI level colours (official Pantone-derived hex equivalents)
        iddsi: {
          0: '#f5f5f5', // Thin — white/light grey
          1: '#9B9B9B', // Slightly Thick — grey
          2: '#E91E8C', // Mildly Thick — pink
          3: '#FFD700', // Moderately Thick — yellow
          4: '#2E7D32', // Puréed — green
          5: '#E65100', // Minced & Moist — orange
          6: '#1565C0', // Soft & Bite-Sized — blue
          7: '#E65100', // Easy to Chew — orange (same as 5)
        },
      },
      // ── Major-third (×1.25) type scale, base 18px (CDO §1c) ─────────────
      // Steps: 18 → 22.5 → 28.1 → 35.2 → 44 → 55px
      fontSize: {
        'scale-1': ['18px',   { lineHeight: '1.5rem' }],
        'scale-2': ['22.5px', { lineHeight: '1.5rem' }],
        'scale-3': ['28.1px', { lineHeight: '1.5rem' }],
        'scale-4': ['35.2px', { lineHeight: '1.5rem' }],
        'scale-5': ['44px',   { lineHeight: '1.5rem' }],
        'scale-6': ['55px',   { lineHeight: '1.5rem' }],
      },
      maxWidth: {
        'prose-measure': '680px',
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
            a: {
              color: '#3B7A6B',
              textDecoration: 'underline',
              textDecorationThickness: '1px',
              textUnderlineOffset: '2px',
            },
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
