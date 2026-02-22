// src/components/AppNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import LibraryScreen from '../screens/LibraryScreen';
import HomeScreen from '../screens/HomeScreen';
import EventScreen from '../screens/EventScreen';
import ReadEventScreen from '../screens/ReadEventScreen';
import PdfReaderScreen from '../screens/PdfReaderScreen';
import AnnouncementDetail from '../screens/AnnouncementDetail';
import { COLORS } from '../theme/theme';

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
      <Stack.Screen name="Library" component={LibraryScreen} />
      <Stack.Screen name="PdfReader" component={PdfReaderScreen} />
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
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="AnnouncementDetail" component={AnnouncementDetail} />
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
      <Stack.Screen name="NewsList" component={EventScreen} />
      <Stack.Screen name="HaberOku" component={ReadEventScreen} />
    </Stack.Navigator>
  );
}
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="NewsTab"
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            const iconName: React.ComponentProps<typeof MaterialIcons>['name'] =
              route.name === 'LibraryTab'
                ? 'menu-book'
                : route.name === 'HomeTab'
                ? 'home'
                : 'feed';

            const iconSize = focused ? size + 4 : size;
            return <MaterialIcons name={iconName} size={iconSize} color={color} />;
          },
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.muted,
          headerShown: false,
          sceneContainerStyle: {
            backgroundColor: COLORS.background,
          },
          tabBarStyle: {
            backgroundColor: COLORS.surface,
            borderTopColor: COLORS.secondary,
            borderTopWidth: 1,
            paddingVertical: 6,
            height: 72,
            shadowColor: '#000000',
            shadowOpacity: 0.06,
            shadowOffset: { width: 0, height: -2 },
            shadowRadius: 8,
            elevation: 12,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            marginTop: 2,
            fontWeight: '500',
          },
          tabBarIconStyle: {
            marginBottom: -2,
          },
        })}
      >
        <Tab.Screen
          name="LibraryTab"
          component={KutuphaneStack}
          options={{ tabBarLabel: 'Kütüphane' }}
        />
        <Tab.Screen
          name="HomeTab"
          component={AnaSayfaStack}
          options={{ tabBarLabel: 'Ana Sayfa' }}
        />
        <Tab.Screen
          name="NewsTab"
          component={HaberlerStack}
          options={{ tabBarLabel: 'Haberler' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}