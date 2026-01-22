import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Material3Colors } from '@/constants/colors';
export default function PrivacyPolicyScreen() {
    const insets = useSafeAreaInsets();
    return (_jsxs(SafeAreaView, { style: styles.container, edges: ['left', 'right', 'bottom'], children: [_jsxs(View, { style: [styles.header, { paddingTop: insets.top + 8 }], children: [_jsx(TouchableOpacity, { style: styles.backButton, onPress: () => router.back(), testID: "privacy-back", children: _jsx(Feather, { name: "arrow-left", size: 24, color: Material3Colors.light.onSurface }) }), _jsx(Text, { style: styles.title, children: "Privacy Policy" }), _jsx(View, { style: styles.placeholder })] }), _jsxs(ScrollView, { style: styles.scroll, contentContainerStyle: styles.scrollContent, showsVerticalScrollIndicator: false, children: [_jsx(Text, { style: styles.sectionTitle, children: "Overview" }), _jsx(Text, { style: styles.text, children: "DoMinder is a local-first reminders app. Your reminders and settings are stored on your device using AsyncStorage. We do not operate a server and do not collect, sell, or share personal data." }), _jsx(Text, { style: styles.sectionTitle, children: "Data We Store" }), _jsxs(Text, { style: styles.text, children: ["- Reminders you create (title, schedule, repeat rules, local flags)", "\n", "- App settings (theme, notification preferences, sort order)", "\n", "This data never leaves your device unless you back it up via your OS."] }), _jsx(Text, { style: styles.sectionTitle, children: "Permissions" }), _jsx(Text, { style: styles.text, children: "Notifications are used to alert you at scheduled times. Sounds and vibration are used according to your preferences. Camera, location, contacts, or other sensitive permissions are not used." }), _jsx(Text, { style: styles.sectionTitle, children: "Third-Party Services" }), _jsx(Text, { style: styles.text, children: "The app does not integrate analytics SDKs or advertising networks. On some platforms, system services (e.g., OS notifications) may process data per their policies." }), _jsx(Text, { style: styles.sectionTitle, children: "Data Control" }), _jsx(Text, { style: styles.text, children: "You can delete reminders individually or clear app data from your device settings to remove all stored information." }), _jsx(Text, { style: styles.sectionTitle, children: "Contact" }), _jsx(Text, { style: styles.text, children: "For privacy questions, please send feedback through the app." })] })] }));
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Material3Colors.light.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 20,
        backgroundColor: Material3Colors.light.surface,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: Material3Colors.light.onSurface,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: -8,
    },
    placeholder: {
        width: 40,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingVertical: 24,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 16,
        color: Material3Colors.light.onSurface,
        marginTop: 16,
        marginBottom: 8,
        fontWeight: '600',
    },
    text: {
        fontSize: 14,
        color: Material3Colors.light.onSurfaceVariant,
        lineHeight: 20,
    },
});
