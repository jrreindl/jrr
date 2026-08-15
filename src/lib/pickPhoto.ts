import * as ImagePicker from 'expo-image-picker';

export type PhotoSource = 'camera' | 'library';

/**
 * Requests the relevant permission and launches the camera or library picker.
 * Returns a transient cache URI (call persistPickedPhoto to keep it), or null
 * if the user cancelled or denied permission.
 */
export async function pickPhoto(source: PhotoSource): Promise<string | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return null;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return null;
    return result.assets[0].uri;
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
}
