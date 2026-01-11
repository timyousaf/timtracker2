import { Tabs } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Text } from 'react-native';

export default function TabsLayout() {
  const { isSignedIn } = useAuth();

  // This layout should only render when signed in
  if (!isSignedIn) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0066cc',
        tabBarInactiveTintColor: '#666',
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTitleStyle: {
          fontWeight: '600',
        },
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
        name="health-metrics"
        options={{
          title: 'Health',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>❤️</Text>,
        }}
      />
    </Tabs>
  );
}
