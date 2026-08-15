import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useLayoutEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../../src/components/Badge';
import { Card } from '../../../src/components/Card';
import { PhotoGrid } from '../../../src/components/PhotoGrid';
import { Screen } from '../../../src/components/Screen';
import { SectionHeader } from '../../../src/components/SectionHeader';
import {
  Bed,
  bedsRepo,
  GardenTask,
  HarvestLog,
  harvestRepo,
  JournalEntry,
  journalRepo,
  Plant,
  PlantPhoto,
  photosRepo,
  plantsRepo,
  tasksRepo,
} from '../../../src/db';
import { useAddPlantPhoto } from '../../../src/hooks/useAddPlantPhoto';
import { formatDate, relativeDayLabel, isOverdue } from '../../../src/lib/dates';
import { completeTaskAndReschedule } from '../../../src/lib/taskActions';
import {
  colors,
  journalEntryTypeLabels,
  spacing,
  statusColors,
  statusLabels,
  sunLabels,
} from '../../../src/lib/theme';
import type { PhotoType } from '../../../src/db/types';

export default function PlantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plantId = Number(id);
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const { promptSource, busy } = useAddPlantPhoto(plantId);

  const [plant, setPlant] = useState<Plant | null>(null);
  const [bed, setBed] = useState<Bed | null>(null);
  const [photos, setPhotos] = useState<PlantPhoto[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [tasks, setTasks] = useState<GardenTask[]>([]);
  const [harvests, setHarvests] = useState<HarvestLog[]>([]);

  const load = useCallback(async () => {
    const plantRow = await plantsRepo.getPlant(db, plantId);
    setPlant(plantRow);
    const [bedRow, photoRows, journalRows, taskRows, harvestRows] = await Promise.all([
      plantRow?.bed_id ? bedsRepo.getBed(db, plantRow.bed_id) : Promise.resolve(null),
      photosRepo.listPhotosForPlant(db, plantId),
      journalRepo.listJournalForPlant(db, plantId),
      tasksRepo.listTasksForPlant(db, plantId),
      harvestRepo.listHarvestsForPlant(db, plantId),
    ]);
    setBed(bedRow);
    setPhotos(photoRows);
    setJournal(journalRows);
    setTasks(taskRows);
    setHarvests(harvestRows);
  }, [db, plantId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useLayoutEffect(() => {
    if (plant) {
      navigation.setOptions({
        title: plant.common_name,
        headerRight: () => (
          <Pressable onPress={toggleFavorite} hitSlop={8}>
            <Ionicons
              name={plant.is_favorite ? 'star' : 'star-outline'}
              size={22}
              color={plant.is_favorite ? colors.accent : colors.textMuted}
            />
          </Pressable>
        ),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plant, navigation]);

  async function toggleFavorite() {
    if (!plant) return;
    await plantsRepo.toggleFavorite(db, plant.id, !plant.is_favorite);
    load();
  }

  function handleAddPhoto(photoType: PhotoType) {
    promptSource(photoType, (result) => {
      if (result) load();
    });
  }

  async function handleCompleteTask(task: GardenTask) {
    await completeTaskAndReschedule(db, task);
    load();
  }

  async function handleDelete() {
    if (!plant) return;
    Alert.alert('Delete plant?', 'This removes all its photos, notes, tasks, and harvest history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await plantsRepo.deletePlant(db, plant.id);
          router.back();
        },
      },
    ]);
  }

  if (!plant) return <Screen />;

  const totalHarvest = harvests.reduce((sum, h) => sum + (h.quantity ?? 0), 0);
  const openTasks = tasks.filter((t) => !t.completed_at);
  const labelPhotos = photos.filter((p) => p.photo_type === 'label');
  const progressPhotos = photos.filter((p) => p.photo_type === 'progress');
  const harvestPhotos = photos.filter((p) => p.photo_type === 'harvest');

  return (
    <Screen>
      <Card>
        <View style={styles.headerRow}>
          <Badge label={statusLabels[plant.status]} color={statusColors[plant.status]} />
          {bed ? (
            <Pressable onPress={() => router.push(`/beds/${bed.id}`)}>
              <Text style={styles.bedLink}>{bed.name}</Text>
            </Pressable>
          ) : (
            <Text style={styles.meta}>Unassigned</Text>
          )}
        </View>
        {plant.variety ? <Text style={styles.variety}>{plant.variety}</Text> : null}
        {plant.species ? <Text style={styles.meta}>{plant.species}</Text> : null}

        <View style={styles.datesRow}>
          <DateStat label="Planted" value={formatDate(plant.date_planted)} />
          <DateStat label="Transplanted" value={formatDate(plant.date_transplanted)} />
          <DateStat label="Harvest by" value={formatDate(plant.expected_harvest_date)} />
        </View>

        {plant.sun_requirement ? (
          <Text style={styles.meta}>☀️ {sunLabels[plant.sun_requirement]}</Text>
        ) : null}
        {plant.quantity ? <Text style={styles.meta}>Quantity: {plant.quantity}</Text> : null}

        {plant.care_notes ? (
          <View style={styles.notesBlock}>
            <Text style={styles.notesLabel}>Care notes</Text>
            <Text style={styles.notesBody}>{plant.care_notes}</Text>
          </View>
        ) : null}
        {plant.water_notes ? (
          <View style={styles.notesBlock}>
            <Text style={styles.notesLabel}>Watering</Text>
            <Text style={styles.notesBody}>{plant.water_notes}</Text>
          </View>
        ) : null}
        {plant.spacing_notes ? (
          <View style={styles.notesBlock}>
            <Text style={styles.notesLabel}>Spacing</Text>
            <Text style={styles.notesBody}>{plant.spacing_notes}</Text>
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          <Pressable style={styles.actionButton} onPress={() => router.push(`/plants/${plant.id}/edit`)}>
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text style={styles.actionLabel}>Edit</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
            <Text style={[styles.actionLabel, { color: colors.danger }]}>Delete</Text>
          </Pressable>
        </View>
      </Card>

      <SectionHeader title="Plant label" actionLabel="Add" onAction={() => handleAddPhoto('label')} />
      {labelPhotos.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>
            Snap a photo of the tag or seed packet — Garden Log will try to read the care text automatically.
          </Text>
        </Card>
      ) : (
        <PhotoGrid photos={labelPhotos} onPressPhoto={(p) => router.push(`/photo/${p.id}`)} />
      )}

      <SectionHeader title="Progress photos" actionLabel="Add" onAction={() => handleAddPhoto('progress')} />
      {progressPhotos.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>Track growth over time with periodic photos.</Text>
        </Card>
      ) : (
        <PhotoGrid photos={progressPhotos} onPressPhoto={(p) => router.push(`/photo/${p.id}`)} />
      )}

      <SectionHeader
        title="Tasks"
        actionLabel="Add"
        onAction={() => router.push({ pathname: '/tasks/new', params: { plantId: plant.id } })}
      />
      {openTasks.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>No open tasks for this plant.</Text>
        </Card>
      ) : (
        openTasks.map((task) => (
          <Card key={task.id}>
            <View style={styles.taskRow}>
              <Pressable onPress={() => handleCompleteTask(task)} hitSlop={8}>
                <Ionicons name="ellipse-outline" size={22} color={colors.primary} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                {task.notes ? <Text style={styles.meta}>{task.notes}</Text> : null}
              </View>
              <Badge
                label={relativeDayLabel(task.due_date)}
                color={isOverdue(task.due_date) ? colors.danger : colors.accent}
              />
            </View>
          </Card>
        ))
      )}

      <SectionHeader title="Journal" actionLabel="Add" onAction={() => router.push(`/plants/${plant.id}/journal-new`)} />
      {journal.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>No notes yet. Log watering, pests, or anything worth remembering.</Text>
        </Card>
      ) : (
        journal.map((entry) => (
          <Card key={entry.id}>
            <View style={styles.headerRow}>
              <Badge label={journalEntryTypeLabels[entry.entry_type]} color={colors.info} />
              <Text style={styles.meta}>{formatDate(entry.entry_date)}</Text>
            </View>
            <Text style={styles.notesBody}>{entry.body}</Text>
          </Card>
        ))
      )}

      <SectionHeader title="Harvest log" actionLabel="Log" onAction={() => router.push(`/plants/${plant.id}/harvest-new`)} />
      {harvests.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>Nothing harvested yet.</Text>
        </Card>
      ) : (
        <>
          <Card>
            <Text style={styles.totalHarvest}>
              Total: {totalHarvest} {harvests[0]?.unit ?? ''}
            </Text>
          </Card>
          {harvests.map((h) => (
            <Card key={h.id}>
              <View style={styles.headerRow}>
                <Text style={styles.taskTitle}>
                  {h.quantity ?? '—'} {h.unit ?? ''}
                </Text>
                <Text style={styles.meta}>{formatDate(h.harvest_date)}</Text>
              </View>
              {h.notes ? <Text style={styles.notesBody}>{h.notes}</Text> : null}
            </Card>
          ))}
        </>
      )}

      {harvestPhotos.length > 0 && (
        <>
          <SectionHeader title="Harvest photos" actionLabel="Add" onAction={() => handleAddPhoto('harvest')} />
          <PhotoGrid photos={harvestPhotos} onPressPhoto={(p) => router.push(`/photo/${p.id}`)} />
        </>
      )}
      {harvestPhotos.length === 0 && (
        <Pressable onPress={() => handleAddPhoto('harvest')}>
          <Text style={styles.addHarvestPhotoLink}>+ Add a harvest photo</Text>
        </Pressable>
      )}

      {busy ? (
        <View style={styles.busyOverlay}>
          <Text style={styles.busyText}>Saving photo…</Text>
        </View>
      ) : null}
    </Screen>
  );
}

function DateStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.dateStat}>
      <Text style={styles.dateStatLabel}>{label}</Text>
      <Text style={styles.dateStatValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bedLink: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  variety: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.sm,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  datesRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  dateStat: {
    flex: 1,
  },
  dateStatLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  dateStatValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  notesBlock: {
    marginTop: spacing.md,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  notesBody: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.lg,
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
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  totalHarvest: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  addHarvestPhotoLink: {
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  busyOverlay: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  busyText: {
    color: colors.textMuted,
  },
});
