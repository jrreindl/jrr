import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../src/components/Badge';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { SectionHeader } from '../../src/components/SectionHeader';
import { GardenTask, Plant, plantsRepo, tasksRepo } from '../../src/db';
import { formatDate, isOverdue, relativeDayLabel } from '../../src/lib/dates';
import { completeTaskAndReschedule } from '../../src/lib/taskActions';
import { colors, spacing } from '../../src/lib/theme';

export default function TasksScreen() {
  const db = useSQLiteContext();
  const [tasks, setTasks] = useState<GardenTask[]>([]);
  const [completed, setCompleted] = useState<GardenTask[]>([]);
  const [plantsById, setPlantsById] = useState<Record<number, Plant>>({});
  const [showCompleted, setShowCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [upcoming, done, plants] = await Promise.all([
      tasksRepo.listUpcomingTasks(db, 100),
      tasksRepo.listCompletedTasks(db, 20),
      plantsRepo.listPlants(db, { includeArchived: true }),
    ]);
    setTasks(upcoming);
    setCompleted(done);
    setPlantsById(Object.fromEntries(plants.map((p) => [p.id, p])));
    setLoading(false);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleComplete(task: GardenTask) {
    await completeTaskAndReschedule(db, task);
    load();
  }

  if (loading) return <Screen />;

  const overdue = tasks.filter((t) => isOverdue(t.due_date));
  const upcoming = tasks.filter((t) => !isOverdue(t.due_date));

  return (
    <Screen onRefresh={load}>
      <Pressable style={styles.addButton} onPress={() => router.push('/tasks/new')}>
        <Ionicons name="add-circle" size={20} color={colors.primary} />
        <Text style={styles.addButtonLabel}>Add a task</Text>
      </Pressable>

      {tasks.length === 0 ? (
        <EmptyState icon="✅" title="Nothing on your list" message="Add watering, fertilizing, or other reminders." />
      ) : (
        <>
          {overdue.length > 0 && (
            <>
              <SectionHeader title="Overdue" />
              {overdue.map((task) => (
                <TaskCard key={task.id} task={task} plant={task.plant_id ? plantsById[task.plant_id] : undefined} onComplete={handleComplete} />
              ))}
            </>
          )}
          <SectionHeader title="Upcoming" />
          {upcoming.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>Nothing else due.</Text>
            </Card>
          ) : (
            upcoming.map((task) => (
              <TaskCard key={task.id} task={task} plant={task.plant_id ? plantsById[task.plant_id] : undefined} onComplete={handleComplete} />
            ))
          )}
        </>
      )}

      <SectionHeader title="Completed" actionLabel={showCompleted ? 'Hide' : 'Show'} onAction={() => setShowCompleted((v) => !v)} />
      {showCompleted &&
        (completed.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>Nothing completed yet.</Text>
          </Card>
        ) : (
          completed.map((task) => (
            <Card key={task.id}>
              <View style={styles.taskRow}>
                <Ionicons name="checkmark-circle" size={22} color={colors.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskTitle, styles.completedTitle]}>{task.title}</Text>
                  <Text style={styles.meta}>Completed {formatDate(task.completed_at)}</Text>
                </View>
              </View>
            </Card>
          ))
        ))}
    </Screen>
  );
}

function TaskCard({
  task,
  plant,
  onComplete,
}: {
  task: GardenTask;
  plant?: Plant;
  onComplete: (task: GardenTask) => void;
}) {
  const overdue = isOverdue(task.due_date);
  return (
    <Card onPress={() => plant && router.push(`/plants/${plant.id}`)}>
      <View style={styles.taskRow}>
        <Pressable onPress={() => onComplete(task)} hitSlop={8}>
          <Ionicons name="ellipse-outline" size={22} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          {plant ? <Text style={styles.meta}>{plant.common_name}</Text> : null}
          {task.recurrence_days ? (
            <Text style={styles.meta}>Repeats every {task.recurrence_days} day{task.recurrence_days === 1 ? '' : 's'}</Text>
          ) : null}
        </View>
        <Badge label={relativeDayLabel(task.due_date)} color={overdue ? colors.danger : colors.accent} />
      </View>
    </Card>
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
  completedTitle: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
