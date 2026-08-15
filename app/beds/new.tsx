import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Button } from '../../src/components/Button';
import { ChipSelect } from '../../src/components/ChipSelect';
import { FormField } from '../../src/components/FormField';
import { Screen } from '../../src/components/Screen';
import { bedsRepo } from '../../src/db';
import type { BedType } from '../../src/db/types';
import { bedTypeLabels } from '../../src/lib/theme';

const BED_TYPES = Object.entries(bedTypeLabels).map(([value, label]) => ({ value, label }));

export default function NewBedScreen() {
  const db = useSQLiteContext();
  const [name, setName] = useState('');
  const [type, setType] = useState<BedType>('bed');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give this bed or container a name.');
      return;
    }
    setSaving(true);
    try {
      const id = await bedsRepo.createBed(db, { name, type, location, notes });
      router.replace(`/beds/${id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <FormField label="Name" placeholder="e.g. Raised bed #1" value={name} onChangeText={setName} autoFocus />
      <ChipSelect label="Type" options={BED_TYPES} value={type} onChange={(v) => setType(v as BedType)} />
      <FormField
        label="Location"
        optional
        placeholder="e.g. Backyard, south side"
        value={location}
        onChangeText={setLocation}
      />
      <FormField
        label="Notes"
        optional
        placeholder="Soil type, sun exposure, size..."
        value={notes}
        onChangeText={setNotes}
        multiline
      />
      <Button label="Save Bed" onPress={save} loading={saving} />
    </Screen>
  );
}
