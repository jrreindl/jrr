import { Ionicons } from '@expo/vector-icons';
import { Link, router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../src/components/Badge';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { SectionHeader } from '../../src/components/SectionHeader';
import {
  GardenTask,
  JournalEntry,
  Plant,
  bedsRepo,
  journalRepo,
  plantsRepo,
  tasksRepo,
} from '../../src/db';
import { formatDate, isOverdue, relativeDayLabel, todayIso } from '../../src/lib/dates';
import { colors, journalEntryTypeLabels, spacing } from '../../src/lib/theme';

export default function DashboardScreen() {
  const db = useSQLiteContext();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ active: 0, total: 0, beds: 0 });
  const [overdueTasks, setOverdueTasks] = useState<GardenTask[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<GardenTask[]>([]);
  const [recentJournal, setRecentJournal] = useState<JournalEntry[]>([]);
  const [plantsById, setPlantsById] = useState<Record<number, Plant>>({});

  const load = useCallback(async () => {
    const [plantCounts, beds, upcoming, journal, plants] = await Promise.all([
      plantsRepo.countPlants(db),
      bedsRepo.listBeds(db),
      tasksRepo.listUpcomingTasks(db, 30),
      journalRepo.listRecentJournal(db, 5),
      plantsRepo.listPlants(db),
    ]);

    setCounts({ active: plantCounts.active, total: plantCounts.total, beds: beds.length });
    setOverdueTasks(upcoming.filter((t) => isOverdue(t.due_date)));
    setUpcomingTasks(upcoming.filter((t) => !isOverdue(t.due_date)).slice(0, 5));
    setRecentJournal(journal);
    setPlantsById(Object.fromEntries(plants.map((p) => [p.id, p])));
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
      <View style={styles.statsRow}>
        <StatTile label="Active plants" value={counts.active} icon="flower" />
        <StatTile label="Garden beds" value={counts.beds} icon="grid" />
        <StatTile label="Overdue" value={overdueTasks.length} icon="alert-circle" tone="danger" />
      </View>

      <View style={styles.quickActions}>
        <QuickAction label="Add Plant" icon="add-circle" onPress={() => router.push('/plants/new')} />
        <QuickAction label="Add Bed" icon="grid" onPress={() => router.push('/beds/new')} />
        <QuickAction label="Tasks" icon="checkmark-circle" onPress={() => router.push('/(tabs)/tasks')} />
      </View>

      {overdueTasks.length > 0 && (
        <>
          <SectionHeader title="Overdue" />
          {overdueTasks.map((task) => (
            <TaskRow key={task.id} task={task} plant={task.plant_id ? plantsById[task.plant_id] : undefined} />
          ))}
        </>
      )}

      <SectionHeader title="Upcoming tasks" actionLabel="See all" onAction={() => router.push('/(tabs)/tasks')} />
      {upcomingTasks.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>Nothing due soon. Enjoy the garden.</Text>
        </Card>
      ) : (
        upcomingTasks.map((task) => (
          <TaskRow key={task.id} task={task} plant={task.plant_id ? plantsById[task.plant_id] : undefined} />
        ))
      )}

      <SectionHeader title="Recent activity" />
      {recentJournal.length === 0 ? (
        <EmptyState
          icon="📓"
          title="No journal entries yet"
          message="Log watering, notes, or progress on any plant to see it here."
        />
      ) : (
        recentJournal.map((entry) => {
          const plant = entry.plant_id ? plantsById[entry.plant_id] : undefined;
          return (
            <Card key={entry.id} onPress={() => plant && router.push(`/plants/${plant.id}`)}>
              <View style={styles.journalRow}>
                <Badge label={journalEntryTypeLabels[entry.entry_type]} color={colors.info} />
                <Text style={styles.journalDate}>{formatDate(entry.entry_date)}</Text>
              </View>
              {plant ? <Text style={styles.journalPlant}>{plant.common_name}</Text> : null}
              <Text style={styles.journalBody} numberOfLines={2}>
                {entry.body}
              </Text>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

function StatTile({
  label,
  value,
  icon,
  tone = 'default',
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: 'default' | 'danger';
}) {
  return (
    <View style={styles.statTile}>
      <Ionicons name={icon} size={20} color={tone === 'danger' ? colors.danger : colors.primary} />
      <Text style={[styles.statValue, tone === 'danger' && { color: colors.danger }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

function TaskRow({ task, plant }: { task: GardenTask; plant?: Plant }) {
  const overdue = isOverdue(task.due_date);
  return (
    <Card onPress={() => (plant ? router.push(`/plants/${plant.id}`) : router.push('/(tabs)/tasks'))}>
      <View style={styles.taskRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          {plant ? <Text style={styles.taskSubtitle}>{plant.common_name}</Text> : null}
        </View>
        <Badge label={relativeDayLabel(task.due_date)} color={overdue ? colors.danger : colors.accent} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  quickAction: {
    flex: 1,
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
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
  taskSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  journalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  journalDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  journalPlant: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  journalBody: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
