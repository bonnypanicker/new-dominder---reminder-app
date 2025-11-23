import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // Hide Stack headers for all settings screens
      }}
    />
  );
}
