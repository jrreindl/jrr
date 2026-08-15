import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert } from 'react-native';
import { photosRepo, settingsRepo } from '../db';
import type { PhotoType } from '../db/types';
import { saveToCameraRoll } from '../lib/mediaBackup';
import { recognizeTextFromImage } from '../lib/ocr';
import { persistPickedPhoto } from '../lib/photoStorage';
import { pickPhoto, PhotoSource } from '../lib/pickPhoto';

export interface CaptureResult {
  photoId: number;
  uri: string;
  ocrText: string | null;
}

export function useAddPlantPhoto(plantId: number) {
  const db = useSQLiteContext();
  const [busy, setBusy] = useState(false);

  async function capture(source: PhotoSource, photoType: PhotoType): Promise<CaptureResult | null> {
    setBusy(true);
    try {
      const rawUri = await pickPhoto(source);
      if (!rawUri) return null;

      const persistedUri = await persistPickedPhoto(rawUri);

      const ocrText = photoType === 'label' ? await recognizeTextFromImage(persistedUri) : null;

      const photoId = await photosRepo.addPhoto(db, {
        plant_id: plantId,
        uri: persistedUri,
        photo_type: photoType,
        ocr_text: ocrText,
      });

      const rollSetting = await settingsRepo.getSetting(db, settingsRepo.SETTINGS_KEYS.saveToCameraRoll);
      if (rollSetting !== 'false') {
        await saveToCameraRoll(persistedUri);
      }

      return { photoId, uri: persistedUri, ocrText };
    } catch (error) {
      Alert.alert('Something went wrong', 'Could not save that photo. Please try again.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  function promptSource(photoType: PhotoType, onDone: (result: CaptureResult | null) => void) {
    Alert.alert('Add photo', undefined, [
      { text: 'Take Photo', onPress: () => void capture('camera', photoType).then(onDone) },
      { text: 'Choose from Library', onPress: () => void capture('library', photoType).then(onDone) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return { promptSource, busy };
}
