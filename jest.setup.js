/**
 * Jest global setup — mock native modules that Jest cannot run.
 */

// Mock @react-native-firebase modules
jest.mock('@react-native-firebase/app', () => ({}));
jest.mock('@react-native-firebase/auth', () => () => ({
  onAuthStateChanged: jest.fn(() => jest.fn()),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signInAnonymously: jest.fn(),
  signOut: jest.fn(),
  currentUser: null,
  AuthorizationStatus: {AUTHORIZED: 1, PROVISIONAL: 2},
}));
jest.mock('@react-native-firebase/firestore', () => {
  const collection = jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({exists: false, data: () => ({})})),
      set: jest.fn(() => Promise.resolve()),
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({set: jest.fn(() => Promise.resolve())})),
        orderBy: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({docs: []})),
          })),
        })),
      })),
    })),
  }));
  const fn = () => ({collection});
  fn.FieldValue = {serverTimestamp: jest.fn()};
  return fn;
});
jest.mock('@react-native-firebase/messaging', () => () => ({
  requestPermission: jest.fn(() => Promise.resolve(1)),
  getToken: jest.fn(() => Promise.resolve('mock-token')),
  onTokenRefresh: jest.fn(),
  onMessage: jest.fn(),
  onNotificationOpenedApp: jest.fn(),
  getInitialNotification: jest.fn(() => Promise.resolve(null)),
  AuthorizationStatus: {AUTHORIZED: 1, PROVISIONAL: 2},
}));

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
