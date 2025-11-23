import { Stack } from 'expo-router';
import React from 'react';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="defaults" />
      <Stack.Screen name="licenses" />
      <Stack.Screen name="privacy" />
    </Stack>
  );
}
