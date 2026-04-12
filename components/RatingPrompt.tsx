import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSettings, useUpdateSettings } from '@/hooks/settings-store';
import { useThemeColors } from '@/hooks/theme-provider';

// Hardcoded for Android Play Store currently
const PLAY_STORE_URL = 'market://details?id=app.rork.dominder_android_reminder_app';
const PLAY_STORE_FALLBACK = 'https://play.google.com/store/apps/details?id=app.rork.dominder_android_reminder_app';

export default function RatingPrompt() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const colors = useThemeColors();
  const [isVisible, setIsVisible] = useState(false);

  const checkShouldShow = useCallback(() => {
    if (!settings) return;

    if (settings.hasRatedApp || settings.ratingPromptDeclined) {
      return;
    }

    // Checking thresholds for usage
    const MIN_OPENS = 5;
    const DAYS_SICE_INSTALL_MIN = 2; // 48 hours
    const HOURS_SINCE_LAST_PROMPT = 24;

    const firstLaunchMs = new Date(settings.firstLaunchDate).getTime();
    const daysSinceInstall = (Date.now() - firstLaunchMs) / (1000 * 60 * 60 * 24);

    if (settings.appOpensCount >= MIN_OPENS && daysSinceInstall >= DAYS_SICE_INSTALL_MIN) {
      if (settings.lastRatingPromptDate) {
        const lastPromptMs = new Date(settings.lastRatingPromptDate).getTime();
        const hoursSinceLastOption = (Date.now() - lastPromptMs) / (1000 * 60 * 60);
        if (hoursSinceLastOption >= HOURS_SINCE_LAST_PROMPT) {
          setIsVisible(true);
        }
      } else {
        setIsVisible(true);
      }
    }
  }, [settings]);

  // Check conditions whenever the opens count or settings change natively via AppState
  useEffect(() => {
    checkShouldShow();
  }, [settings?.appOpensCount, checkShouldShow]);

  const handleRateNow = async () => {
    try {
      if (Platform.OS === 'android') {
        const canOpen = await Linking.canOpenURL(PLAY_STORE_URL);
        if (canOpen) {
          await Linking.openURL(PLAY_STORE_URL);
        } else {
          await Linking.openURL(PLAY_STORE_FALLBACK);
        }
      } else {
        // Fallback or iOS handling if expanded later
      }
    } catch (e) {
      console.log('Error opening store', e);
    } finally {
      setIsVisible(false);
      updateSettings.mutate({ hasRatedApp: true });
    }
  };

  const handleRemindLater = () => {
    setIsVisible(false);
    updateSettings.mutate({ lastRatingPromptDate: new Date().toISOString() });
  };

  const handleNoThanks = () => {
    setIsVisible(false);
    updateSettings.mutate({ ratingPromptDeclined: true });
  };

  if (!isVisible) return null;

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="fade"
      onRequestClose={handleRemindLater}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surfaceContainerHigh }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryContainer }]}>
            <Feather name="star" size={32} color={colors.primary} />
          </View>
          
          <Text style={[styles.title, { color: colors.onSurface }]}>
            Enjoying DoMinder?
          </Text>
          <Text style={[styles.message, { color: colors.onSurfaceVariant }]}>
            Your ratings and reviews help us improve the app and build better features for you.
          </Text>

          <View style={styles.buttons}>
            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleRateNow}
            >
              <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>
                Rate on Play Store
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.secondaryButton, { backgroundColor: colors.surfaceVariant }]}
              onPress={handleRemindLater}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.onSurfaceVariant }]}>
                Remind me later
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.tertiaryButton}
              onPress={handleNoThanks}
            >
              <Text style={[styles.tertiaryButtonText, { color: colors.onSurfaceVariant }]}>
                No, thanks
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  tertiaryButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tertiaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
