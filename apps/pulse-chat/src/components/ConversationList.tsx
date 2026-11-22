import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listConversations } from 'zitejs/api';
import { Search, SquarePen, Eye } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Skeleton } from '@project/components/ui/skeleton';
import { cn } from '@project/components/lib/utils';
import PersonAvatar from './PersonAvatar';
import NewChatDialog from './NewChatDialog';
import { chatTime } from '../lib/format';

export default function ConversationList({ activeId }: { activeId?: string }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['conversations'], queryFn: () => listConversations({}), refetchInterval: 3000 });
  const term = q.trim().toLowerCase();
  const list = (data?.conversations ?? []).filter((c) =>
    !term || c.title.toLowerCase().includes(term) || c.members.some((m) => m.name.toLowerCase().includes(term)));

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between px-4 pb-3 pt-5 sm:px-6 sm:pt-6">
        <h1 className="text-[28px] font-extrabold tracking-tight text-foreground sm:text-3xl">Chats</h1>
        <Button size="default" onClick={() => setOpen(true)} className="h-11 rounded-xl px-5 text-sm font-semibold shadow-md shadow-primary/20">
          <SquarePen className="mr-2 h-5 w-5" />New
        </Button>
      </div>
      <div className="relative px-4 pb-4 sm:px-6">
        <Search className="absolute left-7 top-3.5 h-5 w-5 text-muted-foreground sm:left-9" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search chats"
          aria-label="Search chats"
          className="h-12 rounded-2xl border border-border bg-muted/80 pl-11 text-base shadow-sm placeholder:text-muted-foreground focus-visible:ring-primary sm:pl-12"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="mx-4 my-4 h-14 rounded-xl" />)}
        {!isLoading && list.length === 0 && (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            {term ? 'No chats match your search.' : 'No chats yet — tap New to message someone.'}
          </p>
        )}
        {list.map((c) => {
          const other = c.members.find((m) => !c.isGroup && m.name === c.title);
          return (
            <Link key={c.id} to={`/c/${c.id}`}
              className={cn('flex items-center gap-3 px-4 py-4 transition-colors hover:bg-muted/60 sm:px-6', activeId === c.id && 'bg-accent')}>
              <PersonAvatar name={c.title} image={other?.image} online={other?.online} group={c.isGroup} className="h-[46px] w-[46px]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-base font-semibold text-foreground">{c.title}</span>
                  <span className={cn('shrink-0 text-xs sm:text-sm', c.unread ? 'font-semibold text-primary' : 'text-muted-foreground')}>{chatTime(c.lastMessageAt)}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1 truncate text-sm text-muted-foreground sm:text-base">
                    {c.preview.includes('View once') && <Eye className="h-4 w-4 shrink-0" />}
                    <span className="truncate">{c.preview}</span>
                  </span>
                  {c.unread > 0 && <span className="shrink-0 rounded-full bg-primary px-2 text-xs font-semibold leading-5 text-primary-foreground">{c.unread}</span>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <NewChatDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
