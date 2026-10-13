import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { heartbeat, startCall, updateCall } from 'zitejs/api';
import { toast } from 'sonner';
import IncomingCall from '../components/IncomingCall';
import CallScreen from '../components/CallScreen';
import { errMsg } from './format';

type Ctx = {
  unread: number;
  inCall: boolean;
  call: (conversationId: string, type: 'voice' | 'video') => Promise<void>;
};

const CallCtx = createContext<Ctx>({ unread: 0, inCall: false, call: async () => {} });
export const useCalls = () => useContext(CallCtx);

export function CallProvider({ me, children }: { me: string; children: ReactNode }) {
  const [active, setActive] = useState<{ callId: string; video: boolean } | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const { data } = useQuery({ queryKey: ['heartbeat'], queryFn: () => heartbeat({}), refetchInterval: 3000 });

  const call = useCallback(async (conversationId: string, type: 'voice' | 'video') => {
    if (active) return;
    try {
      const { callId } = await startCall({ conversationId, callType: type });
      setActive({ callId, video: type === 'video' });
    } catch (e) {
      toast.error(errMsg(e));
    }
  }, [active]);

  const incoming = data?.incoming && !active && !dismissed.includes(data.incoming.callId) ? data.incoming : null;

  const accept = async () => {
    if (!incoming) return;
    try {
      await updateCall({ callId: incoming.callId, action: 'join' });
      setActive({ callId: incoming.callId, video: incoming.callType === 'video' });
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const decline = () => {
    if (!incoming) return;
    setDismissed((d) => [...d, incoming.callId]);
    updateCall({ callId: incoming.callId, action: 'decline' }).catch(() => {});
  };

  return (
    <CallCtx.Provider value={{ unread: data?.unread ?? 0, inCall: !!active, call }}>
      {children}
      {incoming && <IncomingCall incoming={incoming} onAccept={accept} onDecline={decline} />}
      {active && (
        <CallScreen
          key={active.callId}
          callId={active.callId}
          me={me}
          startWithVideo={active.video}
          onClose={() => {
            setDismissed((d) => [...d, active.callId]);
            setActive(null);
          }}
        />
      )}
    </CallCtx.Provider>
  );
}
