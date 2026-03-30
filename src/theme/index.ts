/**
 * Executive Meditator — Design System / Style Guide
 *
 * Calm, premium palette inspired by stillness and clarity.
 * All screens should derive colours, spacing, and typography from here.
 */

export const theme = {
  colors: {
    /** Warm white parchment — primary background */
    background: '#FAF7F2',
    /** Soft cream — card / modal surface */
    surface: '#FFFFFF',
    /** Very light gold tint — raised inputs */
    elevated: '#F5EDD8',

    /** Antique gold — primary action / accent */
    primary: '#C9A84C',
    /** Champagne gold — secondary accent */
    secondary: '#E8D5A3',
    /** Rich gold — rewards, badges, streaks */
    gold: '#B8860B',

    /** Alarm level colours */
    alarmSubtle: '#6AB187',   // green  — gentle nudge
    alarmMild: '#C8A951',     // warm gold — fatigue / low energy
    alarmDisease: '#E67E22',  // orange — emotional imbalance
    alarmCritical: '#C0392B', // deep red — cannot be ignored

    /** Text */
    textPrimary: '#1A1208',
    textSecondary: '#5C4A1E',
    textMuted: '#9C8555',
    textInverse: '#FAF7F2',

    /** UI */
    border: '#D4B96A',
    divider: '#EAD9A8',
    success: '#5A8A5A',
    error: '#C0392B',
    warning: '#C9A84C',
    transparent: 'transparent',
    white: '#FFFFFF',
    black: '#000000',
  },

  typography: {
    /** Font families — swap with custom fonts after installing */
    fontFamily: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
      light: 'System',
    },
    fontSize: {
      xs: 11,
      sm: 13,
      base: 15,
      md: 17,
      lg: 20,
      xl: 24,
      '2xl': 30,
      '3xl': 38,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
    fontWeight: {
      light: '300' as const,
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },

  radius: {
    sm: 6,
    md: 12,
    lg: 20,
    xl: 32,
    full: 9999,
  },

  shadow: {
    sm: {
      shadowColor: '#8B6914',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: '#8B6914',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.18,
      shadowRadius: 8,
      elevation: 5,
    },
    lg: {
      shadowColor: '#8B6914',
      shadowOffset: {width: 0, height: 8},
      shadowOpacity: 0.22,
      shadowRadius: 16,
      elevation: 10,
    },
  },

  animation: {
    durationFast: 150,
    durationNormal: 300,
    durationSlow: 600,
  },
} as const;

export type Theme = typeof theme;
export type ThemeColors = keyof typeof theme.colors;
