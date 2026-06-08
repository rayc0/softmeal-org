#!/usr/bin/env node
/**
 * IDDSI SVG Generator — 8 levels × 4 locales = 32 SVGs
 * Output: public/iddsi/level-<n>-<locale>.svg
 * Style: 1.5px ink stroke, congee-cream fill, <text> label per locale
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '../public/iddsi');

mkdirSync(OUT_DIR, { recursive: true });

// Official IDDSI level colours
const LEVEL_COLORS = [
  '#E0E0E0', // 0 Thin        — light grey (white renders invisible)
  '#BDBDBD', // 1 Slightly Thick — silver
  '#F8A4C8', // 2 Mildly Thick   — pink
  '#FFD600', // 3 Mod Thick      — yellow
  '#F7941D', // 4 Pureed         — orange
  '#EE2A24', // 5 Minced         — red
  '#00AEEF', // 6 Soft           — blue
  '#00A651', // 7 Regular        — green
];

// Text colour on each band (dark for light fills, white for vivid)
const LABEL_COLOR = [
  '#1A1A1A', '#1A1A1A', '#1A1A1A', '#1A1A1A',
  '#1A1A1A', '#FFFFFF', '#1A1A1A', '#FFFFFF',
];

// IDDSI level names per locale
const NAMES = {
  en: [
    'Thin',
    'Slightly Thick',
    'Mildly Thick',
    'Moderately Thick',
    'Pureed',
    'Minced & Moist',
    'Soft & Bite-Sized',
    'Regular',
  ],
  'zh-hk': [
    '稀薄',
    '稍稠',
    '輕度稠',
    '中度稠',
    '糊狀',
    '碎粒帶汁',
    '軟嫩易咬',
    '一般食物',
  ],
  'zh-cn': [
    '稀薄',
    '稍稠',
    '轻度稠',
    '中度稠',
    '糊状',
    '碎粒带汁',
    '软嫩易咬',
    '一般食物',
  ],
  ja: [
    'うすい',
    'やや濃い',
    '軽度濃い',
    '中程度濃い',
    'ペースト',
    'きざみ食',
    '軟菜食',
    '普通食',
  ],
};

// English subtitle shown on non-English cards for reference
const EN_SUBTITLE = NAMES.en;

// Visual motif path per level (centred in 200 × 100 region, y-offset ~75)
// All paths use 1.5px ink stroke; fill uses the level colour at 20% opacity.

function motif(level, color) {
  const c20 = color + '33'; // ~20% opacity hex shorthand

  if (level <= 2) {
    // Funnel / drip: three descending horizontal waves
    return `
  <!-- liquid-flow motif -->
  <path d="M50,90 Q75,80 100,90 Q125,100 150,90" fill="none" stroke="#1A1A1A" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M50,107 Q75,97 100,107 Q125,117 150,107" fill="none" stroke="#1A1A1A" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M50,124 Q75,114 100,124 Q125,134 150,124" fill="none" stroke="#1A1A1A" stroke-width="1.5" stroke-linecap="round"/>
  <!-- drip drop -->
  <path d="M100,138 Q106,148 100,155 Q94,148 100,138Z" fill="${c20}" stroke="#1A1A1A" stroke-width="1.5" stroke-linejoin="round"/>`;
  }

  if (level <= 4) {
    // Bowl with smooth surface — thick / pureed
    return `
  <!-- bowl motif -->
  <path d="M45,100 Q45,150 100,150 Q155,150 155,100Z" fill="${c20}" stroke="#1A1A1A" stroke-width="1.5" stroke-linejoin="round"/>
  <line x1="45" y1="100" x2="155" y2="100" stroke="#1A1A1A" stroke-width="1.5" stroke-linecap="round"/>
  <!-- spoon -->
  <line x1="100" y1="155" x2="100" y2="175" stroke="#1A1A1A" stroke-width="1.5" stroke-linecap="round"/>
  <ellipse cx="100" cy="85" rx="18" ry="12" fill="${c20}" stroke="#1A1A1A" stroke-width="1.5"/>`;
  }

  if (level === 5) {
    // Minced: fork + scattered crumble dots
    return `
  <!-- minced motif -->
  <!-- fork handle -->
  <line x1="90" y1="145" x2="90" y2="165" stroke="#1A1A1A" stroke-width="1.5" stroke-linecap="round"/>
  <!-- fork head -->
  <rect x="78" y="90" width="24" height="40" rx="4" fill="none" stroke="#1A1A1A" stroke-width="1.5"/>
  <line x1="84" y1="90" x2="84" y2="130" stroke="#1A1A1A" stroke-width="1.5"/>
  <line x1="90" y1="90" x2="90" y2="130" stroke="#1A1A1A" stroke-width="1.5"/>
  <line x1="96" y1="90" x2="96" y2="130" stroke="#1A1A1A" stroke-width="1.5"/>
  <!-- crumble dots -->
  <circle cx="130" cy="95"  r="5" fill="${c20}" stroke="#1A1A1A" stroke-width="1.5"/>
  <circle cx="145" cy="108" r="4" fill="${c20}" stroke="#1A1A1A" stroke-width="1.5"/>
  <circle cx="128" cy="118" r="6" fill="${c20}" stroke="#1A1A1A" stroke-width="1.5"/>
  <circle cx="143" cy="128" r="5" fill="${c20}" stroke="#1A1A1A" stroke-width="1.5"/>
  <circle cx="133" cy="140" r="4" fill="${c20}" stroke="#1A1A1A" stroke-width="1.5"/>`;
  }

  if (level === 6) {
    // Soft bite-sized: knife + fork with soft chunks
    return `
  <!-- soft / bite-sized motif -->
  <!-- fork -->
  <line x1="78" y1="150" x2="78" y2="168" stroke="#1A1A1A" stroke-width="1.5" stroke-linecap="round"/>
  <rect x="68" y="90" width="20" height="45" rx="4" fill="none" stroke="#1A1A1A" stroke-width="1.5"/>
  <line x1="74" y1="90" x2="74" y2="135" stroke="#1A1A1A" stroke-width="1.5"/>
  <line x1="80" y1="90" x2="80" y2="135" stroke="#1A1A1A" stroke-width="1.5"/>
  <line x1="86" y1="90" x2="86" y2="135" stroke="#1A1A1A" stroke-width="1.5"/>
  <!-- knife -->
  <line x1="118" y1="168" x2="118" y2="90" stroke="#1A1A1A" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M118,90 Q132,90 132,110 L118,110Z" fill="${c20}" stroke="#1A1A1A" stroke-width="1.5"/>
  <!-- soft chunk -->
  <rect x="90" y="115" width="22" height="18" rx="5" fill="${c20}" stroke="#1A1A1A" stroke-width="1.5"/>`;
  }

  // Level 7: full plate (fork + knife + circle plate)
  return `
  <!-- regular-meal motif -->
  <!-- plate circle -->
  <circle cx="100" cy="125" r="50" fill="${c20}" stroke="#1A1A1A" stroke-width="1.5"/>
  <circle cx="100" cy="125" r="38" fill="none" stroke="#1A1A1A" stroke-width="1.5"/>
  <!-- fork left of plate -->
  <line x1="40" y1="90" x2="40" y2="165" stroke="#1A1A1A" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="35" y1="90" x2="35" y2="112" stroke="#1A1A1A" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="45" y1="90" x2="45" y2="112" stroke="#1A1A1A" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M35,112 Q40,118 45,112" fill="none" stroke="#1A1A1A" stroke-width="1.5"/>
  <!-- knife right of plate -->
  <line x1="160" y1="90" x2="160" y2="165" stroke="#1A1A1A" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M160,90 Q172,90 172,108 L160,108Z" fill="${c20}" stroke="#1A1A1A" stroke-width="1.5"/>`;
}

// Wraps multi-line label text into two <tspan> if name length > 6 CJK or > 12 Latin chars
function labelLines(name, locale) {
  const isCJK = locale !== 'en';
  const maxChar = isCJK ? 5 : 12;
  if (name.length <= maxChar) {
    return `<text x="100" y="198" text-anchor="middle" dominant-baseline="middle"
      font-family="'Noto Sans CJK SC','Noto Sans',Arial,sans-serif"
      font-size="18" font-weight="600" fill="#1A1A1A">${name}</text>`;
  }
  // Split at midpoint
  const mid = Math.ceil(name.length / 2);
  const line1 = name.slice(0, mid);
  const line2 = name.slice(mid);
  return `<text text-anchor="middle"
    font-family="'Noto Sans CJK SC','Noto Sans',Arial,sans-serif"
    font-size="16" font-weight="600" fill="#1A1A1A">
    <tspan x="100" y="191">${line1}</tspan>
    <tspan x="100" dy="20">${line2}</tspan>
  </text>`;
}

function generateSVG(level, locale) {
  const color = LEVEL_COLORS[level];
  const labelCol = LABEL_COLOR[level];
  const name = NAMES[locale][level];
  const enName = EN_SUBTITLE[level];
  const showEnSub = locale !== 'en';
  const CONGEE = '#FFF8ED';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 200 240" width="200" height="240"
     role="img" aria-label="IDDSI Level ${level} – ${enName}">
  <title>IDDSI Level ${level} – ${enName}</title>

  <!-- card background (congee cream) -->
  <rect width="200" height="240" rx="14" fill="${CONGEE}"/>

  <!-- colour header band -->
  <clipPath id="top-clip-${level}-${locale}">
    <rect width="200" height="240" rx="14"/>
  </clipPath>
  <rect width="200" height="68" fill="${color}"
        clip-path="url(#top-clip-${level}-${locale})"/>

  <!-- IDDSI wordmark -->
  <text x="100" y="18" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial,sans-serif" font-size="10" font-weight="700"
        letter-spacing="3" fill="${labelCol}">IDDSI</text>

  <!-- level number -->
  <text x="100" y="48" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial,sans-serif" font-size="38" font-weight="900"
        fill="${labelCol}">${level}</text>

  <!-- visual motif -->
  ${motif(level, color)}

  <!-- locale label -->
  ${labelLines(name, locale)}

  <!-- English subtitle (non-English locales) -->
  ${showEnSub ? `<text x="100" y="220" text-anchor="middle" dominant-baseline="middle"
    font-family="Arial,sans-serif" font-size="10" fill="#888888">${enName}</text>` : ''}

  <!-- card outline — 1.5px ink stroke -->
  <rect x="0.75" y="0.75" width="198.5" height="238.5" rx="13.5"
        fill="none" stroke="#1A1A1A" stroke-width="1.5"/>
</svg>
`;
}

const locales = ['en', 'zh-hk', 'zh-cn', 'ja'];
let count = 0;

for (const locale of locales) {
  for (let level = 0; level <= 7; level++) {
    const svg = generateSVG(level, locale);
    const filename = `level-${level}-${locale}.svg`;
    writeFileSync(join(OUT_DIR, filename), svg, 'utf8');
    count++;
    console.log(`  ✓ ${filename}`);
  }
}

console.log(`\nGenerated ${count} SVGs → public/iddsi/`);
