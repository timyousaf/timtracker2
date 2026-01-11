import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { TokenCache } from '@clerk/clerk-expo';

/**
 * Token cache for Clerk using expo-secure-store on native
 * and localStorage on web
 */
const createTokenCache = (): TokenCache => {
  return {
    async getToken(key: string): Promise<string | undefined | null> {
      try {
        if (Platform.OS === 'web') {
          return localStorage.getItem(key);
        }
        const item = await SecureStore.getItemAsync(key);
        return item;
      } catch (error) {
        console.error('TokenCache getToken error:', error);
        return null;
      }
    },
    async saveToken(key: string, token: string): Promise<void> {
      try {
        if (Platform.OS === 'web') {
          localStorage.setItem(key, token);
          return;
        }
        await SecureStore.setItemAsync(key, token);
      } catch (error) {
        console.error('TokenCache saveToken error:', error);
      }
    },
    async clearToken(key: string): Promise<void> {
      try {
        if (Platform.OS === 'web') {
          localStorage.removeItem(key);
          return;
        }
        await SecureStore.deleteItemAsync(key);
      } catch (error) {
        console.error('TokenCache clearToken error:', error);
      }
    },
  };
};

export const tokenCache = createTokenCache();
