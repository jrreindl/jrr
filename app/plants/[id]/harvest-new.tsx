import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Button } from '../../../src/components/Button';
import { ChipSelect } from '../../../src/components/ChipSelect';
import { DateField } from '../../../src/components/DateField';
import { FormField } from '../../../src/components/FormField';
import { Screen } from '../../../src/components/Screen';
import { harvestRepo } from '../../../src/db';
import { todayIso } from '../../../src/lib/dates';

const UNITS = ['lbs', 'oz', 'g', 'kg', 'count', 'cups', 'bunches'].map((u) => ({ value: u, label: u }));

export default function NewHarvestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plantId = Number(id);
  const db = useSQLiteContext();
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('count');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState<string | null>(todayIso());
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!quantity.trim() || Number.isNaN(Number(quantity))) {
      Alert.alert('Enter a quantity', 'How much did you harvest?');
      return;
    }
    setSaving(true);
    try {
      await harvestRepo.addHarvest(db, {
        plant_id: plantId,
        harvest_date: date ?? todayIso(),
        quantity: Number(quantity),
        unit,
        notes,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <DateField label="Date" value={date} onChange={setDate} />
      <FormField label="Quantity" placeholder="e.g. 3" keyboardType="decimal-pad" value={quantity} onChangeText={setQuantity} autoFocus />
      <ChipSelect label="Unit" options={UNITS} value={unit} onChange={setUnit} />
      <FormField label="Notes" optional placeholder="How did it taste? Anything notable?" value={notes} onChangeText={setNotes} multiline />
      <Button label="Log Harvest" onPress={save} loading={saving} />
    </Screen>
  );
}
