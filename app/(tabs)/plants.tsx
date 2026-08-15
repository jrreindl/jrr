import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Badge } from '../../src/components/Badge';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { Bed, Plant, PlantPhoto, bedsRepo, photosRepo, plantsRepo } from '../../src/db';
import { colors, plantStatuses, radii, spacing, statusColors, statusLabels } from '../../src/lib/theme';

export default function PlantsScreen() {
  const db = useSQLiteContext();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [thumbs, setThumbs] = useState<Record<number, PlantPhoto | null>>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [plantRows, bedRows] = await Promise.all([plantsRepo.listPlants(db), bedsRepo.listBeds(db)]);
    setPlants(plantRows);
    setBeds(bedRows);
    const thumbEntries = await Promise.all(
      plantRows.map(async (p) => [p.id, await photosRepo.getLatestPhotoForPlant(db, p.id)] as const)
    );
    setThumbs(Object.fromEntries(thumbEntries));
    setLoading(false);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const bedNameById = Object.fromEntries(beds.map((b) => [b.id, b.name]));

  const filtered = plants.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        p.common_name.toLowerCase().includes(q) ||
        (p.variety ?? '').toLowerCase().includes(q) ||
        (p.species ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) return <Screen />;

  return (
    <Screen scroll={false} padded={false} style={{ flex: 1 }}>
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search plants..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <Pressable style={styles.addButton} onPress={() => router.push('/plants/new')}>
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        <FilterChip label="All" active={statusFilter === null} onPress={() => setStatusFilter(null)} />
        {plantStatuses.map((status) => (
          <FilterChip
            key={status}
            label={statusLabels[status]}
            color={statusColors[status]}
            active={statusFilter === status}
            onPress={() => setStatusFilter(status)}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {filtered.length === 0 ? (
          <EmptyState
            icon="🌿"
            title={plants.length === 0 ? 'No plants yet' : 'No matches'}
            message={plants.length === 0 ? 'Add your first plant to start tracking it.' : 'Try a different search or filter.'}
            actionLabel={plants.length === 0 ? 'Add Plant' : undefined}
            onAction={plants.length === 0 ? () => router.push('/plants/new') : undefined}
          />
        ) : (
          filtered.map((plant) => {
            const thumb = thumbs[plant.id];
            return (
              <Card key={plant.id} onPress={() => router.push(`/plants/${plant.id}`)}>
                <View style={styles.plantRow}>
                  {thumb ? (
                    <Image source={{ uri: thumb.uri }} style={styles.thumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                      <Ionicons name="leaf-outline" size={22} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.plantName}>{plant.common_name}</Text>
                      {plant.is_favorite ? <Ionicons name="star" size={14} color={colors.accent} /> : null}
                    </View>
                    {plant.variety ? <Text style={styles.meta}>{plant.variety}</Text> : null}
                    <Text style={styles.meta}>{plant.bed_id ? bedNameById[plant.bed_id] : 'Unassigned'}</Text>
                  </View>
                  <Badge label={statusLabels[plant.status]} color={statusColors[plant.status]} />
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

function FilterChip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: color ?? colors.primary, borderColor: color ?? colors.primary }]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  chipTextActive: {
    color: '#fff',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  plantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  plantName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
