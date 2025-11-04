module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Expo Router plugin should come before Reanimated and remain above it
      'expo-router/babel',
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
          },
        },
      ],
      [
        'react-native-reanimated/plugin',
        {
          // ✅ Enable Android fast path
          processNestedWorklets: true,
        }
      ],
    ],
  };
};
