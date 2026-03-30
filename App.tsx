/**
 * Executive Meditator — Root App Component
 * Backend: Supabase (auth + database) + OneSignal (push notifications)
 */
import React, {useEffect} from 'react';
import {StatusBar, LogBox} from 'react-native';
import {Provider} from 'react-redux';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {store} from '@/store';
import {AppNavigator} from '@/navigation/AppNavigator';
import {initializeNotifications} from '@/services/onesignal/notifications';
import {theme} from '@/theme';

LogBox.ignoreLogs([
  'Non-serializable values were found in the action',
  'VirtualizedLists should never be nested',
]);

const App = (): React.JSX.Element => {
  useEffect(() => {
    initializeNotifications();
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="light-content"
          backgroundColor={theme.colors.background}
        />
        <AppNavigator />
      </SafeAreaProvider>
    </Provider>
  );
};

export default App;
