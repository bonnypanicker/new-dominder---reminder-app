module.exports = {
  plugins: [
    [
      'react-native-reanimated/plugin',
      {
        // ✅ Android-specific optimizations
        processNestedWorklets: true,
        enableLayoutAnimations: true,
      },
    ],
  ],
};