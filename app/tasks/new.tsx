import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Text } from 'react-native';
import { Button } from '../../src/components/Button';
import { ChipSelect } from '../../src/components/ChipSelect';
import { DateField } from '../../src/components/DateField';
import { FormField } from '../../src/components/FormField';
import { Screen } from '../../src/components/Screen';
import { Plant, plantsRepo, settingsRepo, tasksRepo } from '../../src/db';
import { todayIso } from '../../src/lib/dates';
import { scheduleTaskReminder } from '../../src/lib/notifications';
import { colors, spacing } from '../../src/lib/theme';

const RECURRENCE_OPTIONS = [
  { value: '', label: "Doesn't repeat" },
  { value: '1', label: 'Daily' },
  { value: '2', label: 'Every 2 days' },
  { value: '3', label: 'Every 3 days' },
  { value: '7', label: 'Weekly' },
  { value: '14', label: 'Every 2 weeks' },
  { value: '30', label: 'Monthly' },
];

export default function NewTaskScreen() {
  const { plantId: plantIdParam } = useLocalSearchParams<{ plantId?: string }>();
  const presetPlantId = plantIdParam ? Number(plantIdParam) : null;
  const db = useSQLiteContext();

  const [plants, setPlants] = useState<Plant[]>([]);
  const [plantId, setPlantId] = useState<number | null>(presetPlantId);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState<string | null>(todayIso());
  const [recurrenceDays, setRecurrenceDays] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!presetPlantId) {
      plantsRepo.listPlants(db).then(setPlants);
    }
  }, [db, presetPlantId]);

  async function save() {
    if (!title.trim()) {
      Alert.alert('Title required', 'What needs to be done?');
      return;
    }
    if (!dueDate) {
      Alert.alert('Due date required', 'When is this due?');
      return;
    }
    setSaving(true);
    try {
      const notificationsEnabled =
        (await settingsRepo.getSetting(db, settingsRepo.SETTINGS_KEYS.notificationsEnabled)) !== 'false';
      const notificationId = notificationsEnabled
        ? await scheduleTaskReminder(title, notes || 'Garden Log reminder', dueDate)
        : null;
      const taskId = await tasksRepo.createTask(
        db,
        {
          plant_id: plantId,
          title,
          notes,
          due_date: dueDate,
          recurrence_days: recurrenceDays ? Number(recurrenceDays) : null,
        },
        notificationId
      );
      if (taskId) {
        router.back();
      }
    } finally {
      setSaving(false);
    }
  }

  const presetPlant = plants.find((p) => p.id === plantId);

  return (
    <Screen>
      {presetPlantId ? (
        <Text style={{ color: colors.textMuted, marginBottom: spacing.lg }}>
          For: {presetPlant?.common_name ?? `plant #${presetPlantId}`}
        </Text>
      ) : (
        <ChipSelect
          label="Plant"
          options={[{ value: '', label: 'General' }, ...plants.map((p) => ({ value: String(p.id), label: p.common_name }))]}
          value={plantId ? String(plantId) : ''}
          onChange={(v) => setPlantId(v ? Number(v) : null)}
        />
      )}
      <FormField label="Task" placeholder="e.g. Water, Fertilize, Prune" value={title} onChangeText={setTitle} autoFocus />
      <DateField label="Due date" value={dueDate} onChange={setDueDate} />
      <ChipSelect label="Repeat" options={RECURRENCE_OPTIONS} value={recurrenceDays} onChange={setRecurrenceDays} />
      <FormField label="Notes" optional value={notes} onChangeText={setNotes} multiline />
      <Button label="Save Task" onPress={save} loading={saving} />
    </Screen>
  );
}
