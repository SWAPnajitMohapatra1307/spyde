/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        spyde: {
          // Canvas & Surfaces (Design.md §1.1)
          canvas: '#13161A',
          'surface-1': '#1D2128',
          'surface-2': '#272C35',
          hairline: '#333A45',

          // Typography Colors (Design.md §1.2)
          bone: '#F5F2E9',      // Warm Bone — primary text (NOT #FFFFFF)
          sand: '#A1A1AA',      // Sand — secondary text
          muted: '#71717A',     // Muted — disabled states

          // Brand Primary (Design.md §1.3)
          jade: '#1A8276',       // Muted Jade — PASS, primary CTA
          'jade-press': '#136359',
          'jade-wash': 'rgba(26, 130, 118, 0.15)',

          // Semantic Risk Palette (Design.md §1.4)
          amber: '#D97706',      // Honey Amber — WARN (50-74)
          terracotta: '#C2410C', // Terracotta — CHALLENGE (75-89)
          ruby: '#9F1239',       // Deep Ruby — BLOCK (90-100)
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Roboto Mono', 'monospace'],
      },
      fontSize: {
        // Design.md §2.1 Typography Scale (weight 300 = thin)
        'display-xl': ['48px', { lineHeight: '1.1', letterSpacing: '-0.96px', fontWeight: '300' }],
        'display-lg': ['32px', { lineHeight: '1.2', letterSpacing: '-0.64px', fontWeight: '300' }],
        'display-md': ['24px', { lineHeight: '1.3', letterSpacing: '-0.40px', fontWeight: '300' }],
        'heading-md': ['20px', { lineHeight: '1.4', letterSpacing: '-0.20px', fontWeight: '300' }],
        'body-md': ['15px', { lineHeight: '1.6', letterSpacing: '0px', fontWeight: '300' }],
        'button-md': ['15px', { lineHeight: '1.4', letterSpacing: '0px', fontWeight: '400' }],
        'caption': ['13px', { lineHeight: '1.5', letterSpacing: '0.2px', fontWeight: '400' }],
      },
      borderRadius: {
        pill: '9999px',    // All buttons & tags (Design.md §3)
        card: '12px',      // All cards & modals (Design.md §3)
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};