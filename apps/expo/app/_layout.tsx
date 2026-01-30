import 'react-native-gesture-handler';
import { ClerkProvider, ClerkLoaded, useAuth } from '@clerk/clerk-expo';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Geist_400Regular } from '@expo-google-fonts/geist';
import { tokenCache } from '@/lib/tokenCache';
import { colors } from '@/lib/theme';
import { registerBackgroundSync, setTokenGetter } from '@/lib/backgroundSync';

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY');
}

/**
 * Auth guard that redirects based on authentication state
 */
function AuthGuard() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Set up background sync when signed in
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    // Set the token getter for background sync
    setTokenGetter(getToken);

    // Register background sync on iOS
    if (Platform.OS === 'ios') {
      registerBackgroundSync().then((success) => {
        console.log('[BackgroundSync] Registration:', success ? 'success' : 'failed');
      });
    }
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(drawer)';

    if (isSignedIn && !inAuthGroup) {
      // Signed in but not in protected area, redirect to home
      router.replace('/(drawer)');
    } else if (!isSignedIn && inAuthGroup) {
      // Not signed in but in protected area, redirect to sign-in
      router.replace('/sign-in');
    }
  }, [isLoaded, isSignedIn, segments]);

  if (!isLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.foregroundMuted} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Don't render until fonts are loaded
  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.foregroundMuted} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ClerkLoaded>
          <AuthGuard />
        </ClerkLoaded>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
