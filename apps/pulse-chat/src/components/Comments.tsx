import { useEffect, useState } from 'react';
import { postComments, PostCommentsOutputType } from 'zitejs/api';
import { toast } from 'sonner';
import { Loader2, SendHorizontal } from 'lucide-react';
import { Input } from '@project/components/ui/input';
import { Button } from '@project/components/ui/button';
import PersonAvatar from './PersonAvatar';
import { ago, errMsg } from '../lib/format';

export default function Comments({ postId, onCount }: { postId: string; onCount: (n: number) => void }) {
  const [items, setItems] = useState<PostCommentsOutputType['comments'] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    postComments({ postId }).then((r) => setItems(r.comments)).catch((e) => toast.error(errMsg(e)));
  }, [postId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const r = await postComments({ postId, newComment: text });
      setItems(r.comments);
      onCount(r.comments.length);
      setText('');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 px-4 py-3">
      {!items && <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />}
      {items?.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
      {items?.map((c) => (
        <div key={c.id} className="flex gap-2">
          <PersonAvatar name={c.author.name} image={c.author.image} className="h-7 w-7 text-xs" />
          <div className="rounded-xl bg-card px-3 py-1.5 text-sm">
            <span className="font-semibold">{c.author.name}</span> {c.text}
            <p className="text-[11px] text-muted-foreground">{ago(c.at)}</p>
          </div>
        </div>
      ))}
      <form onSubmit={add} className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a comment" maxLength={500} className="bg-card" />
        <Button type="submit" size="icon" disabled={busy || !text.trim()} aria-label="Comment">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
