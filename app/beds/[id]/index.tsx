import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useLayoutEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../../src/components/Badge';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';
import { Screen } from '../../../src/components/Screen';
import { Bed, Plant, bedsRepo, plantsRepo } from '../../../src/db';
import { bedTypeLabels, colors, spacing, statusColors, statusLabels } from '../../../src/lib/theme';

export default function BedDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bedId = Number(id);
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const [bed, setBed] = useState<Bed | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);

  const load = useCallback(async () => {
    const [bedRow, plantRows] = await Promise.all([
      bedsRepo.getBed(db, bedId),
      plantsRepo.listPlants(db, { bedId }),
    ]);
    setBed(bedRow);
    setPlants(plantRows);
  }, [db, bedId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useLayoutEffect(() => {
    if (bed) {
      navigation.setOptions({ title: bed.name });
    }
  }, [bed, navigation]);

  async function handleDelete() {
    if (!bed) return;
    Alert.alert(
      'Delete bed?',
      plants.length > 0
        ? `${plants.length} plant${plants.length === 1 ? '' : 's'} will be unassigned from this bed, not deleted.`
        : 'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await bedsRepo.deleteBed(db, bed.id);
            router.back();
          },
        },
      ]
    );
  }

  if (!bed) return <Screen />;

  return (
    <Screen>
      <Card>
        <Badge label={bedTypeLabels[bed.type]} color={colors.info} />
        {bed.location ? <Text style={styles.meta}>{bed.location}</Text> : null}
        {bed.notes ? <Text style={styles.notes}>{bed.notes}</Text> : null}
        <View style={styles.actionsRow}>
          <Pressable style={styles.actionButton} onPress={() => router.push(`/beds/${bed.id}/edit`)}>
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text style={styles.actionLabel}>Edit</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
            <Text style={[styles.actionLabel, { color: colors.danger }]}>Delete</Text>
          </Pressable>
        </View>
      </Card>

      <Pressable style={styles.addButton} onPress={() => router.push({ pathname: '/plants/new', params: { bedId: bed.id } })}>
        <Ionicons name="add-circle" size={20} color={colors.primary} />
        <Text style={styles.addButtonLabel}>Add a plant to this bed</Text>
      </Pressable>

      {plants.length === 0 ? (
        <EmptyState icon="🌱" title="No plants here yet" />
      ) : (
        plants.map((plant) => (
          <Card key={plant.id} onPress={() => router.push(`/plants/${plant.id}`)}>
            <View style={styles.plantRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.plantName}>{plant.common_name}</Text>
                {plant.variety ? <Text style={styles.meta}>{plant.variety}</Text> : null}
              </View>
              <Badge label={statusLabels[plant.status]} color={statusColors[plant.status]} />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  notes: {
    fontSize: 14,
    color: colors.text,
    marginTop: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionLabel: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  addButtonLabel: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  plantRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plantName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
});
