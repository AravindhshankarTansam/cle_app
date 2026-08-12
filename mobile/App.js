import React, { useState, useEffect } from 'react';
import { StyleSheet, View, StatusBar, NativeModules, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import LoginScreen from './components/LoginScreen';
import DashboardScreen from './components/DashboardScreen';
import UserInfoScreen from './components/UserInfoScreen';

const { ConfigModule } = NativeModules;

const DEFAULT_API_URL = 'http://192.168.29.63:5000';

let currentSessionUser = null;

if (global.fetch) {
  const originalFetch = global.fetch;
  global.fetch = async (url, options = {}) => {
    if (currentSessionUser) {
      options.headers = {
        ...options.headers,
        'x-user-role': currentSessionUser.role,
        'x-user-id': String(currentSessionUser.id),
        'x-user-username': currentSessionUser.username
      };
    }
    return originalFetch(url,  options);
  };
}

export default function App() {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [currentUser, setCurrentUser] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeScreen, setActiveScreen] = useState('dashboard');

  useEffect(() => {
    currentSessionUser = currentUser;
    if (Platform.OS === 'android' && ConfigModule && apiUrl) {
      const username = currentUser ? currentUser.username : 'Admin (Auto)';
      ConfigModule.setConfig(apiUrl, username);
    }
  }, [apiUrl, currentUser]);

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveScreen('dashboard');
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const bgColor = isDarkMode ? '#060913' : '#f8fafc';

  const isAdmin = currentUser?.role === 'Admin';

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.safeContainer, { backgroundColor: bgColor }]} edges={['top', 'bottom']}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={bgColor} />
        <View style={[styles.appContainer, { backgroundColor: bgColor }]}>
          {!currentUser ? (
            <LoginScreen
              apiUrl={apiUrl}
              setApiUrl={setApiUrl}
              onLoginSuccess={setCurrentUser}
              isDarkMode={isDarkMode}
              toggleTheme={toggleTheme}
            />
          ) : activeScreen === 'userInfo' ? (
            <UserInfoScreen
              currentUser={currentUser}
              isDarkMode={isDarkMode}
              onBack={() => setActiveScreen('dashboard')}
              onLogout={handleLogout}
            />
          ) : (
            <DashboardScreen
              currentUser={currentUser}
              apiUrl={apiUrl}
              onLogout={handleLogout}
              isDarkMode={isDarkMode}
              toggleTheme={toggleTheme}
              onGoToUserInfo={() => setActiveScreen('userInfo')}
            />
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
  },
  appContainer: {
    flex: 1,
  },
});
