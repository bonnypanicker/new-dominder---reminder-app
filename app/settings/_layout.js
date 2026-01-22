import { jsx as _jsx } from "react/jsx-runtime";
import { Stack } from 'expo-router';
export default function SettingsLayout() {
    return (_jsx(Stack, { screenOptions: {
            headerShown: false, // Hide Stack headers for all settings screens
        } }));
}
