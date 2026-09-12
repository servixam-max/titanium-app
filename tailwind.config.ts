import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // === v8 Titanium Energy — core palette ===
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: {
          950: "#05090C",
          900: "#0A0F14",
          800: "#111820",
          700: "#1A2530",
          600: "#253240",
          500: "#334155",
          400: "#475569",
          300: "#64748B",
          200: "#94A3B8",
          100: "#CBD5E1",
          50: "#F1F5F9",
        },
        primary: {
          600: "#059669",
          500: "#00D68F",
          400: "#34D399",
          300: "#6EE7B7",
          200: "#A7F3D0",
          100: "#D1FAE5",
        },
        accent: {
          cyan: "#00E1FF",
          violet: "#7C3AED",
          amber: "#F59E0B",
          rose: "#FF007A",
        },
        // === Legacy aliases (kept for gradual migration) ===
        "surface-container": {
          lowest: "#0A0F14",
          low: "#111820",
          DEFAULT: "#111820",
          high: "#1A2530",
          highest: "#253240",
        },
        "on-primary": "#002012",
        "on-primary-container": "#002012",
        "on-primary-fixed": "#002012",
        "on-primary-fixed-variant": "#005232",
        secondary: {
          DEFAULT: "#94A3B8",
          container: "#334155",
        },
        "on-secondary": "#0A0F14",
        "on-secondary-container": "#94A3B8",
        tertiary: {
          DEFAULT: "#F1F5F9",
          container: "#CBD5E1",
        },
        "on-tertiary": "#05090C",
        "on-tertiary-container": "#64748B",
        "on-tertiary-fixed": "#0A0F14",
        "on-tertiary-fixed-variant": "#334155",
        error: {
          DEFAULT: "#ffb4ab",
          container: "#93000a",
        },
        "on-error": "#690005",
        "on-error-container": "#ffdad6",
        outline: {
          DEFAULT: "rgba(255,255,255,0.12)",
          variant: "rgba(255,255,255,0.08)",
        },
        "surface-tint": "#00D68F",
        "on-surface": "#F1F5F9",
        "on-surface-variant": "#94A3B8",
        "inverse-surface": "#F1F5F9",
        "inverse-on-surface": "#05090C",
        "inverse-primary": "#00D68F",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "var(--font-geist-sans)", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
        // Legacy aliases
        montserrat: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        inter: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // v8 scale
        "display-xl": ["clamp(48px, 12vw, 80px)", { lineHeight: "1", letterSpacing: "-0.03em", fontWeight: "700" }],
        "display-lg": ["clamp(40px, 10vw, 64px)", { lineHeight: "1.05", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-md": ["clamp(32px, 8vw, 48px)", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "title-lg": ["24px", { lineHeight: "32px", fontWeight: "700" }],
        "title-md": ["20px", { lineHeight: "28px", fontWeight: "700" }],
        "title-sm": ["18px", { lineHeight: "26px", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "caption": ["12px", { lineHeight: "16px", fontWeight: "500" }],
        "label-caps": ["11px", { lineHeight: "16px", letterSpacing: "0.08em", fontWeight: "700" }],
        // Legacy aliases
        "display-timer": ["clamp(56px, 15vw, 84px)", { lineHeight: "1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-timer-mobile": ["56px", { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-timer-tablet": ["64px", { lineHeight: "64px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-timer-desktop": ["84px", { lineHeight: "84px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-xl": ["40px", { lineHeight: "48px", fontWeight: "700" }],
        "headline-xl-mobile": ["24px", { lineHeight: "28px", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "40px", fontWeight: "700" }],
        "headline-lg-mobile": ["28px", { lineHeight: "34px", fontWeight: "700" }],
        "headline-md": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "headline-sm": ["18px", { lineHeight: "24px", fontWeight: "600" }],
        "headline-sm-mobile": ["16px", { lineHeight: "20px", fontWeight: "600" }],
      },
      spacing: {
        "touch-target-min": "48px",
        "container-padding": "20px",
        "stack-gap": "16px",
        "section-gap": "32px",
        base: "8px",
      },
      borderRadius: {
        DEFAULT: "0.75rem",
        sm: "0.75rem",
        md: "1rem",
        lg: "1.5rem",
        xl: "2rem",
        "2xl": "2rem",
      },
      maxWidth: {
        app: "600px",
      },
      boxShadow: {
        rest: "0 8px 24px rgba(0,0,0,0.5)",
        neon: "0 4px 14px rgba(0, 0, 0, 0.35)",
        "neon-strong": "0 6px 20px rgba(0, 0, 0, 0.5)",
        "cyan-neon": "0 4px 14px rgba(0, 0, 0, 0.35)",
        glow: "0 0 24px rgba(0, 214, 143, 0.25)",
        "glow-cyan": "0 0 24px rgba(0, 225, 255, 0.25)",
        "glow-violet": "0 0 24px rgba(124, 58, 237, 0.25)",
      },
      animation: {
        "pulse-a": "pulseA 2s infinite ease-in-out",
        "pulse-b": "pulseB 2s infinite ease-in-out",
        "fade-in-up": "fadeInUp 0.4s ease-out forwards",
        "pulse-slow": "pulseSlow 4s infinite ease-in-out",
        "gradient-x": "gradientX 3s ease infinite",
        "page-in": "pageIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards",
      },
      keyframes: {
        pulseA: {
          "0%, 100%": { opacity: "1", borderColor: "#00D68F", transform: "scale(1.02)" },
          "50%": { opacity: "0.4", borderColor: "#16222f", transform: "scale(1)" },
        },
        pulseB: {
          "0%, 100%": { opacity: "0.4", borderColor: "#16222f", transform: "scale(1)" },
          "50%": { opacity: "1", borderColor: "#00E1FF", transform: "scale(1.02)" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSlow: {
          "0%, 100%": { opacity: "0.3", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(1.1)" },
        },
        gradientX: {
          "0%, 100%": { backgroundSize: "200% 200%", backgroundPosition: "left center" },
          "50%": { backgroundSize: "200% 200%", backgroundPosition: "right center" },
        },
        pageIn: {
          "0%": { opacity: "0", transform: "translateY(12px) scale(0.99)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      transitionTimingFunction: {
        "spring": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
