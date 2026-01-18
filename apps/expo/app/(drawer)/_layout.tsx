import { Drawer } from 'expo-router/drawer';
import { useAuth } from '@clerk/clerk-expo';
import { colors, fontSizes, fonts } from '@/lib/theme';
import { DrawerContent } from '@/components/DrawerContent';

export default function DrawerLayout() {
  const { isSignedIn } = useAuth();

  // This layout should only render when signed in
  if (!isSignedIn) {
    return null;
  }

  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false, // We'll use custom headers
        drawerStyle: {
          backgroundColor: colors.background,
          width: 280,
        },
        drawerType: 'front',
        overlayColor: 'rgba(0, 0, 0, 0.5)',
        swipeEnabled: true,
        swipeEdgeWidth: 50,
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          drawerLabel: 'Home',
          title: 'Home',
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          drawerLabel: 'Settings',
          title: 'Settings',
        }}
      />
    </Drawer>
  );
}
