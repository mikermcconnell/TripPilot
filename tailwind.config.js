/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ===========================================
      // TYPOGRAPHY
      // ===========================================
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },

      // ===========================================
      // SEMANTIC COLORS
      // ===========================================
      colors: {
        // Activity Type Colors (semantic aliases)
        'activity-food': {
          light: '#fff7ed',
          DEFAULT: '#f97316',
          dark: '#ea580c',
        },
        'activity-lodging': {
          light: '#eef2ff',
          DEFAULT: '#6366f1',
          dark: '#4f46e5',
        },
        'activity-explore': {
          light: '#ecfdf5',
          DEFAULT: '#10b981',
          dark: '#059669',
        },
        'activity-travel': {
          light: '#f8fafc',
          DEFAULT: '#64748b',
          dark: '#475569',
        },

        // Surface colors
        'surface': {
          page: '#f8fafc',
          card: '#ffffff',
          alt: '#f1f5f9',
        },
      },

      // ===========================================
      // SIZING
      // ===========================================
      width: {
        'sidebar': '480px',
        'chat': '400px',
      },
      height: {
        'chat': '600px',
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },

      // ===========================================
      // BORDER RADIUS
      // ===========================================
      borderRadius: {
        '4xl': '2rem',
      },

      // ===========================================
      // SHADOWS
      // ===========================================
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.05)',
        'chat': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'dropdown': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },

      // ===========================================
      // ANIMATIONS
      // ===========================================
      animation: {
        'in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounceSubtle 1s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },

      // ===========================================
      // TRANSITIONS
      // ===========================================
      transitionDuration: {
        'fast': '150ms',
        'DEFAULT': '200ms',
        'slow': '300ms',
      },

      // ===========================================
      // Z-INDEX SCALE
      // ===========================================
      zIndex: {
        'dropdown': '10',
        'sticky': '20',
        'fixed': '30',
        'modal-backdrop': '40',
        'modal': '50',
        'popover': '60',
        'tooltip': '70',
        'toast': '80',
        'chat': '50',
        'header': '40',
      },
    },
  },
  plugins: [],
}
