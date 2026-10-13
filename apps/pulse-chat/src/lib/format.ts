import { format, isToday, isYesterday, formatDistanceToNowStrict } from 'date-fns';

export function chatTime(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'd MMM');
}

export function ago(iso: string) {
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
}

export function duration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function errMsg(e: unknown) {
  return e instanceof Error ? e.message : 'Something went wrong';
}

export const isVideoFile = (f: File) => f.type.startsWith('video');
