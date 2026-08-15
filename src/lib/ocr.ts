import TextRecognition from '@react-native-ml-kit/text-recognition';

/**
 * On-device label OCR via ML Kit. This native module is not present in Expo Go —
 * it only works in a custom dev client or a production build (see README).
 * Callers should treat `null` as "unavailable", not as an error, and fall back
 * to manual entry.
 */
export async function recognizeTextFromImage(imageUri: string): Promise<string | null> {
  try {
    const result = await TextRecognition.recognize(imageUri);
    return result.text?.trim() || null;
  } catch (error) {
    if (__DEV__) {
      console.log('OCR unavailable (expected in Expo Go):', error);
    }
    return null;
  }
}
