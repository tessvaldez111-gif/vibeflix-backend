// ===== App Entry - Navigation Setup =====
import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StatusBar, StyleSheet } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Stores
import { useAuthStore } from './stores';

// Tab Screens
import { HomeTab } from './screens/tabs/HomeTab';
import { ExploreTab } from './screens/tabs/ExploreTab';
import { WalletTab } from './screens/tabs/WalletTab';
import { ProfileTab } from './screens/tabs/ProfileTab';

// Stack Screens
import { LoginScreen } from './screens/auth/LoginScreen';
import { RegisterScreen } from './screens/auth/RegisterScreen';
import { DramaDetailScreen } from './screens/drama/DramaDetailScreen';
import { PlayerScreen } from './screens/drama/PlayerScreen';
import { HistoryScreen } from './screens/profile/HistoryScreen';
import { FavoritesScreen } from './screens/profile/FavoritesScreen';
import { SettingsScreen } from './screens/profile/SettingsScreen';

// Theme
import { COLORS } from './utils/constants';

// Toast (iOS)
import { useToastProvider } from './hooks/useToast';
import { ToastOverlay } from './components/ui/ToastOverlay';

// ===== Tab Navigator =====
type TabParamList = {
  HomeTab: undefined;
  ExploreTab: undefined;
  WalletTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const TabNavigator = () => {
  const { t } = useTranslation();
  return (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: COLORS.surface,
        borderTopColor: COLORS.outline,
        borderTopWidth: 1,
        height: 60,
        paddingBottom: 8,
        paddingTop: 4,
      },
      tabBarActiveTintColor: COLORS.primaryLight,
      tabBarInactiveTintColor: COLORS.onSurfaceVariant,
      tabBarLabelStyle: { fontSize: 12 },
    }}
  >
    <Tab.Screen
      name="HomeTab"
      component={HomeTab}
      options={{
        tabBarLabel: t('tab_home'),
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="home" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="ExploreTab"
      component={ExploreTab}
      options={{
        tabBarLabel: t('tab_explore'),
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="compass" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="WalletTab"
      component={WalletTab}
      options={{
        tabBarLabel: t('tab_wallet'),
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="wallet" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="ProfileTab"
      component={ProfileTab}
      options={{
        tabBarLabel: t('tab_profile'),
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="person" size={size} color={color} />
        ),
      }}
    />
  </Tab.Navigator>
  );
};

// ===== Stack Navigator =====
export type RootStackParamList = {
  MainTabs: undefined;
  Login: undefined;
  Register: undefined;
  DramaDetail: { dramaId: number };
  Player: { dramaId: number; episodeId: number; videoPath: string };
  WatchHistory: undefined;
  Favorites: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const { init, isLoading, isAuthenticated } = useAuthStore();
  const { toastState } = useToastProvider();

  useEffect(() => {
    init();
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer theme={DarkTheme}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="DramaDetail" component={DramaDetailScreen} />
            <Stack.Screen
              name="Player"
              component={PlayerScreen}
              options={{
                animation: 'fade',
                orientation: 'landscape',
              }}
            />
            <Stack.Screen name="WatchHistory" component={HistoryScreen} />
            <Stack.Screen name="Favorites" component={FavoritesScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </>
        )}
      </Stack.Navigator>
      {/* iOS Toast Overlay */}
      <ToastOverlay visible={toastState.visible} message={toastState.message} type={toastState.type} />
    </NavigationContainer>
  );
}

// ===== Splash Screen =====
const SplashScreen: React.FC = () => {
  const { t } = useTranslation();
  return (
  <View style={splashStyles.container}>
    <View style={splashStyles.iconBox}>
      <Ionicons name="play" size={40} color={COLORS.primary} />
    </View>
    <Text style={splashStyles.title}>{t('app_name')}</Text>
    <ActivityIndicator size="small" color={COLORS.onSurfaceVariant} style={{ marginTop: 16 }} />
  </View>
  );
};

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: COLORS.onSurface,
    fontSize: 28,
    fontWeight: 'bold',
  },
});
