/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5', // Primary Indigo
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        royal: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#4f46e5', // Harmonized with Sundaram Brand Indigo
          700: '#4338ca',
          800: '#3730a3',
          900: '#1e1b4b',
          950: '#0f172a',
        },
        violet: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed', // Secondary Violet
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        dark: {
          bg: '#0B0F19',        // Deep obsidian background
          surface: '#161E2E',   // Elevated card surface
          card: '#1E293B',      // Secondary card surface
          border: '#283548',    // Subtle border
          text: '#F8FAFC',      // High-contrast readable text
          muted: '#94A3B8',     // Secondary/muted text
        },
        cool: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        semantic: {
          correct: '#16a34a', // Success green
          warning: '#f59e0b', // Amber warning
          incorrect: '#dc2626', // Error crimson
          ai: '#7c3aed',      // AI Violet
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 2px 10px -1px rgba(15, 23, 42, 0.04), 0 1px 4px -1px rgba(15, 23, 42, 0.02)',
        'card': '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
        'elevated': '0 10px 30px -4px rgba(15, 23, 42, 0.08), 0 4px 10px -2px rgba(15, 23, 42, 0.04)',
        'dark-card': '0 4px 20px -2px rgba(0, 0, 0, 0.4), 0 2px 6px -1px rgba(0, 0, 0, 0.3)',
      }
    },
  },
  plugins: [],
}
