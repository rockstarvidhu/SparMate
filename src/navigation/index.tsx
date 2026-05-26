import React, { useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { colors, font } from '../constants/theme';
import { usePushNotifications } from '../hooks/usePushNotifications';

import LoginScreen        from '../screens/auth/LoginScreen';
import SignupScreen       from '../screens/auth/SignupScreen';
import ProfileSetupScreen from '../screens/onboarding/ProfileSetupScreen';
import DiscoverScreen     from '../screens/main/DiscoverScreen';
import FiltersScreen      from '../screens/main/FiltersScreen';
import MatchesScreen      from '../screens/main/MatchesScreen';
import ProfileScreen      from '../screens/main/ProfileScreen';
import ChatScreen         from '../screens/main/ChatScreen';

export type AuthStackParams = {
  Login: undefined;
  Signup: undefined;
};

export type MainTabParams = {
  Discover: undefined;
  Filters: undefined;
  Matches: undefined;
  Profile: undefined;
};

export type RootStackParams = {
  MainTabs: { screen?: keyof MainTabParams } | undefined;
  Chat: { matchId: string; otherUser: any };
  ProfileSetup: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParams>();
const Tab       = createBottomTabNavigator<MainTabParams>();
const RootStack = createNativeStackNavigator<RootStackParams>();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Discover: '🔥', Filters: '⚡', Matches: '💬', Profile: '👤',
  };
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.35 }}>
      {icons[name]}
    </Text>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textHint,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Filters"  component={FiltersScreen} />
      <Tab.Screen name="Matches"  component={MatchesScreen} />
      <Tab.Screen name="Profile"  component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const navRef = useRef<NavigationContainerRef<RootStackParams>>(null);

  // Navigate to Matches tab when user taps a match notification
  usePushNotifications((matchId: string) => {
    navRef.current?.navigate('MainTabs', { screen: 'Matches' });
  });

  return (
    <NavigationContainer ref={navRef}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="MainTabs" component={MainTabs} />
        <RootStack.Screen
          name="Chat"
          component={ChatScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

function AuthNavigator() {
  return (
    <NavigationContainer>
      <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="Login"  component={LoginScreen} />
        <AuthStack.Screen name="Signup" component={SignupScreen} />
      </AuthStack.Navigator>
    </NavigationContainer>
  );
}

export default function Navigation() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loader}>
        <Text style={styles.logoText}>
          Spar<Text style={{ color: colors.accent }}>Mate</Text>
        </Text>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (!session) return <AuthNavigator />;

  if (!profile) return (
    <NavigationContainer>
      <ProfileSetupScreen />
    </NavigationContainer>
  );

  return <RootNavigator />;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: {
    fontSize: 32, fontWeight: '700',
    color: colors.text, letterSpacing: -1,
  },
  tabBar: {
    backgroundColor: colors.bgMuted,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    height: 60, paddingBottom: 8,
  },
  tabLabel: { fontSize: 11 },
});
