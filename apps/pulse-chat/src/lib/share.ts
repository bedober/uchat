import { toast } from 'sonner';

/** Opens the phone's share sheet (WhatsApp, etc.); falls back to copying the link. */
export async function shareLink(title: string, text: string, path: string) {
  const url = `${window.location.origin}${path}`;
  if (navigator.share) {
    try { await navigator.share({ title, text, url }); return; }
    catch (e) { if ((e as Error).name === 'AbortError') return; }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast.success('Link copied — paste it anywhere');
  } catch {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank');
  }
}
