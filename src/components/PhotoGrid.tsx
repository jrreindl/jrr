import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { radii } from '../lib/theme';
import type { PlantPhoto } from '../db/types';

interface PhotoGridProps {
  photos: PlantPhoto[];
  onPressPhoto: (photo: PlantPhoto) => void;
}

export function PhotoGrid({ photos, onPressPhoto }: PhotoGridProps) {
  return (
    <View style={styles.grid}>
      {photos.map((photo) => (
        <Pressable key={photo.id} onPress={() => onPressPhoto(photo)} style={styles.thumbWrapper}>
          <Image source={{ uri: photo.uri }} style={styles.thumb} contentFit="cover" transition={150} />
        </Pressable>
      ))}
    </View>
  );
}

const THUMB_SIZE = '31.5%';

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: '2.5%',
  },
  thumbWrapper: {
    width: THUMB_SIZE,
    aspectRatio: 1,
    marginBottom: 8,
  },
  thumb: {
    width: '100%',
    height: '100%',
    borderRadius: radii.sm,
    backgroundColor: '#eee',
  },
});
