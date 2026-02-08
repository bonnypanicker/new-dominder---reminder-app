import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Appearance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Material3Colors } from '@/constants/colors';
const AlertCircle = (props: any) => <Feather name="alert-circle" {...props} />;
const RefreshCw = (props: any) => <Feather name="refresh-cw" {...props} />;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundaryImpl extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
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
      return <ThemedFallback onReset={this.handleReset} error={this.state.error} errorInfo={this.state.errorInfo} />;
    }

    return this.props.children;
  }
}

function ThemedFallback({ onReset, error, errorInfo }: { onReset: () => void; error: Error | null; errorInfo: ErrorInfo | null }) {
  // NOTE: This component MUST NOT use any hooks that could fail during a crash.
  // All styles are hard-coded to ensure it can render in a broken state.
  const scheme = Appearance.getColorScheme();
  const colors = scheme === 'dark' ? Material3Colors.dark : Material3Colors.light;
  const fallbackStyles = createFallbackStyles(colors);
  return (
    <SafeAreaView style={fallbackStyles.container}>
      <ScrollView contentContainerStyle={fallbackStyles.scrollContent} testID="error-boundary-scroll">
        <View style={fallbackStyles.content} testID="error-boundary">
          <View style={fallbackStyles.iconContainer}>
            <AlertCircle size={64} color={colors.error} />
          </View>
          <Text style={fallbackStyles.title}>Oops! Something went wrong</Text>
          <Text style={fallbackStyles.subtitle}>The app encountered an unexpected error. Please try again.</Text>
          <TouchableOpacity accessibilityRole="button" testID="error-boundary-reset" style={fallbackStyles.resetButton} onPress={onReset}>
            <RefreshCw size={20} color={colors.onPrimary} />
            <Text style={fallbackStyles.resetButtonText}>Try Again</Text>
          </TouchableOpacity>

          <View style={fallbackStyles.errorDetails} testID="error-boundary-details">
            <Text style={fallbackStyles.errorDetailsTitle}>Details</Text>
            {!!error?.message && <Text style={fallbackStyles.errorMessage}>{error.message}</Text>}
            {!!errorInfo?.componentStack && (
              <Text style={fallbackStyles.errorStack}>
                {errorInfo.componentStack}
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createFallbackStyles = (colors: typeof Material3Colors.light) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { flexGrow: 1, justifyContent: 'center' },
    content: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 48 },
    iconContainer: { marginBottom: 24 },
    title: { fontSize: 24, fontWeight: '600' as const, color: colors.onSurface, marginBottom: 12, textAlign: 'center' as const },
    subtitle: { fontSize: 16, color: colors.onSurfaceVariant, textAlign: 'center' as const, marginBottom: 32, lineHeight: 24 },
    resetButton: { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
    resetButtonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' as const },
    errorDetails: { marginTop: 48, padding: 16, backgroundColor: colors.errorContainer, borderRadius: 12, width: '100%' },
    errorDetailsTitle: { fontSize: 14, fontWeight: '600' as const, color: colors.onErrorContainer, marginBottom: 8 },
    errorMessage: { fontSize: 12, color: colors.onErrorContainer, marginBottom: 8 },
    errorStack: { fontSize: 10, color: colors.onErrorContainer, opacity: 0.8 },
});

export default function ErrorBoundary(props: Props) {
  return <ErrorBoundaryImpl {...props} />;
}
