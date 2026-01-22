import { Platform, NativeModules } from 'react-native';
const { AlarmModule } = NativeModules;
/**
 * Show an Android system toast message
 * @param message - The message to display
 * @param duration - 'SHORT' (default, ~2s) or 'LONG' (~3.5s)
 */
export function showToast(message, duration = 'SHORT') {
    if (Platform.OS === 'android' && AlarmModule?.showToast) {
        const durationValue = duration === 'LONG' ? 1 : 0;
        AlarmModule.showToast(message, durationValue);
    }
    else {
        // Fallback for other platforms or if module not available
        console.log(`[Toast] ${message}`);
    }
}
