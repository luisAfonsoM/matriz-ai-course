import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Tokens Aeronáuticos de Modo Claro (WCAG AA compliant)
        aero: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7", // Primário Aeronáutico
          700: "#0369a1", // Hover Primário
          800: "#075985",
          900: "#0c4a6e",
          DEFAULT: "#0284c7",
        },
        navy: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a", // Cockpit Escuro / Fuselagem
          DEFAULT: "#1e293b",
        },
        runway: {
          50: "#fffbeb",
          100: "#fef3c7",
          500: "#f59e0b",
          600: "#d97706", // Sinalização de Pista / Atenção
          700: "#b45309",
          DEFAULT: "#d97706",
        },
        hud: {
          50: "#ecfdf5",
          100: "#d1fae5",
          500: "#10b981",
          600: "#059669", // Verde Horizonte / Instrumentos / Aterrado
          700: "#047857",
          DEFAULT: "#059669",
        },
        storm: {
          50: "#fff1f2",
          100: "#ffe4e6",
          500: "#f43f5e",
          600: "#e11d48", // Turbulência / Atraso Crítico / Alerta
          700: "#be123c",
          DEFAULT: "#e11d48",
        },
      },
      keyframes: {
        "turbine-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "plane-takeoff": {
          "0%, 100%": { transform: "translateY(0) translateX(0)" },
          "50%": { transform: "translateY(-3px) translateX(2px)" },
        },
      },
      animation: {
        "turbine-spin": "turbine-spin 1.5s linear infinite",
        "plane-takeoff": "plane-takeoff 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
