import typography from "@tailwindcss/typography";
import containerQueries from "@tailwindcss/container-queries";
import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["index.html", "src/**/*.{js,ts,jsx,tsx,html,css}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "oklch(var(--border))",
        input: "oklch(var(--input))",
        ring: "oklch(var(--ring) / <alpha-value>)",
        background: "oklch(var(--background))",
        foreground: "oklch(var(--foreground))",
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
          foreground: "oklch(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "oklch(var(--destructive) / <alpha-value>)",
          foreground: "oklch(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "oklch(var(--muted) / <alpha-value>)",
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          foreground: "oklch(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "oklch(var(--popover))",
          foreground: "oklch(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "oklch(var(--card))",
          foreground: "oklch(var(--card-foreground))",
        },
        chart: {
          1: "oklch(var(--chart-1))",
          2: "oklch(var(--chart-2))",
          3: "oklch(var(--chart-3))",
          4: "oklch(var(--chart-4))",
          5: "oklch(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "oklch(var(--sidebar))",
          foreground: "oklch(var(--sidebar-foreground))",
          primary: "oklch(var(--sidebar-primary))",
          "primary-foreground": "oklch(var(--sidebar-primary-foreground))",
          accent: "oklch(var(--sidebar-accent))",
          "accent-foreground": "oklch(var(--sidebar-accent-foreground))",
          border: "oklch(var(--sidebar-border))",
          ring: "oklch(var(--sidebar-ring))",
        },
        /* ── Bakuzone dark palette ── */
        bz: {
          bg: "#0D1117",
          card: "#161B22",
          border: "#21262D",
          "card-hover": "#1C2128",
          header: "#010409",
          text: "#E6EDF3",
          muted: "#7D8590",
          orange: "#F97316",
          "orange-dark": "#EA580C",
          gold: "#E3B341",
        },
        /* ── Winzer palette kept for backward compat ── */
        wt: {
          orange: "#F97316",
          "orange-dark": "#EA580C",
          gold: "#E3B341",
          "gold-bright": "#EAB308",
          surface: "#0D1117",
          border: "#21262D",
          text: "#E6EDF3",
          muted: "#7D8590",
          "card-bg": "#161B22",
        },
        /* Legacy gamer colors — kept for AdminDashboard compatibility */
        "gamer-bg": "#0A0A0A",
        "gamer-panel": "#111318",
        "gamer-surface": "#151A20",
        "gamer-card": "#1B1F26",
        "gamer-border": "#2A303A",
        "neon-gold": "#FFB000",
        "neon-yellow": "#FFD24A",
        "neon-orange": "#FF8A00",
        "neon-red": "#FF6A00",
        "gamer-heading": "#F2F4F7",
        "gamer-body": "#B7BDC7",
        "gamer-muted": "#6F7785",
      },
      fontFamily: {
        jakarta: ["Plus Jakarta Sans", "sans-serif"],
        orbitron: ["Orbitron", "sans-serif"],
        rajdhani: ["Rajdhani", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0,0,0,0.05)",
        card: "0 2px 8px rgba(0,0,0,0.3)",
        "card-hover": "0 4px 20px rgba(0,0,0,0.5)",
        "orange-glow": "0 0 20px rgba(249,115,22,0.3)",
        "bz-glow": "0 0 20px rgba(249,115,22,0.3), 0 0 40px rgba(249,115,22,0.1)",
        /* Legacy */
        "glow-gold": "0 0 20px rgba(255,176,0,0.4), 0 0 6px rgba(255,210,74,0.45)",
        "glow-gold-strong": "0 0 30px rgba(255,176,0,0.6), 0 0 10px rgba(255,210,74,0.7)",
        "glow-button": "0 0 30px rgba(255,176,0,0.5), 0 4px 20px rgba(255,106,0,0.3)",
        "glow-success": "0 0 20px rgba(34,197,94,0.3)",
        "modal-glow": "0 0 40px rgba(255,176,0,0.4), 0 0 12px rgba(255,210,74,0.3)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [typography, containerQueries, animate],
};
