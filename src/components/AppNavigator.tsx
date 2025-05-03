// src/components/AppNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import LibraryScreen from '../screens/LibraryScreen';
import HomeScreen from '../screens/HomeScreen';
import EventScreen from '../screens/EventScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Her ekran için bir Stack tanımı
function KutuphaneStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        ...TransitionPresets.SlideFromRightIOS,
      }}
    >
      <Stack.Screen name="KütüphaneAna" component={LibraryScreen} />
    </Stack.Navigator>
  );
}

function AnaSayfaStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        ...TransitionPresets.FadeFromBottomAndroid,
      }}
    >
      <Stack.Screen name="AnaSayfaAna" component={HomeScreen} />
    </Stack.Navigator>
  );
}

function HaberlerStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        ...TransitionPresets.SlideFromRightIOS,
      }}
    >
      <Stack.Screen name="HaberlerAna" component={EventScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName = 'book';
            if (route.name === 'Kütüphane') iconName = focused ? 'library' : 'library-outline';
            else if (route.name === 'Ana Sayfa') iconName = focused ? 'book' : 'book-outline';
            else if (route.name === 'Haberler') iconName = focused ? 'newspaper' : 'newspaper-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#3E64FF',
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
        })}
      >
        <Tab.Screen name="Kütüphane" component={KutuphaneStack} />
        <Tab.Screen name="Ana Sayfa" component={AnaSayfaStack} />
        <Tab.Screen name="Haberler" component={HaberlerStack} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}