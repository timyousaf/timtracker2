import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface ChartCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Container component for charts with consistent styling
 */
export function ChartCard({ children, style }: ChartCardProps) {
  return (
    <View style={[styles.container, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Web-specific shadow
    // @ts-ignore - boxShadow works on web
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
});
