import { useState } from 'react';
import { Alert } from 'react-native';
import { Button } from './Button';
import { ChipSelect } from './ChipSelect';
import { DateField } from './DateField';
import { FormField } from './FormField';
import type { Bed, PlantInput } from '../db/types';
import { plantStatuses, statusColors, statusLabels, sunLabels } from '../lib/theme';

const STATUS_OPTIONS = plantStatuses.map((value) => ({
  value,
  label: statusLabels[value],
  color: statusColors[value],
}));
const SUN_OPTIONS = [
  { value: '', label: 'Not set' },
  ...Object.entries(sunLabels).map(([value, label]) => ({ value, label })),
];

interface PlantFormProps {
  beds: Bed[];
  initialValues?: Partial<PlantInput>;
  submitLabel: string;
  saving: boolean;
  onSubmit: (input: PlantInput) => Promise<void>;
}

export function PlantForm({ beds, initialValues, submitLabel, saving, onSubmit }: PlantFormProps) {
  const [commonName, setCommonName] = useState(initialValues?.common_name ?? '');
  const [variety, setVariety] = useState(initialValues?.variety ?? '');
  const [species, setSpecies] = useState(initialValues?.species ?? '');
  const [source, setSource] = useState(initialValues?.source ?? '');
  const [bedId, setBedId] = useState<number | null>(initialValues?.bed_id ?? null);
  const [status, setStatus] = useState(initialValues?.status ?? 'planned');
  const [sun, setSun] = useState(initialValues?.sun_requirement ?? '');
  const [datePlanted, setDatePlanted] = useState<string | null>(initialValues?.date_planted ?? null);
  const [dateTransplanted, setDateTransplanted] = useState<string | null>(
    initialValues?.date_transplanted ?? null
  );
  const [expectedHarvest, setExpectedHarvest] = useState<string | null>(
    initialValues?.expected_harvest_date ?? null
  );
  const [spacingNotes, setSpacingNotes] = useState(initialValues?.spacing_notes ?? '');
  const [waterNotes, setWaterNotes] = useState(initialValues?.water_notes ?? '');
  const [careNotes, setCareNotes] = useState(initialValues?.care_notes ?? '');
  const [quantity, setQuantity] = useState(initialValues?.quantity?.toString() ?? '');

  const bedOptions = [{ value: '', label: 'None' }, ...beds.map((b) => ({ value: String(b.id), label: b.name }))];

  async function handleSubmit() {
    if (!commonName.trim()) {
      Alert.alert('Name required', 'What plant is this? e.g. Tomato, Basil, Marigold.');
      return;
    }
    await onSubmit({
      bed_id: bedId,
      common_name: commonName,
      variety: variety || null,
      species: species || null,
      source: source || null,
      status: status as PlantInput['status'],
      date_planted: datePlanted,
      date_transplanted: dateTransplanted,
      expected_harvest_date: expectedHarvest,
      sun_requirement: (sun || null) as PlantInput['sun_requirement'],
      water_notes: waterNotes || null,
      spacing_notes: spacingNotes || null,
      care_notes: careNotes || null,
      quantity: quantity ? Number(quantity) : null,
    });
  }

  return (
    <>
      <FormField
        label="Plant name"
        placeholder="e.g. Tomato"
        value={commonName}
        onChangeText={setCommonName}
        autoFocus={!initialValues}
      />
      <FormField label="Variety" optional placeholder="e.g. Cherokee Purple" value={variety} onChangeText={setVariety} />
      <FormField label="Species" optional placeholder="e.g. Solanum lycopersicum" value={species} onChangeText={setSpecies} />
      <ChipSelect label="Bed" options={bedOptions} value={bedId ? String(bedId) : ''} onChange={(v) => setBedId(v ? Number(v) : null)} />
      <ChipSelect label="Status" options={STATUS_OPTIONS} value={status} onChange={(v) => setStatus(v as typeof status)} />
      <ChipSelect label="Sun" options={SUN_OPTIONS} value={sun} onChange={setSun} optional />
      <DateField label="Date planted / sown" value={datePlanted} onChange={setDatePlanted} optional />
      <DateField label="Date transplanted" value={dateTransplanted} onChange={setDateTransplanted} optional />
      <DateField label="Expected harvest" value={expectedHarvest} onChange={setExpectedHarvest} optional />
      <FormField
        label="Quantity"
        optional
        placeholder="e.g. 4"
        keyboardType="number-pad"
        value={quantity}
        onChangeText={setQuantity}
      />
      <FormField label="Source" optional placeholder="e.g. Seed packet, local nursery" value={source} onChangeText={setSource} />
      <FormField label="Spacing notes" optional value={spacingNotes} onChangeText={setSpacingNotes} multiline />
      <FormField label="Watering notes" optional value={waterNotes} onChangeText={setWaterNotes} multiline />
      <FormField
        label="Care notes"
        optional
        placeholder="Fertilizing schedule, pest watch-outs, general care..."
        value={careNotes}
        onChangeText={setCareNotes}
        multiline
      />
      <Button label={submitLabel} onPress={handleSubmit} loading={saving} />
    </>
  );
}
