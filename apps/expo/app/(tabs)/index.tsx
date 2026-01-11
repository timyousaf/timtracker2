import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

export default function HomeScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/sign-in');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>TimTracker</Text>
        
        <View style={styles.userInfo}>
          <Text style={styles.greeting}>
            Hello, {user?.firstName || user?.emailAddresses[0]?.emailAddress || 'User'}!
          </Text>
          <Text style={styles.subtitle}>You are signed in.</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/(tabs)/health-metrics')}
          >
            <Text style={styles.linkButtonText}>View Health Metrics →</Text>
          </TouchableOpacity>
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
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  userInfo: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    gap: 16,
  },
  linkButton: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  linkButtonText: {
    color: '#0066cc',
    fontSize: 16,
    fontWeight: '500',
  },
  signOutButton: {
    marginTop: 'auto',
    padding: 16,
    alignItems: 'center',
  },
  signOutText: {
    color: '#c00',
    fontSize: 16,
  },
});
