import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Platform, PermissionsAndroid } from 'react-native';
import RingtoneManager from 'react-native-ringtone-manager-new';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setRingerToneUri, ensureBaseChannels } from '../../services/channels';

export default function NotificationSettings() {
  const [selectedToneName, setSelectedToneName] = useState<string>('Default System Alarm');

  useEffect(() => {
    const loadInitialTone = async () => {
      const uri = (await AsyncStorage.getItem('dominder_ringer_tone_uri')) || 'default';
      if (uri === 'default') {
        setSelectedToneName('Default System Alarm');
      } else {
        // Attempt to get the name from the URI if it's a file, or just display the URI
        // This is a simplification; a real app might store the name alongside the URI
        const name = uri.split('/').pop() || uri;
        setSelectedToneName(name);
      }
    };
    loadInitialTone();
  }, []);

  const pickSystemTone = () => {
    RingtoneManager.pickRingtone(
      RingtoneManager.TYPE_ALARM,
      async (res) => {
        const uri = res?.uri || 'default';
        await setRingerToneUri(uri);
        setSelectedToneName(res?.title || 'Default System Alarm');
        await ensureBaseChannels();
      },
      () => {}
    );
  };

  const pickFileTone = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: "Storage Permission",
          message: "This app needs access to your storage to select custom alarm sounds.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log("Storage permission denied");
        return;
      }
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled === false && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await setRingerToneUri(asset.uri);
        setSelectedToneName(asset.name);
        await ensureBaseChannels();
      }
    } catch (err) {
      console.log('DocumentPicker Error:', err);
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, marginBottom: 8 }}>High Priority Tone</Text>
      <Text style={{ fontSize: 14, color: 'gray', marginBottom: 16 }}>Selected: {selectedToneName}</Text>

      <Pressable onPress={pickSystemTone}
        style={{ padding: 12, backgroundColor: '#eee', borderRadius: 8, marginBottom: 10 }}>
        <Text>Select system alarm ringtone</Text>
      </Pressable>

      <Pressable onPress={pickFileTone}
        style={{ padding: 12, backgroundColor: '#eee', borderRadius: 8 }}>
        <Text>Add sound from storage</Text>
      </Pressable>
    </View>
  );
}