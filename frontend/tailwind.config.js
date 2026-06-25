/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    screens: {
      'sm': '320px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1440px',
    },
    extend: {
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        surface: 'var(--bg-surface)',
        sidebar: 'var(--bg-sidebar)',
        card:    'var(--bg-card)',
      },
      fontFamily: {
        sans:    ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        'sm':  '4px',
        DEFAULT: '8px',
        'md':  '10px',
        'lg':  '14px',
        'xl':  '20px',
      },
      boxShadow: {
        'xs':  '0 1px 2px rgba(0,0,0,0.04)',
        'sm':  '0 1px 3px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.04)',
        'md':  '0 4px 12px rgba(0,0,0,0.08),0 1px 3px rgba(0,0,0,0.05)',
        'lg':  '0 8px 24px rgba(0,0,0,0.12),0 2px 6px rgba(0,0,0,0.06)',
        'xl':  '0 16px 48px rgba(0,0,0,0.16),0 4px 12px rgba(0,0,0,0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s cubic-bezier(0.16,1,0.3,1) forwards',
        'scale-in': 'scaleIn 0.15s cubic-bezier(0.16,1,0.3,1) forwards',
      },
    },
  },
  plugins: [],
}
