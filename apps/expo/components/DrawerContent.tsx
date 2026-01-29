/**
 * Custom drawer content - Oura-style slide-out menu
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import { Home, Settings, FileText } from 'lucide-react-native';
import { colors, fontSizes, fonts, spacing, borderRadius } from '@/lib/theme';

interface MenuItem {
  label: string;
  route: string;
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
}

const MENU_ITEMS: MenuItem[] = [
  { label: 'Home', route: '/(drawer)', icon: Home },
  { label: 'Settings', route: '/(drawer)/settings', icon: Settings },
  { label: 'Logs', route: '/(drawer)/logs', icon: FileText },
];

export function DrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const currentRoute = props.state.routes[props.state.index]?.name;

  const handleNavigation = (route: string) => {
    props.navigation.closeDrawer();
    router.push(route as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>TimTracker</Text>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {MENU_ITEMS.map((item) => {
            const isActive = 
              (item.route === '/(drawer)' && currentRoute === 'index') ||
              (item.route === '/(drawer)/settings' && currentRoute === 'settings') ||
              (item.route === '/(drawer)/logs' && currentRoute === 'logs');
            
            const IconComponent = item.icon;
            const iconColor = isActive ? colors.foreground : colors.foregroundMuted;
            
            return (
              <TouchableOpacity
                key={item.route}
                style={[styles.menuItem, isActive && styles.menuItemActive]}
                onPress={() => handleNavigation(item.route)}
                activeOpacity={0.7}
              >
                <View style={styles.menuIcon}>
                  <IconComponent size={20} color={iconColor} strokeWidth={1.5} />
                </View>
                <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </DrawerContentScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[6],
    paddingBottom: spacing[8],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontFamily: fonts.regular,
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  menuContainer: {
    paddingTop: spacing[4],
    paddingHorizontal: spacing[4],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[1],
  },
  menuItemActive: {
    backgroundColor: colors.accent,
  },
  menuIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  menuLabel: {
    fontSize: fontSizes.base,
    fontFamily: fonts.regular,
    color: colors.foregroundMuted,
  },
  menuLabelActive: {
    color: colors.foreground,
  },
});
