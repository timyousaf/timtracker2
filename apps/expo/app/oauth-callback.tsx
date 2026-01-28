import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import { colors, fontSizes, fonts, spacing } from '@/lib/theme';

// Completes the auth session for web/native flows where applicable
WebBrowser.maybeCompleteAuthSession();

export default function OAuthCallbackScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    // Clerk sometimes needs a moment to hydrate session after redirect.
    const t = setTimeout(() => setShowFallback(true), 4000);
    return () => clearTimeout(t);
  }, []);

  if (isLoaded && isSignedIn) {
    return <Redirect href="/(drawer)" />;
  }

  if (isLoaded && showFallback && !isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.foregroundMuted} />
      <Text style={styles.text}>Finishing sign-in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    gap: spacing[3],
  },
  text: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.regular,
    color: colors.foregroundMuted,
  },
});

