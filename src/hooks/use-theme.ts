/**
 * Returns the active color palette. Reads the user's theme preference from
 * ThemeProvider (light / dark / system) and falls back to the system scheme
 * if used outside the provider.
 *
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useContext } from 'react';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemeModeContext } from '@/lib/theme-context';

export function useTheme() {
  const ctx = useContext(ThemeModeContext);
  const scheme = useColorScheme();
  if (ctx) {
    return ctx.colors;
  }
  const resolved = scheme === 'dark' ? 'dark' : 'light';
  return Colors[resolved];
}
