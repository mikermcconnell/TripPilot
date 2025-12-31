/**
 * TripPilot Design System
 * ========================
 * Formalized design tokens for consistent UI/UX across the application.
 *
 * Design Philosophy:
 * - Friendly & Approachable: Rounded corners, soft shadows, warm interactions
 * - Playful Depth: 3D button effects with border-b-4 for tactile feel
 * - Activity-Coded: Distinct colors for food/lodging/activity/travel
 * - Mobile-Ready: Touch-friendly targets, clear visual hierarchy
 */

// =============================================================================
// COLOR PALETTE
// =============================================================================

export const colors = {
  // Primary Brand
  primary: {
    50: '#eff6ff',   // Lightest - hover backgrounds
    100: '#dbeafe',  // Light - rings, subtle highlights
    200: '#bfdbfe',  // Lighter borders
    300: '#93c5fd',  // Light accents
    400: '#60a5fa',  // Medium - hover states
    500: '#3b82f6',  // DEFAULT - primary buttons, active states
    600: '#2563eb',  // Darker - pressed states, borders
    700: '#1d4ed8',  // Dark - 3D button borders
    800: '#1e40af',  // Darker text
    900: '#1e3a8a',  // Darkest
  },

  // Neutral (Slate)
  neutral: {
    50: '#f8fafc',   // Page background
    100: '#f1f5f9',  // Card backgrounds, input backgrounds
    200: '#e2e8f0',  // Borders, dividers
    300: '#cbd5e1',  // Disabled states
    400: '#94a3b8',  // Placeholder text, secondary icons
    500: '#64748b',  // Secondary text
    600: '#475569',  // Body text
    700: '#334155',  // Headings
    800: '#1e293b',  // Primary text
    900: '#0f172a',  // Darkest text
  },

  // Activity Type Colors
  activity: {
    food: {
      light: '#fff7ed',    // Background
      medium: '#fed7aa',   // Border
      DEFAULT: '#f97316',  // Icon, accent (Orange-500)
      dark: '#ea580c',     // Hover
    },
    lodging: {
      light: '#eef2ff',    // Background
      medium: '#c7d2fe',   // Border
      DEFAULT: '#6366f1',  // Icon, accent (Indigo-500)
      dark: '#4f46e5',     // Hover
    },
    activity: {
      light: '#ecfdf5',    // Background
      medium: '#a7f3d0',   // Border
      DEFAULT: '#10b981',  // Icon, accent (Emerald-500)
      dark: '#059669',     // Hover
    },
    travel: {
      light: '#f8fafc',    // Background
      medium: '#cbd5e1',   // Border
      DEFAULT: '#64748b',  // Icon, accent (Slate-500)
      dark: '#475569',     // Hover
    },
  },

  // Semantic Colors
  semantic: {
    success: {
      light: '#dcfce7',
      DEFAULT: '#22c55e',
      dark: '#16a34a',
    },
    warning: {
      light: '#fef3c7',
      DEFAULT: '#f59e0b',
      dark: '#d97706',
    },
    error: {
      light: '#fee2e2',
      DEFAULT: '#ef4444',
      dark: '#dc2626',
    },
    info: {
      light: '#dbeafe',
      DEFAULT: '#3b82f6',
      dark: '#2563eb',
    },
  },

  // Surface Colors
  surface: {
    page: '#f8fafc',       // Main background (slate-50)
    card: '#ffffff',       // Card background
    cardAlt: '#f1f5f9',    // Alternate card (slate-100)
    overlay: 'rgba(15, 23, 42, 0.5)', // Modal overlay
  },
} as const;


// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const typography = {
  // Font Family
  fontFamily: {
    sans: ['Nunito', 'system-ui', 'sans-serif'],
  },

  // Font Sizes (with line heights)
  fontSize: {
    '2xs': ['0.625rem', { lineHeight: '0.875rem' }],  // 10px - micro labels
    xs: ['0.75rem', { lineHeight: '1rem' }],          // 12px - timestamps, badges
    sm: ['0.875rem', { lineHeight: '1.25rem' }],      // 14px - body small
    base: ['1rem', { lineHeight: '1.5rem' }],         // 16px - body
    lg: ['1.125rem', { lineHeight: '1.75rem' }],      // 18px - subheadings
    xl: ['1.25rem', { lineHeight: '1.75rem' }],       // 20px - headings
    '2xl': ['1.5rem', { lineHeight: '2rem' }],        // 24px - page titles
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],   // 30px - hero
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],     // 36px - display
  },

  // Font Weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;


// =============================================================================
// SPACING & SIZING
// =============================================================================

