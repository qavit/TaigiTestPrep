import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Text } from 'react-native';
import FlashcardScreen from '../screens/FlashcardScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{name}</Text>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopColor: '#eee',
            borderTopWidth: 1,
          },
          tabBarActiveTintColor: '#c0392b',
          tabBarInactiveTintColor: '#aaa',
          tabBarLabelStyle: { fontSize: 11, marginBottom: 2 },
        }}
      >
        <Tab.Screen
          name="Flashcard"
          component={FlashcardScreen}
          options={{
            title: '單字卡',
            tabBarIcon: ({ focused }) => <TabIcon name="🃏" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: '設定',
            tabBarIcon: ({ focused }) => <TabIcon name="⚙️" focused={focused} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
