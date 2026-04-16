module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|lottie-react-native|react-native-reanimated|react-native-safe-area-context|react-native-screens|react-native-vector-icons|react-native-onesignal|@reduxjs/toolkit|@supabase)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@reduxjs/toolkit$': '<rootDir>/node_modules/@reduxjs/toolkit/dist/cjs/redux-toolkit.development.cjs',
    '^immer$': '<rootDir>/node_modules/immer/dist/cjs/index.js',
  },
  setupFiles: ['./jest.setup.js'],
};
