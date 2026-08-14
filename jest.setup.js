/**
 * Jest global setup — mock native modules that Jest cannot run.
 */

// Mock @supabase/supabase-js
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      signInWithOtp: jest.fn(() => Promise.resolve({ error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      exchangeCodeForSession: jest.fn(() => Promise.resolve({ error: null })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
}));

// Mock react-native-onesignal
jest.mock('react-native-onesignal', () => ({
  OneSignal: {
    initialize: jest.fn(),
    Notifications: {
      requestPermission: jest.fn(() => Promise.resolve(true)),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    User: {
      pushSubscription: {
        getIdAsync: jest.fn(() => Promise.resolve('mock-onesignal-id')),
      },
    },
  },
}));

// Mock @react-native-firebase/analytics.
// The module is a function returning the analytics instance, so the mock has to
// be callable — `analytics().logEvent(...)`. Exposed on globalThis so tests can
// assert which events fired without re-mocking in every file.
global.__analyticsMock = {
  logEvent: jest.fn(() => Promise.resolve()),
  setUserId: jest.fn(() => Promise.resolve()),
};
jest.mock('@react-native-firebase/analytics', () => ({
  __esModule: true,
  default: () => global.__analyticsMock,
}));

// Mock AsyncStorage — the analytics de-dupe markers depend on it.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mock Lottie
jest.mock('lottie-react-native', () => 'LottieView');

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock safe area context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({children}) => children,
  SafeAreaProvider: ({children}) => children,
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
}));

// Suppress specific expected warnings in tests
global.console.warn = jest.fn();
