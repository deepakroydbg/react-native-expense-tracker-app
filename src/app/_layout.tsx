import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavThemeProvider,
} from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplash } from '@/components/animated-splash';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { CurrentBookProvider } from '@/lib/current-book';
import { ProfileProvider } from '@/lib/profile';
import { ThemeProvider, useThemeMode } from '@/lib/theme-context';
import { ToastProvider } from '@/components/ui/toast';

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <ProfileProvider>
                <CurrentBookProvider>
                  <RootNavigator />
                </CurrentBookProvider>
              </ProfileProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
        {!splashDone ? <AnimatedSplash onFinish={() => setSplashDone(true)} /> : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();
  const { scheme, colors } = useThemeMode();
  const segments = useSegments();
  const router = useRouter();

  // Redirect based on auth state (handles sign-in, sign-out, deep links).
  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    const inCallback = segments[0] === 'auth'; // /auth/callback deep link handler
    if (!session && !inAuthGroup && !inCallback) {
      router.replace('/(auth)/login');
    } else if (session && (inAuthGroup || inCallback)) {
      // Safety net: once signed in, leave the auth screens / callback for the app.
      router.replace('/(tabs)');
    }
  }, [session, loading, segments, router]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="book/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="faq" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="privacy" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="terms" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="about" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </NavThemeProvider>
  );
}
