import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useLayoutEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { FormField } from '../../src/components/FormField';
import { PlantPhoto, photosRepo, plantsRepo } from '../../src/db';
import { deletePhotoFile } from '../../src/lib/photoStorage';
import { colors, photoTypeLabels, spacing } from '../../src/lib/theme';

export default function PhotoViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const photoId = Number(id);
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const [photo, setPhoto] = useState<PlantPhoto | null>(null);
  const [caption, setCaption] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const row = await photosRepo.getPhoto(db, photoId);
    setPhoto(row);
    setCaption(row?.caption ?? '');
  }, [db, photoId]);

  useLayoutEffect(() => {
    load();
  }, [load]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: photo ? photoTypeLabels[photo.photo_type] : '' });
  }, [photo, navigation]);

  async function saveCaption() {
    if (!photo) return;
    await photosRepo.updatePhotoCaption(db, photo.id, caption);
  }

  async function copyOcrToCareNotes() {
    if (!photo?.ocr_text) return;
    const plant = await plantsRepo.getPlant(db, photo.plant_id);
    if (!plant) return;
    const merged = plant.care_notes ? `${plant.care_notes}\n\n${photo.ocr_text}` : photo.ocr_text;
    await plantsRepo.updatePlant(db, plant.id, { ...plant, care_notes: merged });
    setCopied(true);
  }

  function handleDelete() {
    if (!photo) return;
    Alert.alert('Delete photo?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await photosRepo.deletePhoto(db, photo.id);
          deletePhotoFile(photo.uri);
          router.back();
        },
      },
    ]);
  }

  if (!photo) return <View style={styles.container} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={{ uri: photo.uri }} style={styles.image} contentFit="contain" />

      <View style={styles.panel}>
        <FormField
          label="Caption"
          optional
          placeholder="Add a caption..."
          value={caption}
          onChangeText={setCaption}
          onBlur={saveCaption}
          placeholderTextColor={colors.textMuted}
        />

        {photo.ocr_text ? (
          <View style={styles.ocrBlock}>
            <Text style={styles.ocrLabel}>Text detected on label</Text>
            <Text style={styles.ocrText}>{photo.ocr_text}</Text>
            <Pressable onPress={copyOcrToCareNotes} style={styles.copyButton}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={colors.primary} />
              <Text style={styles.copyLabel}>{copied ? 'Added to care notes' : 'Copy to care notes'}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.deleteButton}>
          <Button label="Delete Photo" variant="danger" onPress={handleDelete} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#111',
  },
  panel: {
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  ocrBlock: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  ocrLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  ocrText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  copyLabel: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  deleteButton: {
    marginTop: spacing.md,
  },
});
