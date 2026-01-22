import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
const AlertCircle = (props) => _jsx(Feather, { name: "alert-circle", ...props });
const RefreshCw = (props) => _jsx(Feather, { name: "refresh-cw", ...props });
class ErrorBoundaryImpl extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }
    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }
    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary] caught', error, errorInfo);
        this.setState({
            error,
            errorInfo,
        });
    }
    handleReset = () => {
        console.log('[ErrorBoundary] reset pressed');
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };
    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return _jsx(ThemedFallback, { onReset: this.handleReset, error: this.state.error, errorInfo: this.state.errorInfo });
        }
        return this.props.children;
    }
}
function ThemedFallback({ onReset, error, errorInfo }) {
    // NOTE: This component MUST NOT use any hooks that could fail during a crash.
    // All styles are hard-coded to ensure it can render in a broken state.
    return (_jsx(SafeAreaView, { style: fallbackStyles.container, children: _jsx(ScrollView, { contentContainerStyle: fallbackStyles.scrollContent, testID: "error-boundary-scroll", children: _jsxs(View, { style: fallbackStyles.content, testID: "error-boundary", children: [_jsx(View, { style: fallbackStyles.iconContainer, children: _jsx(AlertCircle, { size: 64, color: '#B3261E' }) }), _jsx(Text, { style: fallbackStyles.title, children: "Oops! Something went wrong" }), _jsx(Text, { style: fallbackStyles.subtitle, children: "The app encountered an unexpected error. Please try again." }), _jsxs(TouchableOpacity, { accessibilityRole: "button", testID: "error-boundary-reset", style: fallbackStyles.resetButton, onPress: onReset, children: [_jsx(RefreshCw, { size: 20, color: "#FFFFFF" }), _jsx(Text, { style: fallbackStyles.resetButtonText, children: "Try Again" })] }), _jsxs(View, { style: fallbackStyles.errorDetails, testID: "error-boundary-details", children: [_jsx(Text, { style: fallbackStyles.errorDetailsTitle, children: "Details" }), !!error?.message && _jsx(Text, { style: fallbackStyles.errorMessage, children: error.message }), !!errorInfo?.componentStack && (_jsx(Text, { style: fallbackStyles.errorStack, children: errorInfo.componentStack }))] })] }) }) }));
}
const fallbackStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    scrollContent: { flexGrow: 1, justifyContent: 'center' },
    content: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 48 },
    iconContainer: { marginBottom: 24 },
    title: { fontSize: 24, fontWeight: '600', color: '#1C1B1F', marginBottom: 12, textAlign: 'center' },
    subtitle: { fontSize: 16, color: '#49454F', textAlign: 'center', marginBottom: 32, lineHeight: 24 },
    resetButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6750A4', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
    resetButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
    errorDetails: { marginTop: 48, padding: 16, backgroundColor: '#F9DEDC', borderRadius: 12, width: '100%' },
    errorDetailsTitle: { fontSize: 14, fontWeight: '600', color: '#410E0B', marginBottom: 8 },
    errorMessage: { fontSize: 12, color: '#410E0B', marginBottom: 8 },
    errorStack: { fontSize: 10, color: '#410E0B', opacity: 0.8 },
});
export default function ErrorBoundary(props) {
    return _jsx(ErrorBoundaryImpl, { ...props });
}
