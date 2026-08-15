import * as MediaLibrary from 'expo-media-library';

/**
 * Best-effort copy of a plant photo into the device's camera roll, so it's
 * covered by the phone's normal photo backup (iCloud Photos, Google Photos, etc.)
 * even though Garden Log itself only stores data locally. Never throws —
 * a failure here should never block saving the photo to the plant record.
 */
export async function saveToCameraRoll(uri: string): Promise<void> {
  try {
    const permission = await MediaLibrary.requestPermissionsAsync(true);
    if (!permission.granted) return;
    await MediaLibrary.Asset.create(uri);
  } catch (error) {
    if (__DEV__) {
      console.log('Could not save photo to camera roll:', error);
    }
  }
}
