import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { PlantForm } from '../../../src/components/PlantForm';
import { Screen } from '../../../src/components/Screen';
import { Bed, Plant, bedsRepo, plantsRepo } from '../../../src/db';
import type { PlantInput } from '../../../src/db/types';

export default function EditPlantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plantId = Number(id);
  const db = useSQLiteContext();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [plant, setPlant] = useState<Plant | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    bedsRepo.listBeds(db).then(setBeds);
    plantsRepo.getPlant(db, plantId).then(setPlant);
  }, [db, plantId]);

  async function handleSubmit(input: PlantInput) {
    setSaving(true);
    try {
      await plantsRepo.updatePlant(db, plantId, input);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  if (!plant) return <Screen />;

  return (
    <Screen>
      <PlantForm beds={beds} initialValues={plant} submitLabel="Save Changes" saving={saving} onSubmit={handleSubmit} />
    </Screen>
  );
}
