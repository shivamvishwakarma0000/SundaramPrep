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
          50: '#F0F5FA',
          100: '#E1EBF5',
          200: '#C2D7EC',
          300: '#94BCDF',
          400: '#5F9CCE',
          500: '#357BB7',
          600: '#0D3269', // Primary Deep Navy from Sundaram Prep banner
          700: '#0B2545', // Dark Navy Brand
          800: '#081D37',
          900: '#061528',
          950: '#030B15',
        },
        navy: {
          50: '#F0F5FA',
          100: '#E1EBF5',
          600: '#0D3269',
          700: '#0B2545',
          800: '#081D37',
          900: '#061528',
        },
        saffron: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#FF671F', // Indian Tricolour Saffron
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        flagGreen: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#046A38', // Indian Flag Green
          600: '#138808',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
        },
        gold: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#D4AF37', // Ashoka Emblem Gold
          600: '#D97706',
          700: '#B45309',
        },
        royal: {
          50: '#F0F5FA',
          100: '#E1EBF5',
          200: '#C2D7EC',
          300: '#94BCDF',
          400: '#5F9CCE',
          500: '#357BB7',
          600: '#0D3269', // Harmonized Deep Navy
          700: '#0B2545',
          800: '#081D37',
          900: '#061528',
          950: '#030B15',
        },
        violet: {
          // Remapped to Deep Navy to remove all traces of purple across existing classes
          50: '#F0F5FA',
          100: '#E1EBF5',
          200: '#C2D7EC',
          300: '#94BCDF',
          400: '#357BB7',
          500: '#0D3269',
          600: '#0D3269',
          700: '#0B2545',
          800: '#081D37',
          900: '#061528',
        },
        dark: {
          bg: '#06111E',        // Deep Navy Obsidian
          surface: '#0B1B30',   // Elevated card surface
          card: '#10243E',      // Secondary card surface
          border: '#1A365D',    // Subtle navy border
          text: '#F8FAFC',      // High-contrast readable text
          muted: '#94A3B8',     // Secondary/muted text
        },
        cool: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        semantic: {
          correct: '#046A38', // Flag Green
          warning: '#D4AF37', // Gold Warning
          incorrect: '#DC2626', // Error crimson
          ai: '#FF671F',      // Saffron Accent
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 2px 8px -1px rgba(11, 37, 69, 0.05), 0 1px 3px -1px rgba(11, 37, 69, 0.03)',
        'card': '0 4px 16px -2px rgba(11, 37, 69, 0.08), 0 2px 6px -1px rgba(11, 37, 69, 0.04)',
        'elevated': '0 12px 30px -4px rgba(11, 37, 69, 0.12), 0 4px 12px -2px rgba(11, 37, 69, 0.06)',
        'card-3d': '0 10px 25px -4px rgba(11, 37, 69, 0.10), 0 6px 10px -3px rgba(11, 37, 69, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'card-3d-hover': '0 20px 35px -5px rgba(11, 37, 69, 0.16), 0 10px 15px -4px rgba(11, 37, 69, 0.08)',
        'floating': '0 14px 35px -4px rgba(13, 50, 105, 0.35), 0 6px 14px -3px rgba(255, 103, 31, 0.25)',
        'dark-card': '0 4px 20px -2px rgba(0, 0, 0, 0.6), 0 2px 6px -1px rgba(0, 0, 0, 0.4)',
      }
    },
  },
  plugins: [],
}
