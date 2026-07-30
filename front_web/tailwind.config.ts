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
        /* Vert PortaLis – couleur primaire */
        primary: {
          50:  "#F5F9F6",
          100: "#DDF2E8",
          200: "#B8E4CC",
          300: "#72C79A",
          400: "#4CAF7C",
          500: "#1B6B45",   /* Signature – AA 6.49:1 / blanc */
          600: "#166239",   /* Hover / active */
          700: "#0F3D27",   /* Pressed / dark */
          800: "#0B2E1C",
          900: "#071D12",
          950: "#030F09",
          DEFAULT: "#1B6B45",
        },
        /* Or PortaLis – couleur secondaire */
        secondary: {
          50:  "#FDF8EE",
          100: "#FAF0D0",
          200: "#F2DFA9",
          300: "#E4C070",
          400: "#D4A843",
          500: "#8B6914",   /* Signature or – AA 5.09:1 / blanc */
          600: "#7A5A0A",   /* Hover – AA 6.37:1 / blanc */
          700: "#6B4E0A",   /* AAA 7.72:1 / blanc */
          800: "#3D2A00",
          900: "#2A1C00",
          950: "#1A1100",
          DEFAULT: "#8B6914",
        },
        /* Or chaud – accent complémentaire */
        accent: {
          50:  "#FEF8EC",
          100: "#FAEECF",
          200: "#F3D88C",
          300: "#E8BF50",
          400: "#D4A843",
          500: "#8B6914",   /* accessible pour badges (AA) */
          600: "#7A5A0A",
          700: "#6B4E0A",
          800: "#3D2A00",
          900: "#2A1C00",
          950: "#1A1100",
          DEFAULT: "#8B6914",
        },
        /* Neutres verts-grisés */
        neutral: {
          50:  "#F8FAF9",
          100: "#EEF4F0",
          200: "#DDE8E2",
          300: "#C4D4CB",
          400: "#9EB0A6",
          500: "#7A8E82",
          600: "#5C7066",
          700: "#4A5E52",
          800: "#2D3E36",
          900: "#1A2E22",
          950: "#111F18",
        },
        /* Sémantique succès */
        success: {
          50:  "#E8F5ED",
          DEFAULT: "#4CAF7C",
          600: "#1B5E35",
        },
        /* Sémantique avertissement */
        warning: {
          50:  "#FDF8EE",
          DEFAULT: "#D4A843",
          500: "#D4A843",
          600: "#7A5A0A",
        },
        /* Sémantique erreur */
        error: {
          50:  "#FDE8E8",
          DEFAULT: "#E57373",
          600: "#8B1A1A",
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
