import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { PlantForm } from '../../src/components/PlantForm';
import { Screen } from '../../src/components/Screen';
import { Bed, bedsRepo, plantsRepo } from '../../src/db';
import type { PlantInput } from '../../src/db/types';

export default function NewPlantScreen() {
  const { bedId } = useLocalSearchParams<{ bedId?: string }>();
  const db = useSQLiteContext();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    bedsRepo.listBeds(db).then(setBeds);
  }, [db]);

  async function handleSubmit(input: PlantInput) {
    setSaving(true);
    try {
      const id = await plantsRepo.createPlant(db, input);
      router.replace(`/plants/${id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <PlantForm
        beds={beds}
        initialValues={bedId ? { bed_id: Number(bedId), status: 'planned' } : { status: 'planned' }}
        submitLabel="Save Plant"
        saving={saving}
        onSubmit={handleSubmit}
      />
    </Screen>
  );
}
