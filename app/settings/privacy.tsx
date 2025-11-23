import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Material3Colors } from '@/constants/colors';

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} testID="privacy-back">
          <Feather name="arrow-left" size={24} color={Material3Colors.light.onSurface} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>
          Overview
        </Text>
        <Text style={styles.text}>
          DoMinder is a local-first reminders app. Your reminders and settings are stored on your device using AsyncStorage. We do not operate a server and do not collect, sell, or share personal data.
        </Text>

        <Text style={styles.sectionTitle}>
          Data We Store
        </Text>
        <Text style={styles.text}>
          - Reminders you create (title, schedule, repeat rules, local flags){"\n"}
          - App settings (theme, notification preferences, sort order){"\n"}
          This data never leaves your device unless you back it up via your OS.
        </Text>

        <Text style={styles.sectionTitle}>
          Permissions
        </Text>
        <Text style={styles.text}>
          Notifications are used to alert you at scheduled times. Sounds and vibration are used according to your preferences. Camera, location, contacts, or other sensitive permissions are not used.
        </Text>

        <Text style={styles.sectionTitle}>
          Third-Party Services
        </Text>
        <Text style={styles.text}>
          The app does not integrate analytics SDKs or advertising networks. On some platforms, system services (e.g., OS notifications) may process data per their policies.
        </Text>

        <Text style={styles.sectionTitle}>
          Data Control
        </Text>
        <Text style={styles.text}>
          You can delete reminders individually or clear app data from your device settings to remove all stored information.
        </Text>

        <Text style={styles.sectionTitle}>
          Contact
        </Text>
        <Text style={styles.text}>
          For privacy questions, please send feedback through the app.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
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
