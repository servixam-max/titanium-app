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
        background: "#131313",
        foreground: "#e2e2e2",
        surface: {
          DEFAULT: "#131313",
          dim: "#131313",
          bright: "#393939",
          variant: "#353535",
        },
        "surface-container": {
          lowest: "#0e0e0e",
          low: "#1b1b1b",
          DEFAULT: "#1f1f1f",
          high: "#2a2a2a",
          highest: "#353535",
        },
        primary: {
          DEFAULT: "#10B981",
          container: "#059669",
          fixed: "#34D399",
          "fixed-dim": "#047857",
        },
        "on-primary": "#002012",
        "on-primary-container": "#002012",
        "on-primary-fixed": "#002012",
        "on-primary-fixed-variant": "#005232",
        secondary: {
          DEFAULT: "#c8c6c5",
          container: "#474746",
          fixed: "#e5e2e1",
          "fixed-dim": "#c8c6c5",
        },
        "on-secondary": "#313030",
        "on-secondary-container": "#b7b5b4",
        "on-secondary-fixed": "#1c1b1b",
        "on-secondary-fixed-variant": "#474746",
        tertiary: {
          DEFAULT: "#ffffff",
          container: "#e4e2e1",
          fixed: "#e4e2e1",
          "fixed-dim": "#c8c6c5",
        },
        "on-tertiary": "#303030",
        "on-tertiary-container": "#656464",
        "on-tertiary-fixed": "#1b1c1c",
        "on-tertiary-fixed-variant": "#474746",
        error: {
          DEFAULT: "#ffb4ab",
          container: "#93000a",
        },
        "on-error": "#690005",
        "on-error-container": "#ffdad6",
        outline: {
          DEFAULT: "#8e9379",
          variant: "#444933",
        },
        "surface-tint": "#abd600",
        "on-surface": "#e2e2e2",
        "on-surface-variant": "#c4c9ac",
        "inverse-surface": "#e2e2e2",
        "inverse-on-surface": "#303030",
        "inverse-primary": "#506600",
      },
      fontFamily: {
        montserrat: ["Montserrat", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      fontSize: {
        // Mobile-first: base display-timer escala de 56px en móvil pequeño a 84px en tablet/desktop
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
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "label-caps": ["12px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "700" }],
      },
      spacing: {
        "touch-target-min": "48px",
        "container-padding": "20px",
        "stack-gap": "16px",
        "section-gap": "32px",
        base: "8px",
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        lg: "0.5rem",
        xl: "0.75rem",
      },
      maxWidth: {
        "app": "600px",
      },
      boxShadow: {
        'rest': '0 8px 24px rgba(0,0,0,0.5)',
        'neon': '0 4px 14px rgba(0, 0, 0, 0.35)',
        'neon-strong': '0 6px 20px rgba(0, 0, 0, 0.5)',
        'cyan-neon': '0 4px 14px rgba(0, 0, 0, 0.35)',
      },
      animation: {
        'pulse-a': 'pulseA 2s infinite ease-in-out',
        'pulse-b': 'pulseB 2s infinite ease-in-out',
        'fade-in-up': 'fadeInUp 0.4s ease-out forwards',
        'pulse-slow': 'pulseSlow 4s infinite ease-in-out',
        'gradient-x': 'gradientX 3s ease infinite',
      },
      keyframes: {
        pulseA: {
          '0%, 100%': { opacity: '1', borderColor: '#00D27F', transform: 'scale(1.02)' },
          '50%': { opacity: '0.4', borderColor: '#16222f', transform: 'scale(1)' },
        },
        pulseB: {
          '0%, 100%': { opacity: '0.4', borderColor: '#16222f', transform: 'scale(1)' },
          '50%': { opacity: '1', borderColor: '#00F0FF', transform: 'scale(1.02)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.1)' },
        },
        gradientX: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;