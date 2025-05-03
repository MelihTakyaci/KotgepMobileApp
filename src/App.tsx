import React, { useEffect } from 'react';
import AppNavigator from './components/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';


export default function App() {
  useEffect(() => {
    async function prepare() {
      try {
        await SplashScreen.preventAutoHideAsync();
        
      } finally {
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);
  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}