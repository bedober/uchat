import { useQuery } from '@tanstack/react-query';
import { listCalls } from 'zitejs/api';
import { format } from 'date-fns';
import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Video } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Skeleton } from '@project/components/ui/skeleton';
import { cn } from '@project/components/lib/utils';
import PersonAvatar from '../components/PersonAvatar';
import { useCalls } from '../lib/calls';
import { duration } from '../lib/format';

export default function CallsPage() {
  const { call, inCall } = useCalls();
  const { data, isLoading } = useQuery({ queryKey: ['calls'], queryFn: () => listCalls({}), refetchInterval: 10000 });
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl p-4 md:p-6">
        <h1 className="mb-4 text-2xl font-extrabold">Calls</h1>
        {isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="mb-3 h-14" />)}
        {!isLoading && !data?.calls.length && (
          <p className="py-16 text-center text-sm text-muted-foreground">No calls yet. Open a chat and tap the phone or camera icon.</p>
        )}
        <div className="divide-y rounded-xl border bg-card">
          {data?.calls.map((c) => {
            const missed = c.status === 'Missed' || c.status === 'Declined';
            const Dir = missed ? PhoneMissed : c.outgoing ? PhoneOutgoing : PhoneIncoming;
            return (
              <div key={c.id} className="flex items-center gap-3 p-3">
                <PersonAvatar name={c.title} image={c.image} className="h-10 w-10" />
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate font-semibold', missed && !c.outgoing && 'text-destructive')}>{c.title}</p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Dir className="h-3.5 w-3.5" />
                    {c.callType === 'video' ? 'Video' : 'Voice'} · {missed ? c.status : c.durationSec != null ? duration(c.durationSec) : c.status}
                    {c.startedAt && ` · ${format(new Date(c.startedAt), 'd MMM, HH:mm')}`}
                  </p>
                </div>
                <Button variant="ghost" size="icon" disabled={inCall} onClick={() => call(c.conversationId, c.callType)} aria-label="Call back">
                  {c.callType === 'video' ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
