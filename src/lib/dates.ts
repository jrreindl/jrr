export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function daysBetween(fromIso: string, toIsoStr: string): number {
  const from = new Date(fromIso.length <= 10 ? `${fromIso}T00:00:00` : fromIso);
  const to = new Date(toIsoStr.length <= 10 ? `${toIsoStr}T00:00:00` : toIsoStr);
  const ms = to.getTime() - from.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function relativeDayLabel(iso: string): string {
  const diff = daysBetween(todayIso(), iso.slice(0, 10));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1) return `In ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

export function isOverdue(dueDateIso: string): boolean {
  return daysBetween(todayIso(), dueDateIso.slice(0, 10)) < 0;
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}
