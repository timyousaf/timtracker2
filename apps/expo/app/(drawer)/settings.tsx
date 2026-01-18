import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { colors, fontSizes, fonts, spacing, borderRadius } from '@/lib/theme';

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const navigation = useNavigation();

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/sign-in');
  };

  const displayName = user?.firstName 
    || user?.emailAddresses[0]?.emailAddress 
    || 'User';

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Nav Bar with Hamburger Menu */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.hamburgerButton}
          onPress={openDrawer}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.userSection}>
          <Text style={styles.label}>Signed in as</Text>
          <Text style={styles.username}>{displayName}</Text>
          {user?.emailAddresses[0]?.emailAddress && user?.firstName && (
            <Text style={styles.email}>{user.emailAddresses[0].emailAddress}</Text>
          )}
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[4],
  },
  hamburgerButton: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: 24,
    height: 2,
    backgroundColor: colors.foreground,
    borderRadius: 1,
  },
  headerTitle: {
    fontSize: fontSizes.base,
    fontFamily: fonts.regular,
    color: colors.foreground,
  },
  content: {
    flex: 1,
    padding: spacing[6],
  },
  userSection: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[5],
    marginBottom: spacing[6],
  },
  label: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.regular,
    color: colors.foregroundMuted,
    marginBottom: spacing[1],
  },
  username: {
    fontSize: fontSizes.lg,
    fontFamily: fonts.regular,
    color: colors.foreground,
  },
  email: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.regular,
    color: colors.foregroundMuted,
    marginTop: spacing[1],
  },
  signOutButton: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.destructive,
  },
  signOutText: {
    color: colors.destructive,
    fontSize: fontSizes.base,
    fontFamily: fonts.regular,
  },
});
