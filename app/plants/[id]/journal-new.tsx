import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Button } from '../../../src/components/Button';
import { ChipSelect } from '../../../src/components/ChipSelect';
import { DateField } from '../../../src/components/DateField';
import { FormField } from '../../../src/components/FormField';
import { Screen } from '../../../src/components/Screen';
import { journalRepo } from '../../../src/db';
import type { JournalEntryType } from '../../../src/db/types';
import { todayIso } from '../../../src/lib/dates';
import { journalEntryTypeLabels } from '../../../src/lib/theme';

const ENTRY_TYPES = Object.entries(journalEntryTypeLabels).map(([value, label]) => ({ value, label }));

export default function NewJournalEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plantId = Number(id);
  const db = useSQLiteContext();
  const [entryType, setEntryType] = useState<JournalEntryType>('note');
  const [body, setBody] = useState('');
  const [date, setDate] = useState<string | null>(todayIso());
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!body.trim()) {
      Alert.alert('Add some text', 'Write a quick note about what happened.');
      return;
    }
    setSaving(true);
    try {
      await journalRepo.addJournalEntry(db, {
        plant_id: plantId,
        entry_type: entryType,
        body,
        entry_date: date ?? todayIso(),
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ChipSelect label="Type" options={ENTRY_TYPES} value={entryType} onChange={(v) => setEntryType(v as JournalEntryType)} />
      <DateField label="Date" value={date} onChange={setDate} />
      <FormField
        label="Notes"
        placeholder="What's going on with this plant?"
        value={body}
        onChangeText={setBody}
        multiline
        autoFocus
      />
      <Button label="Save Entry" onPress={save} loading={saving} />
    </Screen>
  );
}
