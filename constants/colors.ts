// Material 3 Color Tokens
export const Material3Colors = {
  light: {
    // Primary
    primary: '#6750A4',
    onPrimary: '#FFFFFF',
    primaryContainer: '#EADDFF',
    onPrimaryContainer: '#21005D',
    
    // Secondary
    secondary: '#625B71',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#E8DEF8',
    onSecondaryContainer: '#1D192B',
    
    // Tertiary
    tertiary: '#7D5260',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#FFD8E4',
    onTertiaryContainer: '#31111D',
    
    // Error
    error: '#BA1A1A',
    onError: '#FFFFFF',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#410002',
    
    // Background
    background: '#FFFBFE',
    onBackground: '#1C1B1F',
    
    // Surface
    surface: '#FFFBFE',
    onSurface: '#1C1B1F',
    surfaceVariant: '#E7E0EC',
    onSurfaceVariant: '#49454F',
    
    // Surface containers
    surfaceContainer: '#F3EDF7',
    surfaceContainerHigh: '#ECE6F0',
    surfaceContainerHighest: '#E6E0E9',
    surfaceContainerLow: '#F7F2FA',
    surfaceContainerLowest: '#FFFFFF',
    
    // Outline
    outline: '#79747E',
    outlineVariant: '#CAC4D0',
    
    // Other
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#313033',
    inverseOnSurface: '#F4EFF4',
    inversePrimary: '#D0BCFF',
    
    // Success
    success: '#2E7D32',
    onSuccess: '#FFFFFF',
    successContainer: '#C8E6C9',
    onSuccessContainer: '#1B5E20',
    
    // Warning
    warning: '#ED6C02',
    onWarning: '#FFFFFF',
    warningContainer: '#FFE0B2',
    onWarningContainer: '#3D2A00',
    
    // Accent (alias to tertiary for consistency)
    accent: '#7D5260',
    onAccent: '#FFFFFF',
    accentContainer: '#FFD8E4',
    onAccentContainer: '#31111D',
  },
  dark: {
    // Primary
    primary: '#D0BCFF',
    onPrimary: '#381E72',
    primaryContainer: '#4F378B',
    onPrimaryContainer: '#EADDFF',
    
    // Secondary
    secondary: '#CCC2DC',
    onSecondary: '#332D41',
    secondaryContainer: '#4A4458',
    onSecondaryContainer: '#E8DEF8',
    
    // Tertiary
    tertiary: '#EFB8C8',
    onTertiary: '#492532',
    tertiaryContainer: '#633B48',
    onTertiaryContainer: '#FFD8E4',
    
    // Error
    error: '#FFB4AB',
    onError: '#690005',
    errorContainer: '#93000A',
    onErrorContainer: '#FFDAD6',
    
    // Background
    background: '#10131C',
    onBackground: '#E6E1E5',
    
    // Surface
    surface: '#10131C',
    onSurface: '#E6E1E5',
    surfaceVariant: '#49454F',
    onSurfaceVariant: '#CAC4D0',
    
    // Surface containers
    surfaceContainer: '#211F26',
    surfaceContainerHigh: '#2B2930',
    surfaceContainerHighest: '#36343B',
    surfaceContainerLow: '#1D1B20',
    surfaceContainerLowest: '#0B0E14',
    
    // Outline
    outline: '#938F99',
    outlineVariant: '#49454F',
    
    // Other
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#E6E1E5',
    inverseOnSurface: '#313033',
    inversePrimary: '#6750A4',
    
    // Success
    success: '#81C995',
    onSuccess: '#003314',
    successContainer: '#1B5E20',
    onSuccessContainer: '#C8E6C9',
    
    // Warning
    warning: '#F9B775',
    onWarning: '#4B2E00',
    warningContainer: '#5B3F00',
    onWarningContainer: '#FFD8B2',
    
    // Accent (alias to tertiary for consistency)
    accent: '#EFB8C8',
    onAccent: '#492532',
    accentContainer: '#633B48',
    onAccentContainer: '#FFD8E4',
  },
};

// Legacy colors for backward compatibility
const tintColorLight = Material3Colors.light.primary;
const tintColorDark = Material3Colors.dark.primary;

export default {
  light: {
    text: Material3Colors.light.onBackground,
    background: Material3Colors.light.background,
    tint: tintColorLight,
    tabIconDefault: Material3Colors.light.outline,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: Material3Colors.dark.onBackground,
    background: Material3Colors.dark.background,
    tint: tintColorDark,
    tabIconDefault: Material3Colors.dark.outline,
    tabIconSelected: tintColorDark,
  },
};
