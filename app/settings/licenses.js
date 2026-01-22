import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Material3Colors } from '@/constants/colors';
export default function LicensesScreen() {
    const insets = useSafeAreaInsets();
    const licenses = [
        { name: 'React Native', version: '0.79.6', license: 'MIT', copyright: 'Copyright (c) Meta Platforms, Inc.' },
        { name: 'Expo', version: '~53.0.23', license: 'MIT', copyright: 'Copyright (c) 2015-present 650 Industries, Inc.' },
        { name: 'React', version: '19.0.0', license: 'MIT', copyright: 'Copyright (c) Meta Platforms, Inc.' },
        { name: 'TypeScript', version: '~5.8.3', license: 'Apache-2.0', copyright: 'Copyright (c) Microsoft' },
        { name: 'Expo Router', version: '~5.1.7', license: 'MIT', copyright: 'Copyright (c) 2015-present 650 Industries, Inc.' },
        { name: 'TanStack React Query', version: '^5.83.0', license: 'MIT', copyright: 'Copyright (c) TanStack' },
        { name: 'Notifee', version: '^9.1.8', license: 'Apache-2.0', copyright: 'Copyright (c) Invertase Limited' },
        { name: 'Shopify FlashList', version: '1.7.6', license: 'MIT', copyright: 'Copyright (c) Shopify Inc.' },
        { name: 'Lucide React Native', version: '^0.544.0', license: 'ISC', copyright: 'Copyright (c) 2020 Lucide Contributors' },
        { name: 'React Native Async Storage', version: '2.1.2', license: 'MIT', copyright: 'Copyright (c) React Native Community' },
        { name: 'React Native Safe Area Context', version: '5.4.0', license: 'MIT', copyright: 'Copyright (c) 2019 Th3rd Wave' },
        { name: 'React Native Gesture Handler', version: '~2.24.0', license: 'MIT', copyright: 'Copyright (c) Software Mansion' },
        { name: 'React Native Reanimated', version: '~4.1.0', license: 'MIT', copyright: 'Copyright (c) Software Mansion' },
        { name: 'React Native Screens', version: '~4.11.1', license: 'MIT', copyright: 'Copyright (c) Software Mansion' },
        { name: 'Zustand', version: '^5.0.2', license: 'MIT', copyright: 'Copyright (c) 2019 Paul Henschel' },
    ];
    return (_jsxs(SafeAreaView, { style: styles.container, edges: ['left', 'right', 'bottom'], children: [_jsxs(View, { style: [styles.header, { paddingTop: insets.top + 8 }], children: [_jsx(TouchableOpacity, { style: styles.backButton, onPress: () => router.back(), testID: "licenses-back", children: _jsx(Feather, { name: "arrow-left", size: 24, color: Material3Colors.light.onSurface }) }), _jsx(Text, { style: styles.title, children: "Open Source Licenses" }), _jsx(View, { style: styles.placeholder })] }), _jsxs(ScrollView, { style: styles.licensesList, showsVerticalScrollIndicator: false, children: [_jsx(View, { style: styles.licensesIntro, children: _jsx(Text, { style: styles.licensesIntroText, children: "This app is built with the following open source software:" }) }), licenses.map((license) => (_jsxs(View, { style: styles.licenseItem, children: [_jsxs(View, { style: styles.licenseHeader, children: [_jsx(Text, { style: styles.licenseName, children: license.name }), _jsxs(Text, { style: styles.licenseVersion, children: ["v", license.version] })] }), _jsxs(Text, { style: styles.licenseLicense, children: [license.license, " License"] }), _jsx(Text, { style: styles.licenseCopyright, children: license.copyright })] }, license.name)))] })] }));
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Material3Colors.light.surface,
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
    licensesList: {
        flex: 1,
    },
    licensesIntro: {
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    licensesIntroText: {
        fontSize: 14,
        color: Material3Colors.light.onSurfaceVariant,
        lineHeight: 20,
    },
    licenseItem: {
        marginHorizontal: 24,
        marginVertical: 8,
        padding: 16,
        backgroundColor: Material3Colors.light.surfaceContainerLow,
        borderRadius: 12,
        elevation: 1,
        shadowColor: Material3Colors.light.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    licenseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    licenseName: {
        fontSize: 16,
        fontWeight: '600',
        color: Material3Colors.light.onSurface,
    },
    licenseVersion: {
        fontSize: 12,
        color: Material3Colors.light.onSurfaceVariant,
        backgroundColor: Material3Colors.light.surfaceVariant,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    licenseLicense: {
        fontSize: 14,
        fontWeight: '500',
        color: Material3Colors.light.primary,
        marginBottom: 4,
    },
    licenseCopyright: {
        fontSize: 12,
        color: Material3Colors.light.onSurfaceVariant,
        marginBottom: 4,
    },
});
