/** @type {import('tailwindcss').Config} */
// The tokens follow davidkuo.tech: ink on paper, soft round corners with deep shadows, a springy ease.
export default {
  content: [
    "./index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--ink) / <alpha-value>)',
        paper: 'rgb(var(--paper) / <alpha-value>)',
        grout: 'rgb(var(--grout) / <alpha-value>)',
        alert: 'rgb(var(--alert) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', '-apple-system', 'BlinkMacSystemFont', '"PingFang TC"', 'system-ui', 'sans-serif'],
        nav: ['Ubuntu', '"Inter Variable"', '-apple-system', '"PingFang TC"', 'system-ui', 'sans-serif'],
        mono: ['"SF Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 24px 56px -30px rgba(0,0,0,0.55), 0 2px 6px -2px rgba(0,0,0,0.06)',
        lift: '0 12px 28px -14px rgba(0,0,0,0.6)',
        soft: '0 12px 28px -16px rgba(0,0,0,0.45)',
        pill: '0 14px 34px -16px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.12)',
        knob: '0 4px 12px -6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.9)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      letterSpacing: {
        eyebrow: '0.22em',
      },
    },
  },
  plugins: [],
}
