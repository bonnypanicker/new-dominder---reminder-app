import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Platform, Linking, NativeModules } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Material3Colors } from '@/constants/colors';
import { useSettings, useUpdateSettings } from '@/hooks/settings-store';
import Slider from '@react-native-community/slider';
const { AlarmModule } = NativeModules;
export default function SettingsScreen() {
    const { data: settings, isLoading } = useSettings();
    const updateSettings = useUpdateSettings();
    const insets = useSafeAreaInsets();
    // Modals replaced by routes
    const [currentRingtone, setCurrentRingtone] = useState('Default Alarm');
    const [expandedSection, setExpandedSection] = useState('general');
    const appVersion = Constants?.expoConfig?.version ?? Constants?.manifest?.version;
    // Load current ringtone on mount
    useEffect(() => {
        const loadRingtone = async () => {
            if (Platform.OS === 'android' && AlarmModule?.getAlarmRingtone) {
                try {
                    const result = await AlarmModule.getAlarmRingtone();
                    if (result?.title) {
                        setCurrentRingtone(result.title);
                    }
                }
                catch (error) {
                    console.log('Error loading ringtone:', error);
                }
            }
        };
        loadRingtone();
    }, []);
    if (isLoading || !settings) {
        return (_jsxs(SafeAreaView, { style: styles.container, edges: ['left', 'right', 'bottom'], children: [_jsxs(View, { style: [styles.header, { paddingTop: insets.top + 8 }], children: [_jsx(TouchableOpacity, { style: styles.backButton, onPress: () => router.back(), testID: "settings-back", children: _jsx(Feather, { name: "arrow-left", size: 24, color: Material3Colors.light.onSurface }) }), _jsx(Text, { style: styles.title, children: "Settings" }), _jsx(View, { style: styles.placeholder })] }), _jsx(View, { style: styles.loadingContainer, children: _jsx(Text, { style: styles.loadingText, children: "Loading settings..." }) })] }));
    }
    const getRepeatModeLabel = (mode) => {
        switch (mode) {
            case 'none': return 'Once';
            case 'daily': return 'Daily';
            case 'weekly': return 'Weekly';
            case 'monthly': return 'Monthly';
            case 'yearly': return 'Yearly';
            case 'every': return 'Every';
            case 'custom': return 'Custom';
            default: return 'Once';
        }
    };
    const getPriorityLabel = (priority) => {
        switch (priority) {
            case 'standard': return 'Standard';
            case 'silent': return 'Silent';
            case 'ringer': return 'Ringer Mode';
            default: return 'Standard';
        }
    };
    return (_jsxs(SafeAreaView, { style: styles.container, edges: ['left', 'right', 'bottom'], children: [_jsxs(View, { style: [styles.header, { paddingTop: insets.top + 8 }], children: [_jsx(TouchableOpacity, { style: styles.backButton, onPress: () => router.back(), testID: "settings-back", children: _jsx(Feather, { name: "arrow-left", size: 24, color: Material3Colors.light.onSurface }) }), _jsx(Text, { style: styles.title, children: "Settings" }), _jsx(View, { style: styles.placeholder })] }), _jsxs(ScrollView, { style: styles.content, showsVerticalScrollIndicator: false, children: [_jsxs(TouchableOpacity, { style: styles.sectionHeader, onPress: () => setExpandedSection(expandedSection === 'general' ? null : 'general'), testID: "section-general", children: [_jsxs(View, { style: styles.sectionHeaderLeft, children: [_jsx(View, { style: styles.sectionIconContainer, children: _jsx(Feather, { name: "sliders", size: 20, color: Material3Colors.light.primary }) }), _jsx(Text, { style: styles.sectionHeaderTitle, children: "General" })] }), _jsx(Feather, { name: "chevron-right", size: 20, color: Material3Colors.light.onSurfaceVariant, style: [styles.chevron, expandedSection === 'general' && styles.chevronExpanded] })] }), expandedSection === 'general' && (_jsxs(View, { style: styles.sectionContent, children: [_jsx(View, { style: styles.toggleGroup, children: _jsxs(TouchableOpacity, { style: styles.toggleItem, onPress: () => updateSettings.mutate({ notificationsEnabled: !settings.notificationsEnabled }), testID: "toggle-notifications", children: [_jsx(Feather, { name: "bell", size: 20, color: settings.notificationsEnabled ? Material3Colors.light.primary : Material3Colors.light.onSurfaceVariant }), _jsx(Text, { style: [styles.toggleLabel, settings.notificationsEnabled && styles.toggleLabelActive], children: "Notifications" }), _jsx(Switch, { value: settings.notificationsEnabled, onValueChange: (value) => updateSettings.mutate({ notificationsEnabled: value }), trackColor: {
                                                false: Material3Colors.light.surfaceVariant,
                                                true: Material3Colors.light.primaryContainer
                                            }, thumbColor: settings.notificationsEnabled ? Material3Colors.light.primary : Material3Colors.light.outline, style: styles.toggleSwitch })] }) }), _jsx(View, { style: styles.subsectionHeader, children: _jsx(Text, { style: [styles.subsectionTitle, { marginLeft: 0 }], children: "Ringer Mode" }) }), _jsxs(View, { style: styles.toggleGroup, children: [_jsxs(TouchableOpacity, { style: styles.toggleItem, onPress: () => updateSettings.mutate({ soundEnabled: !settings.soundEnabled }), testID: "toggle-sound", children: [_jsx(Feather, { name: "speaker", size: 20, color: settings.soundEnabled ? Material3Colors.light.primary : Material3Colors.light.onSurfaceVariant }), _jsx(Text, { style: [styles.toggleLabel, settings.soundEnabled && styles.toggleLabelActive], children: "Sound" }), _jsx(Switch, { value: settings.soundEnabled, onValueChange: (value) => updateSettings.mutate({ soundEnabled: value }), trackColor: {
                                                    false: Material3Colors.light.surfaceVariant,
                                                    true: Material3Colors.light.primaryContainer
                                                }, thumbColor: settings.soundEnabled ? Material3Colors.light.primary : Material3Colors.light.outline, style: styles.toggleSwitch })] }), _jsx(View, { style: styles.toggleDivider }), _jsxs(TouchableOpacity, { style: styles.toggleItem, onPress: () => updateSettings.mutate({ vibrationEnabled: !settings.vibrationEnabled }), testID: "toggle-vibration", children: [_jsx(Feather, { name: "smartphone", size: 20, color: settings.vibrationEnabled ? Material3Colors.light.primary : Material3Colors.light.onSurfaceVariant }), _jsx(Text, { style: [styles.toggleLabel, settings.vibrationEnabled && styles.toggleLabelActive], children: "Vibration" }), _jsx(Switch, { value: settings.vibrationEnabled, onValueChange: (value) => updateSettings.mutate({ vibrationEnabled: value }), trackColor: {
                                                    false: Material3Colors.light.surfaceVariant,
                                                    true: Material3Colors.light.primaryContainer
                                                }, thumbColor: settings.vibrationEnabled ? Material3Colors.light.primary : Material3Colors.light.outline, style: styles.toggleSwitch })] }), _jsx(View, { style: styles.toggleDivider }), _jsxs(View, { style: styles.volumeContainer, children: [_jsxs(View, { style: styles.volumeHeader, children: [_jsx(Feather, { name: "volume-2", size: 20, color: Material3Colors.light.primary }), _jsx(Text, { style: styles.volumeLabel, children: "Volume" }), _jsxs(Text, { style: styles.volumeValue, children: [settings.ringerVolume ?? 100, "%"] })] }), _jsx(Slider, { style: styles.volumeSlider, minimumValue: 10, maximumValue: 100, step: 10, value: settings.ringerVolume ?? 100, onSlidingComplete: (value) => updateSettings.mutate({ ringerVolume: value }), minimumTrackTintColor: Material3Colors.light.primary, maximumTrackTintColor: Material3Colors.light.surfaceVariant, thumbTintColor: Material3Colors.light.primary })] })] }), Platform.OS === 'android' && (_jsxs(TouchableOpacity, { style: styles.ringtoneCard, onPress: async () => {
                                    if (!AlarmModule?.openRingtonePicker) {
                                        console.log('AlarmModule.openRingtonePicker not available');
                                        return;
                                    }
                                    try {
                                        const result = await AlarmModule.openRingtonePicker();
                                        if (result?.title) {
                                            setCurrentRingtone(result.title);
                                        }
                                    }
                                    catch (error) {
                                        if (error?.code !== 'CANCELLED') {
                                            console.error('Error selecting ringtone:', error);
                                        }
                                    }
                                }, testID: "ringtone-picker", children: [_jsx(View, { style: styles.ringtoneIcon, children: _jsx(Feather, { name: "music", size: 20, color: Material3Colors.light.primary }) }), _jsxs(View, { style: styles.ringtoneContent, children: [_jsx(Text, { style: styles.ringtoneTitle, children: "Alarm Tone" }), _jsx(Text, { style: styles.ringtoneValue, children: currentRingtone })] }), _jsx(Feather, { name: "chevron-right", size: 20, color: Material3Colors.light.onSurfaceVariant })] }))] })), _jsxs(TouchableOpacity, { style: styles.sectionHeader, onPress: () => setExpandedSection(expandedSection === 'preferences' ? null : 'preferences'), testID: "section-preferences", children: [_jsxs(View, { style: styles.sectionHeaderLeft, children: [_jsx(View, { style: styles.sectionIconContainer, children: _jsx(Feather, { name: "check-square", size: 20, color: Material3Colors.light.primary }) }), _jsx(Text, { style: styles.sectionHeaderTitle, children: "Preferences" })] }), _jsx(Feather, { name: "chevron-right", size: 20, color: Material3Colors.light.onSurfaceVariant, style: [styles.chevron, expandedSection === 'preferences' && styles.chevronExpanded] })] }), expandedSection === 'preferences' && (_jsxs(View, { style: styles.sectionContent, children: [_jsxs(TouchableOpacity, { style: styles.preferenceCard, onPress: () => router.push('/settings/defaults'), testID: "open-defaults", children: [_jsx(View, { style: styles.preferenceIcon, children: _jsx(Feather, { name: "check-square", size: 20, color: Material3Colors.light.primary }) }), _jsxs(View, { style: styles.preferenceContent, children: [_jsx(Text, { style: styles.preferenceTitle, children: "Reminder Defaults" }), _jsxs(Text, { style: styles.preferenceValue, children: [getRepeatModeLabel(settings.defaultReminderMode), " \u2022 ", getPriorityLabel(settings.defaultPriority)] })] }), _jsx(Feather, { name: "chevron-right", size: 20, color: Material3Colors.light.onSurfaceVariant })] }), _jsxs(TouchableOpacity, { style: styles.preferenceCard, onPress: () => {
                                    const next = settings.sortMode === 'creation' ? 'upcoming' : 'creation';
                                    updateSettings.mutate({ sortMode: next });
                                }, testID: "toggle-sort-mode", children: [_jsx(View, { style: styles.preferenceIcon, children: _jsx(Feather, { name: "clock", size: 20, color: Material3Colors.light.primary }) }), _jsxs(View, { style: styles.preferenceContent, children: [_jsx(Text, { style: styles.preferenceTitle, children: "Sort Order" }), _jsx(Text, { style: styles.preferenceValue, children: settings.sortMode === 'creation' ? 'Newest First' : 'Upcoming First' })] }), _jsx(View, { style: styles.sortToggle, children: _jsx(Text, { style: styles.sortToggleText, children: settings.sortMode === 'creation' ? 'Date' : 'Time' }) })] })] })), _jsxs(TouchableOpacity, { style: styles.sectionHeader, onPress: () => setExpandedSection(expandedSection === 'about' ? null : 'about'), testID: "section-about", children: [_jsxs(View, { style: styles.sectionHeaderLeft, children: [_jsx(View, { style: styles.sectionIconContainer, children: _jsx(Feather, { name: "file-text", size: 20, color: Material3Colors.light.primary }) }), _jsx(Text, { style: styles.sectionHeaderTitle, children: "About" })] }), _jsx(Feather, { name: "chevron-right", size: 20, color: Material3Colors.light.onSurfaceVariant, style: [styles.chevron, expandedSection === 'about' && styles.chevronExpanded] })] }), expandedSection === 'about' && (_jsx(View, { style: styles.sectionContent, children: _jsxs(View, { style: styles.aboutCard, children: [_jsxs(View, { style: styles.aboutHeader, children: [_jsx(Text, { style: styles.aboutAppName, children: "DoMinder" }), _jsx(Text, { style: styles.aboutVersion, children: appVersion ? `v${appVersion}` : '' })] }), _jsx(View, { style: styles.aboutDivider }), _jsx(TouchableOpacity, { style: styles.feedbackButton, onPress: () => {
                                        if (Platform.OS !== 'web') {
                                            Linking.openURL('mailto:bonnyregipanicker@proton.me');
                                        }
                                    }, testID: "send-feedback", children: _jsx(Text, { style: styles.feedbackButtonText, children: "Send Feedback" }) }), _jsxs(TouchableOpacity, { style: styles.licensesButton, onPress: () => router.push('/settings/licenses'), testID: "open-licenses", children: [_jsx(Feather, { name: "file-text", size: 16, color: Material3Colors.light.primary }), _jsx(Text, { style: styles.licensesButtonText, children: "Open Source Licenses" }), _jsx(Feather, { name: "chevron-right", size: 16, color: Material3Colors.light.primary })] }), _jsxs(TouchableOpacity, { style: [styles.licensesButton, { marginTop: 10 }], onPress: () => router.push('/settings/privacy'), testID: "open-privacy", children: [_jsx(Feather, { name: "file-text", size: 16, color: Material3Colors.light.primary }), _jsx(Text, { style: styles.licensesButtonText, children: "Privacy Policy" }), _jsx(Feather, { name: "chevron-right", size: 16, color: Material3Colors.light.primary })] })] }) }))] })] }));
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
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '400',
        color: Material3Colors.light.onSurface,
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: Material3Colors.light.surface,
        borderBottomWidth: 1,
        borderBottomColor: Material3Colors.light.surfaceVariant,
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    sectionIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Material3Colors.light.primaryContainer,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    sectionHeaderTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: Material3Colors.light.onSurface,
    },
    chevron: {
        transform: [{ rotate: '0deg' }],
    },
    chevronExpanded: {
        transform: [{ rotate: '90deg' }],
    },
    sectionContent: {
        padding: 20,
        backgroundColor: Material3Colors.light.surfaceContainerLowest,
    },
    subsectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    subsectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Material3Colors.light.primary,
        marginLeft: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    toggleGroup: {
        backgroundColor: Material3Colors.light.surfaceContainerLow,
        borderRadius: 16,
        padding: 4,
    },
    toggleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    toggleLabel: {
        flex: 1,
        fontSize: 15,
        marginLeft: 12,
        color: Material3Colors.light.onSurfaceVariant,
    },
    toggleLabelActive: {
        color: Material3Colors.light.onSurface,
        fontWeight: '500',
    },
    toggleSwitch: {
        transform: [{ scale: 0.9 }],
    },
    toggleDivider: {
        height: 1,
        backgroundColor: Material3Colors.light.surfaceVariant,
        marginHorizontal: 12,
    },
    preferenceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Material3Colors.light.surfaceContainerLow,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    preferenceIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Material3Colors.light.primaryContainer,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    preferenceContent: {
        flex: 1,
    },
    preferenceTitle: {
        fontSize: 15,
        fontWeight: '500',
        color: Material3Colors.light.onSurface,
        marginBottom: 2,
    },
    preferenceValue: {
        fontSize: 13,
        color: Material3Colors.light.onSurfaceVariant,
    },
    sortToggle: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: Material3Colors.light.primaryContainer,
        borderRadius: 12,
    },
    sortToggleText: {
        fontSize: 12,
        fontWeight: '600',
        color: Material3Colors.light.primary,
    },
    aboutCard: {
        backgroundColor: Material3Colors.light.surfaceContainerLow,
        borderRadius: 16,
        padding: 20,
    },
    aboutHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    aboutAppName: {
        fontSize: 20,
        fontWeight: '600',
        color: Material3Colors.light.onSurface,
    },
    aboutVersion: {
        fontSize: 12,
        color: Material3Colors.light.onSurfaceVariant,
        backgroundColor: Material3Colors.light.surfaceVariant,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    aboutDivider: {
        height: 1,
        backgroundColor: Material3Colors.light.surfaceVariant,
        marginBottom: 16,
    },
    feedbackButton: {
        paddingVertical: 10,
        marginBottom: 12,
    },
    feedbackButtonText: {
        fontSize: 14,
        color: Material3Colors.light.primary,
        textDecorationLine: 'underline',
    },
    licensesButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Material3Colors.light.primaryContainer,
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
    },
    licensesButtonText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: Material3Colors.light.primary,
        marginLeft: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: Material3Colors.light.onSurfaceVariant,
    },
    ringtoneCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Material3Colors.light.surfaceContainerLow,
        borderRadius: 16,
        padding: 16,
        marginTop: 12,
    },
    ringtoneIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Material3Colors.light.primaryContainer,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    ringtoneContent: {
        flex: 1,
    },
    ringtoneTitle: {
        fontSize: 15,
        fontWeight: '500',
        color: Material3Colors.light.onSurface,
        marginBottom: 2,
    },
    ringtoneValue: {
        fontSize: 13,
        color: Material3Colors.light.primary,
        marginBottom: 4,
    },
    ringtoneHint: {
        fontSize: 11,
        color: Material3Colors.light.onSurfaceVariant,
        fontStyle: 'italic',
    },
    volumeContainer: {
        padding: 16,
        paddingTop: 12,
    },
    volumeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    volumeLabel: {
        flex: 1,
        fontSize: 15,
        marginLeft: 12,
        color: Material3Colors.light.onSurface,
        fontWeight: '500',
    },
    volumeValue: {
        fontSize: 14,
        color: Material3Colors.light.primary,
        fontWeight: '600',
    },
    volumeSlider: {
        width: '100%',
        height: 40,
    },
});
