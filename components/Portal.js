import { jsx as _jsx } from "react/jsx-runtime";
import { View, StyleSheet } from 'react-native';
// Simple portal component for rendering at root level
export function Portal({ children }) {
    return (_jsx(View, { style: StyleSheet.absoluteFill, pointerEvents: "box-none", children: children }));
}
