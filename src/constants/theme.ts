/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1c1e22',
    background: '#F5F6F8',
    gradientFrom: '#f7f8fa',
    gradientTo: '#e9ebef',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E6F0FF',
    textSecondary: '#70767f',
    emptyTitle: '#4b5568',
    card: '#FFFFFF',
    surfaceMuted: '#eef0f3',
    track: '#e8eaee',
    border: '#E4E7EB',
    borderDashed: '#d7dae0',
    inputBackground: '#FFFFFF',
    primary: '#2563EB',
    onPrimary: '#FFFFFF',
    success: '#10B981',
    successSoft: '#E7F8F1',
    danger: '#EF4444',
    dangerSoft: '#FDECEC',
    warning: '#F59E0B',
    cashInBg: '#f0fdf4',
    cashInBorder: '#dcfce7',
    cashInText: '#16a34a',
    cashOutBg: '#fef2f2',
    cashOutBorder: '#fee2e2',
    cashOutText: '#dc2626',
    overlay: 'rgba(0,0,0,0.45)',
  },
  dark: {
    text: '#ECEDEE',
    background: '#0B0F14',
    gradientFrom: '#0B0F14',
    gradientTo: '#161B22',
    backgroundElement: '#161B22',
    backgroundSelected: '#1E2A3C',
    textSecondary: '#9BA4AE',
    emptyTitle: '#ECEDEE',
    card: '#161B22',
    surfaceMuted: '#1C232C',
    track: '#252C36',
    border: '#252C36',
    borderDashed: '#2C3440',
    inputBackground: '#1C232C',
    primary: '#3B82F6',
    onPrimary: '#FFFFFF',
    success: '#34D399',
    successSoft: '#10241D',
    danger: '#F87171',
    dangerSoft: '#2A1717',
    warning: '#FBBF24',
    cashInBg: '#10241D',
    cashInBorder: '#1C3B30',
    cashInText: '#4ade80',
    cashOutBg: '#2A1717',
    cashOutBorder: '#432121',
    cashOutText: '#f87171',
    overlay: 'rgba(0,0,0,0.6)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** A resolved color palette (same keys, plain strings). */
export type Palette = { [K in ThemeColor]: string };

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
