import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMessages } from 'zitejs/api';
import { useAuth } from 'zitejs/auth';
import { ArrowLeft, Phone, Video } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Skeleton } from '@project/components/ui/skeleton';
import PersonAvatar from './PersonAvatar';
import MessageBubble from './MessageBubble';
import Composer from './Composer';
import { useCalls } from '../lib/calls';

export default function Thread({ conversationId }: { conversationId: string }) {
  const { user } = useAuth();
  const me = user?.id ?? '';
  const { call, inCall } = useCalls();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => getMessages({ conversationId }),
    refetchInterval: 3000,
  });
  const bottom = useRef<HTMLDivElement>(null);
  const count = data?.messages.length ?? 0;
  useEffect(() => bottom.current?.scrollIntoView({ block: 'end' }), [count]);

  if (error) return <div className="flex h-full w-full items-center justify-center text-muted-foreground">This chat isn't available.</div>;
  const others = data?.members.filter((m) => m.id !== me) ?? [];
  const subtitle = data?.isGroup ? `${data.members.length} members` : others[0]?.online ? 'Online' : others[0]?.status || '';
  const names = new Map(data?.members.map((m) => [m.id, m]) ?? []);

  return (
    <div className="flex h-full w-full flex-col">
      <header className="flex items-center gap-3 border-b bg-card px-3 py-2.5 md:px-5">
        <Button asChild variant="ghost" size="icon" className="md:hidden"><Link to="/"><ArrowLeft className="h-5 w-5" /></Link></Button>
        {isLoading ? <Skeleton className="h-10 w-40" /> : (
          <>
            <PersonAvatar name={data?.title ?? ''} image={data?.isGroup ? null : others[0]?.image} online={!data?.isGroup && others[0]?.online} group={data?.isGroup} className="h-10 w-10" />
            <div className="min-w-0 flex-1">
              {data?.isGroup || !others[0] ? <p className="truncate font-semibold">{data?.title}</p>
                : <Link to={`/u/${others[0].id}`} className="block truncate font-semibold hover:underline">{data?.title}</Link>}
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </>
        )}
        <Button variant="ghost" size="icon" disabled={inCall || isLoading} onClick={() => call(conversationId, 'voice')} aria-label="Voice call"><Phone className="h-5 w-5" /></Button>
        <Button variant="ghost" size="icon" disabled={inCall || isLoading} onClick={() => call(conversationId, 'video')} aria-label="Video call"><Video className="h-5 w-5" /></Button>
      </header>
      <div className="flex-1 overflow-y-auto bg-muted/60 px-3 py-4 md:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-1.5">
          {isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className={`h-10 w-48 ${i % 2 ? 'self-end' : ''}`} />)}
          {!isLoading && count === 0 && <p className="py-16 text-center text-sm text-muted-foreground">Say hi 👋</p>}
          {data?.messages.map((m, i) => (
            <MessageBubble
              key={m.id}
              message={m}
              mine={m.senderId === me}
              senderName={data.isGroup && m.senderId !== me && data.messages[i - 1]?.senderId !== m.senderId ? names.get(m.senderId)?.name : undefined}
              showSeen={m.senderId === me && i === count - 1}
              onChanged={() => refetch()}
            />
          ))}
          <div ref={bottom} />
        </div>
      </div>
      <Composer conversationId={conversationId} onSent={() => refetch()} />
    </div>
  );
}
