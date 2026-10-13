import { useEffect, useState } from 'react';
import { postGifts, PostGiftsOutputType } from 'zitejs/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { cn } from '@project/components/lib/utils';
import PersonAvatar from './PersonAvatar';
import { ago, errMsg } from '../lib/format';

export const GIFTS = [
  { type: 'Rose', emoji: '🌹' }, { type: 'Star', emoji: '⭐' }, { type: 'Heart', emoji: '💖' },
  { type: 'Fire', emoji: '🔥' }, { type: 'Crown', emoji: '👑' }, { type: 'Diamond', emoji: '💎' },
] as const;
const emojiOf = (t: string) => GIFTS.find((g) => g.type === t)?.emoji ?? '🎁';

export default function Gifts({ postId, canSend, onCount }: { postId: string; canSend: boolean; onCount: (n: number) => void }) {
  const [items, setItems] = useState<PostGiftsOutputType['gifts'] | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    postGifts({ postId }).then((r) => setItems(r.gifts)).catch((e) => toast.error(errMsg(e)));
  }, [postId]);

  const send = async (type: (typeof GIFTS)[number]['type']) => {
    setSending(type);
    try {
      const r = await postGifts({ postId, send: type });
      setItems(r.gifts); onCount(r.gifts.length);
      toast.success(`${emojiOf(type)} ${type} sent!`);
    } catch (e) { toast.error(errMsg(e)); } finally { setSending(null); }
  };

  return (
    <div className="space-y-3">
      {canSend && (
        <div className="grid grid-cols-6 gap-1.5">
          {GIFTS.map((g) => (
            <button key={g.type} onClick={() => send(g.type)} disabled={!!sending}
              className={cn('flex flex-col items-center rounded-xl border bg-card py-2 text-[11px] transition hover:scale-105 hover:border-primary disabled:opacity-50')}>
              <span className="text-2xl">{sending === g.type ? <Loader2 className="h-6 w-6 animate-spin" /> : g.emoji}</span>{g.type}
            </button>
          ))}
        </div>
      )}
      {!items && <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />}
      {items?.length === 0 && <p className="text-sm text-muted-foreground">No gifts yet.</p>}
      {items?.map((g) => (
        <div key={g.id} className="flex items-center gap-2 text-sm">
          <PersonAvatar name={g.sender.name} image={g.sender.image} className="h-7 w-7 text-xs" />
          <span className="flex-1"><b>{g.sender.name}</b> sent a {g.type}</span>
          <span className="text-xl">{emojiOf(g.type)}</span>
          <span className="text-[11px] text-muted-foreground">{ago(g.at)}</span>
        </div>
      ))}
    </div>
  );
}
