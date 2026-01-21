import { Tabs } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Text, Platform } from 'react-native';
import { colors, fontSizes, fonts, spacing } from '@/lib/theme';

export default function TabsLayout() {
  const { isSignedIn } = useAuth();

  // This layout should only render when signed in
  if (!isSignedIn) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.foregroundMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: spacing[1],
          height: Platform.OS === 'ios' ? 88 : 60,
        },
        tabBarLabelStyle: {
          fontSize: fontSizes.xs,
          fontFamily: fonts.regular,
        },
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTitleStyle: {
          fontFamily: fonts.regular,
          fontSize: fontSizes.base,
          color: colors.foreground,
          letterSpacing: -0.3,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}
