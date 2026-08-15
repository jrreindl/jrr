import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Button } from '../../../src/components/Button';
import { ChipSelect } from '../../../src/components/ChipSelect';
import { FormField } from '../../../src/components/FormField';
import { Screen } from '../../../src/components/Screen';
import { bedsRepo } from '../../../src/db';
import type { BedType } from '../../../src/db/types';
import { bedTypeLabels } from '../../../src/lib/theme';

const BED_TYPES = Object.entries(bedTypeLabels).map(([value, label]) => ({ value, label }));

export default function EditBedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bedId = Number(id);
  const db = useSQLiteContext();
  const [name, setName] = useState('');
  const [type, setType] = useState<BedType>('bed');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    bedsRepo.getBed(db, bedId).then((bed) => {
      if (bed) {
        setName(bed.name);
        setType(bed.type);
        setLocation(bed.location ?? '');
        setNotes(bed.notes ?? '');
      }
      setLoaded(true);
    });
  }, [db, bedId]);

  async function save() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give this bed or container a name.');
      return;
    }
    setSaving(true);
    try {
      await bedsRepo.updateBed(db, bedId, { name, type, location, notes });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return <Screen />;

  return (
    <Screen>
      <FormField label="Name" value={name} onChangeText={setName} autoFocus />
      <ChipSelect label="Type" options={BED_TYPES} value={type} onChange={(v) => setType(v as BedType)} />
      <FormField label="Location" optional value={location} onChangeText={setLocation} />
      <FormField label="Notes" optional value={notes} onChangeText={setNotes} multiline />
      <Button label="Save Changes" onPress={save} loading={saving} />
    </Screen>
  );
}
