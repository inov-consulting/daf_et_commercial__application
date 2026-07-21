import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      /* ── COLOR PALETTE ─────────────────────────────────── */
      colors: {
        primary: {
          50:  '#EBF5FD',
          100: '#D0E9FB',
          200: '#A1D3F7',
          300: '#5BB5F0',
          400: '#2E9EED',
          500: '#0E86E8',
          600: '#0A6DC0',
          700: '#085499',
          800: '#063A6B',
          900: '#03264A',
          950: '#011630',
          DEFAULT: '#0E86E8',
        },
        secondary: {
          50:  '#FDF0F7',
          100: '#FBDDEF',
          200: '#F6BADF',
          300: '#EF87C4',
          400: '#E44FA4',
          500: '#C2257A',
          600: '#A01D65',
          700: '#7D1750',
          800: '#5B113A',
          900: '#390B25',
          950: '#1F0614',
          DEFAULT: '#C2257A',
        },
        accent: {
          50:  '#F3EFFE',
          100: '#E4DCFC',
          200: '#C9BAF9',
          300: '#A98CF4',
          400: '#8A5FEF',
          500: '#6B35C9',
          600: '#5829A8',
          700: '#431E84',
          800: '#2E1560',
          900: '#1C0C3C',
          950: '#0D0620',
          DEFAULT: '#6B35C9',
        },
        neutral: {
          50:  '#F7F9FC',
          100: '#EEF2F7',
          200: '#DDE5EF',
          300: '#C3D0DF',
          400: '#9EB0C4',
          500: '#7691A8',
          600: '#5A738A',
          700: '#435869',
          800: '#2E3D4C',
          900: '#1B2633',
          950: '#0D131B',
        },
        success: {
          50:      '#ECFDF5',
          DEFAULT: '#10B981',
          600:     '#059669',
        },
        warning: {
          50:      '#FFFBEB',
          DEFAULT: '#F59E0B',
          600:     '#D97706',
        },
        error: {
          50:      '#FEF2F2',
          DEFAULT: '#EF4444',
          600:     '#DC2626',
        },
        /* Tokens sémantiques – référencent les CSS vars */
        background:         "var(--bg-page)",
        surface:            "var(--bg-surf)",
        "surface-raised":   "var(--bg-raised)",
        "surface-sink":     "var(--bg-sink)",
        "surface-mute":     "var(--bg-mute)",
        foreground:         "var(--tx-1)",
        "foreground-2":     "var(--tx-2)",
        "foreground-3":     "var(--tx-3)",
        "foreground-muted": "var(--tx-dis)",
        "foreground-inverse":"var(--tx-inv)",
        brand:              "var(--tx-brand)",
        border:             "var(--bd-def)",
        "border-strong":    "var(--bd-str)",
        "border-focus":     "var(--bd-focus)",
      },

      /* ── TYPOGRAPHY ────────────────────────────────────── */
      fontFamily: {
        sans:    ["var(--font-body)",    "Inter",        "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Space Grotesk","system-ui", "sans-serif"],
        body:    ["var(--font-body)",    "Inter",        "system-ui", "sans-serif"],
        mono:    ["var(--font-mono)",    "JetBrains Mono","Courier New","monospace"],
      },
      fontSize: {
        "2xs": ["var(--t2xs)", { lineHeight: "var(--lh-normal)" }],
        xs:    ["var(--txs)",  { lineHeight: "var(--lh-normal)" }],
        sm:    ["var(--tsm)",  { lineHeight: "var(--lh-normal)" }],
        base:  ["var(--tmd)",  { lineHeight: "var(--lh-normal)" }],
        lg:    ["var(--tlg)",  { lineHeight: "var(--lh-relaxed)" }],
        xl:    ["var(--txl)",  { lineHeight: "var(--lh-snug)" }],
        "2xl": ["var(--dxs)",  { lineHeight: "var(--lh-snug)" }],
        "3xl": ["var(--dsm)",  { lineHeight: "var(--lh-tight)" }],
        "4xl": ["var(--dmd)",  { lineHeight: "var(--lh-tight)" }],
        "5xl": ["var(--dlg)",  { lineHeight: "var(--lh-tight)" }],
        "6xl": ["var(--dxl)",  { lineHeight: "var(--lh-tight)" }],
        "7xl": ["var(--d2xl)", { lineHeight: "var(--lh-tight)" }],
      },

      /* ── BORDER RADIUS ─────────────────────────────────── */
      borderRadius: {
        none:    "var(--r0)",
        xs:      "var(--rxs)",
        sm:      "var(--rsm)",
        md:      "var(--rmd)",
        DEFAULT: "var(--rlg)",
        lg:      "var(--rlg)",
        xl:      "var(--rxl)",
        "2xl":   "var(--r2xl)",
        "3xl":   "var(--r3xl)",
        full:    "var(--rfull)",
      },

      /* ── SHADOWS ───────────────────────────────────────── */
      boxShadow: {
        xs:      "var(--sh-xs)",
        sm:      "var(--sh-sm)",
        DEFAULT: "var(--sh-sm)",
        md:      "var(--sh-md)",
        lg:      "var(--sh-lg)",
        xl:      "var(--sh-xl)",
      },

      /* ── MOTION ────────────────────────────────────────── */
      transitionDuration: {
        fast:   "100ms",
        norm:   "200ms",
        slow:   "300ms",
        slower: "500ms",
      },
      transitionTimingFunction: {
        DEFAULT:   "cubic-bezier(.4, 0, .2, 1)",
        "ease-in": "cubic-bezier(.4, 0, 1, 1)",
        "ease-out":"cubic-bezier(0, 0, .2, 1)",
        spring:    "cubic-bezier(.34, 1.56, .64, 1)",
      },

      /* ── Z-INDEX ───────────────────────────────────────── */
      zIndex: {
        "0":   "0",
        "10":  "10",
        "100": "100",
        "200": "200",
        "300": "300",
        "400": "400",
        "500": "500",
        "600": "600",
        "700": "700",
      },

      screens: {
        xs: "475px",
      },
    },
  },
  plugins: [],
};

export default config;
