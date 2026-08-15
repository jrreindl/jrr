export type BedType = 'bed' | 'container' | 'row' | 'other';

export interface Bed {
  id: number;
  name: string;
  type: BedType;
  location: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  archived_at: string | null;
}

export type PlantStatus =
  | 'planned'
  | 'seed_starting'
  | 'growing'
  | 'flowering'
  | 'harvesting'
  | 'finished'
  | 'dead';

export type SunRequirement = 'full_sun' | 'part_sun' | 'shade';

export interface Plant {
  id: number;
  bed_id: number | null;
  common_name: string;
  variety: string | null;
  species: string | null;
  source: string | null;
  status: PlantStatus;
  date_planted: string | null;
  date_transplanted: string | null;
  expected_harvest_date: string | null;
  sun_requirement: SunRequirement | null;
  water_notes: string | null;
  spacing_notes: string | null;
  care_notes: string | null;
  quantity: number | null;
  is_favorite: number;
  season: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export type PhotoType = 'label' | 'progress' | 'harvest';

export interface PlantPhoto {
  id: number;
  plant_id: number;
  uri: string;
  photo_type: PhotoType;
  caption: string | null;
  ocr_text: string | null;
  taken_at: string;
}

export type JournalEntryType =
  | 'note'
  | 'watering'
  | 'fertilizing'
  | 'pest'
  | 'disease'
  | 'pruning'
  | 'transplant'
  | 'harvest'
  | 'weather'
  | 'other';

export interface JournalEntry {
  id: number;
  plant_id: number | null;
  bed_id: number | null;
  entry_type: JournalEntryType;
  body: string;
  photo_id: number | null;
  entry_date: string;
  created_at: string;
}

export interface GardenTask {
  id: number;
  plant_id: number | null;
  bed_id: number | null;
  title: string;
  notes: string | null;
  due_date: string;
  recurrence_days: number | null;
  completed_at: string | null;
  notification_id: string | null;
  created_at: string;
}

export interface PlantInput {
  bed_id: number | null;
  common_name: string;
  variety?: string | null;
  species?: string | null;
  source?: string | null;
  status: PlantStatus;
  date_planted?: string | null;
  date_transplanted?: string | null;
  expected_harvest_date?: string | null;
  sun_requirement?: SunRequirement | null;
  water_notes?: string | null;
  spacing_notes?: string | null;
  care_notes?: string | null;
  quantity?: number | null;
  season?: string | null;
}

export interface HarvestLog {
  id: number;
  plant_id: number;
  harvest_date: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  created_at: string;
}