export const spacing = {
  // Base spacing scale (4px increments)
  0: '0px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  11: '44px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

export const sizing = {
  // Touch targets (minimum 44px for accessibility)
  touchTarget: {
    min: '44px',
    comfortable: '48px',
    large: '56px',
  },

  // Icon sizes
  icon: {
    xs: '12px',   // Inline icons
    sm: '16px',   // Small icons
    md: '20px',   // Default icons
    lg: '24px',   // Large icons
    xl: '32px',   // Feature icons
  },

  // Avatar/Badge sizes
  avatar: {
    xs: '24px',
    sm: '32px',
    md: '40px',
    lg: '48px',
    xl: '64px',
  },

  // Sidebar width
  sidebar: '480px',

  // Chat panel
  chat: {
    width: '400px',
    height: '600px',
  },
} as const;


// =============================================================================
// BORDERS & RADIUS
// =============================================================================

export const borders = {
  // Border widths
  width: {
    none: '0px',
    DEFAULT: '2px',     // Standard border
    thick: '4px',       // 3D button bottom
  },

  // Border radius
  radius: {
    none: '0px',
    sm: '4px',
    DEFAULT: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    full: '9999px',
  },
} as const;


// =============================================================================
// SHADOWS
// =============================================================================

export const shadows = {
  // Elevation system
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',

  // Component-specific
  card: '0 1px 3px 0 rgb(0 0 0 / 0.05)',
  dropdown: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  modal: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  chat: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
} as const;


// =============================================================================
// ANIMATIONS & TRANSITIONS
// =============================================================================

export const animations = {
  // Duration
  duration: {
    instant: '0ms',
    fast: '150ms',
    DEFAULT: '200ms',
    slow: '300ms',
    slower: '500ms',
  },

  // Easing
  easing: {
    DEFAULT: 'ease-out',
    in: 'ease-in',
    inOut: 'ease-in-out',
    linear: 'linear',
    // Custom curves
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Keyframe animations
  keyframes: {
    fadeIn: {
      from: { opacity: '0', transform: 'scale(0.95)' },
      to: { opacity: '1', transform: 'scale(1)' },
    },
    slideUp: {
      from: { opacity: '0', transform: 'translateY(10px)' },
      to: { opacity: '1', transform: 'translateY(0)' },
    },
    slideDown: {
      from: { opacity: '0', transform: 'translateY(-10px)' },
      to: { opacity: '1', transform: 'translateY(0)' },
    },
    pulse: {
      '0%, 100%': { opacity: '1' },
      '50%': { opacity: '0.5' },
    },
    bounce: {
      '0%, 100%': { transform: 'translateY(0)' },
      '50%': { transform: 'translateY(-4px)' },
    },
  },
} as const;


// =============================================================================
// Z-INDEX SCALE
// =============================================================================

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  toast: 80,
  chat: 50,        // Chat panel
  header: 40,      // Fixed header
} as const;


// =============================================================================
// COMPONENT PATTERNS
// =============================================================================

/**
 * Reusable component style patterns.
 * Use these as references for consistent styling.
 */
export const componentPatterns = {
  // 3D Button (signature style)
  button3D: {
    base: 'border-b-4 transition-all duration-150',
    primary: 'bg-blue-500 border-blue-700 text-white hover:bg-blue-400',
    secondary: 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50',
    danger: 'bg-red-500 border-red-700 text-white hover:bg-red-400',
    // Press effect: border-b-0 + translateY(4px)
  },

  // Card styles
  card: {
    base: 'bg-white border-2 border-slate-200 rounded-2xl',
    interactive: 'hover:border-blue-400 hover:ring-4 hover:ring-blue-50 cursor-pointer transition-all duration-200',
    active: 'border-blue-400 ring-4 ring-blue-100/50',
  },

  // Input styles
  input: {
    base: 'w-full px-4 py-3 bg-slate-100 border-2 border-transparent rounded-2xl text-slate-700 font-medium placeholder:text-slate-400 transition-all',
    focus: 'focus:bg-white focus:border-blue-400 focus:outline-none',
  },

  // Badge/Chip styles
  badge: {
    base: 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide',
    neutral: 'bg-slate-100 text-slate-600 border border-slate-200',
    primary: 'bg-blue-50 text-blue-600 border border-blue-100',
    success: 'bg-green-50 text-green-600 border border-green-100',
  },

  // Section header
  sectionHeader: 'text-sm font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2',

  // Activity card left border colors
  activityBorder: {
    food: 'border-l-4 border-l-orange-500',
    lodging: 'border-l-4 border-l-indigo-500',
    activity: 'border-l-4 border-l-emerald-500',
    travel: 'border-l-4 border-l-slate-400',
  },
} as const;


// =============================================================================
// BREAKPOINTS (for reference - matches Tailwind defaults)
// =============================================================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;


// =============================================================================
// DESIGN TOKENS EXPORT
// =============================================================================

export const designTokens = {
  colors,
  typography,
  spacing,
  sizing,
  borders,
  shadows,
  animations,
  zIndex,
  componentPatterns,
  breakpoints,
} as const;

export default designTokens;
