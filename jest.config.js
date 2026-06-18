module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect', '<rootDir>/tests/setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-hotkeys-hook)'
  ],
  moduleNameMapper: {
    '^test-renderer$': 'react-test-renderer'
  },
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
};
