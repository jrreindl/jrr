import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { Bed, bedsRepo, plantsRepo } from '../../src/db';
import { bedTypeLabels, colors, spacing } from '../../src/lib/theme';

export default function BedsScreen() {
  const db = useSQLiteContext();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [plantCounts, setPlantCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const list = await bedsRepo.listBeds(db);
    setBeds(list);
    const counts = await Promise.all(list.map((bed) => plantsRepo.listPlants(db, { bedId: bed.id })));
    setPlantCounts(Object.fromEntries(list.map((bed, i) => [bed.id, counts[i].length])));
    setLoading(false);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) return <Screen />;

  return (
    <Screen onRefresh={load}>
      <Pressable style={styles.addButton} onPress={() => router.push('/beds/new')}>
        <Ionicons name="add-circle" size={20} color={colors.primary} />
        <Text style={styles.addButtonLabel}>Add a garden bed or container</Text>
      </Pressable>

      {beds.length === 0 ? (
        <EmptyState
          icon="🪴"
          title="No beds yet"
          message="Add your garden beds, containers, or rows to start organizing plants."
          actionLabel="Add Bed"
          onAction={() => router.push('/beds/new')}
        />
      ) : (
        beds.map((bed) => (
          <Card key={bed.id} onPress={() => router.push(`/beds/${bed.id}`)}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{bed.name}</Text>
                <Text style={styles.meta}>
                  {bedTypeLabels[bed.type]} · {plantCounts[bed.id] ?? 0} plant
                  {plantCounts[bed.id] === 1 ? '' : 's'}
                </Text>
                {bed.location ? <Text style={styles.meta}>{bed.location}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
});
