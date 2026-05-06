/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Softmeal brand
        primary: '#2B7A4B',
        accent: '#F5A623',
        // IDDSI level colours (official Pantone-derived)
        iddsi: {
          0: '#FFFFFF',  // Level 0 Thin — white
          1: '#9B9B9B',  // Level 1 Slightly Thick — grey
          2: '#FF69B4',  // Level 2 Mildly Thick — pink (PANTONE 212 PC)
          3: '#FFD700',  // Level 3 Moderately Thick — yellow (PANTONE DS 2-4C)
          4: '#4CAF50',  // Level 4 Puréed — green (PANTONE 368 PC)
          5: '#FF8C00',  // Level 5 Minced & Moist — orange (PANTONE 172 PC)
          6: '#1565C0',  // Level 6 Soft & Bite-Sized — blue (PANTONE 2935 PC)
          7: '#FF8C00',  // Level 7EC Easy Chew — orange (same as 5, with EC tag)
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
