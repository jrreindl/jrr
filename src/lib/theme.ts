export const colors = {
  background: '#F7FAF5',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF4EA',
  border: '#DEE7D8',
  text: '#1F2B1C',
  textMuted: '#5B6B55',
  primary: '#3F7D45',
  primaryDark: '#2C5A31',
  primaryLight: '#E9F3E5',
  accent: '#D98A2B',
  danger: '#B3452E',
  dangerLight: '#F8E4DE',
  info: '#3B6E8F',
  overdue: '#B3452E',
  dueSoon: '#D98A2B',
  onTrack: '#3F7D45',
} as const;

export const statusColors: Record<string, string> = {
  planned: '#8C7B4E',
  seed_starting: '#6E8F3B',
  growing: '#3F7D45',
  flowering: '#B15FA8',
  harvesting: '#D98A2B',
  finished: '#5B6B55',
  dead: '#B3452E',
};

export const statusLabels: Record<string, string> = {
  planned: 'Planned',
  seed_starting: 'Seed starting',
  growing: 'Growing',
  flowering: 'Flowering',
  harvesting: 'Harvesting',
  finished: 'Finished',
  dead: 'Dead',
};

export const plantStatuses = Object.keys(statusLabels);

export const sunLabels: Record<string, string> = {
  full_sun: 'Full sun',
  part_sun: 'Part sun',
  shade: 'Shade',
};

export const bedTypeLabels: Record<string, string> = {
  bed: 'Garden bed',
  container: 'Container / pot',
  row: 'Row',
  other: 'Other',
};

export const journalEntryTypeLabels: Record<string, string> = {
  note: 'Note',
  watering: 'Watering',
  fertilizing: 'Fertilizing',
  pest: 'Pest',
  disease: 'Disease',
  pruning: 'Pruning',
  transplant: 'Transplant',
  harvest: 'Harvest',
  weather: 'Weather',
  other: 'Other',
};

export const photoTypeLabels: Record<string, string> = {
  label: 'Plant label',
  progress: 'Progress photo',
  harvest: 'Harvest photo',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};
