import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PRIORITY_COLORS } from '@/constants/reminders';
import { Material3Colors } from '@/constants/colors';
import { Feather } from '@expo/vector-icons';
const Bell = (props) => _jsx(Feather, { name: "bell", ...props });
const Moon = (props) => _jsx(Feather, { name: "moon", ...props, style: [props.style, { marginLeft: 1.5 }] });
const Speaker = (props) => _jsx(Feather, { name: "volume-2", ...props, style: [props.style, { marginLeft: 0.5 }] });
export default function PrioritySelector({ priority, onPriorityChange }) {
    const priorities = [
        {
            value: 'medium',
            label: 'Standard',
            IconComponent: Bell,
        },
        {
            value: 'low',
            label: 'Silent',
            IconComponent: Moon,
        },
        {
            value: 'high',
            label: 'Ringer',
            IconComponent: Speaker,
        },
    ];
    return (_jsxs(View, { style: styles.container, children: [_jsx(Text, { style: styles.title, children: "Reminder Mode" }), _jsx(View, { style: styles.optionsContainer, children: priorities.map((item) => (_jsxs(TouchableOpacity, { style: [
                        styles.option,
                        priority === item.value
                            ? [styles.selectedOption, { borderColor: PRIORITY_COLORS[item.value] }]
                            : [
                                styles.unselectedOption,
                                { borderColor: Material3Colors.light.outlineVariant },
                            ],
                    ], onPress: () => {
                        onPriorityChange(item.value);
                    }, children: [_jsx(View, { style: [
                                styles.iconContainer,
                                {
                                    backgroundColor: PRIORITY_COLORS[item.value],
                                    opacity: priority === item.value ? 1 : 0.7,
                                    transform: priority === item.value ? [{ scale: 1.15 }] : [{ scale: 1 }],
                                },
                            ], children: _jsx(item.IconComponent, { size: 14, color: "white" }) }), _jsx(Text, { style: [
                                styles.optionLabel,
                                priority === item.value ? styles.selectedLabel : styles.unselectedLabel,
                            ], children: item.label })] }, item.value))) })] }));
}
const styles = StyleSheet.create({
    container: {
        backgroundColor: 'transparent',
    },
    title: {
        fontSize: 14,
        fontWeight: '500',
        color: Material3Colors.light.onSurface,
        marginBottom: 8,
    },
    optionsContainer: {
        flexDirection: 'row',
        gap: 6,
    },
    option: {
        flex: 1,
        padding: 6,
        borderRadius: 8,
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        flexDirection: 'column',
        justifyContent: 'center',
    },
    selectedOption: {
        backgroundColor: Material3Colors.light.primaryContainer,
        elevation: 6,
        shadowColor: Material3Colors.light.shadow,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        borderWidth: 2.5,
    },
    unselectedOption: {
        backgroundColor: Material3Colors.light.surfaceVariant,
        borderColor: Material3Colors.light.outline,
        opacity: 1,
        borderWidth: 1.5,
    },
    iconContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionLabel: {
        fontWeight: '500',
        fontSize: 11,
    },
    selectedLabel: {
        color: Material3Colors.light.onPrimaryContainer,
        fontWeight: '700',
        fontSize: 12,
    },
    unselectedLabel: {
        color: Material3Colors.light.onSurface,
        fontWeight: '500',
        fontSize: 11,
    },
});
