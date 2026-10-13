import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { searchPeople, createConversation } from 'zitejs/api';
import { toast } from 'sonner';
import { Check, Loader2, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Input } from '@project/components/ui/input';
import { Button } from '@project/components/ui/button';
import { cn } from '@project/components/lib/utils';
import PersonAvatar from './PersonAvatar';
import { errMsg } from '../lib/format';

export default function NewChatDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [q, setQ] = useState('');
  const [debounced] = useDebounce(q, 300);
  const [picked, setPicked] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data, isFetching } = useQuery({
    queryKey: ['people', debounced],
    queryFn: () => searchPeople({ query: debounced }),
    enabled: open,
  });

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const start = async () => {
    setBusy(true);
    try {
      const { id } = await createConversation({ memberIds: picked, title: picked.length > 1 ? title : undefined });
      await qc.invalidateQueries({ queryKey: ['conversations'] });
      onOpenChange(false);
      setPicked([]);
      setTitle('');
      setQ('');
      nav(`/c/${id}`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New chat</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" className="pl-9" />
        </div>
        {picked.length > 1 && (
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Group name (optional)" maxLength={60} />
        )}
        <div className="max-h-72 overflow-y-auto">
          {isFetching && !data && <Loader2 className="mx-auto my-6 h-5 w-5 animate-spin text-muted-foreground" />}
          {data?.people.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No one found. Invite friends to sign up to UChat.</p>}
          {data?.people.map((p) => (
            <button key={p.id} onClick={() => toggle(p.id)}
              className={cn('flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted', picked.includes(p.id) && 'bg-accent')}>
              <PersonAvatar name={p.name} image={p.image} online={p.online} className="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <p className="truncate text-xs text-muted-foreground">{p.status || p.email}</p>
              </div>
              {picked.includes(p.id) && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
        <Button onClick={start} disabled={picked.length === 0 || busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {picked.length > 1 ? `Create group (${picked.length})` : 'Start chat'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
