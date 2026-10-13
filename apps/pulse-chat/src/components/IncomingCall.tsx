import { motion } from 'framer-motion';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { HeartbeatOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import PersonAvatar from './PersonAvatar';

type Props = {
  incoming: NonNullable<HeartbeatOutputType['incoming']>;
  onAccept: () => void;
  onDecline: () => void;
};

export default function IncomingCall({ incoming, onAccept, onDecline }: Props) {
  const label = incoming.callType === 'video' ? 'Video call' : 'Voice call';
  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed inset-x-3 top-3 z-50 mx-auto max-w-md rounded-2xl bg-secondary p-4 text-secondary-foreground shadow-2xl"
    >
      <div className="flex items-center gap-3">
        <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
          <PersonAvatar name={incoming.callerName} image={incoming.callerImage} />
        </motion.div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{incoming.callerName}</p>
          <p className="truncate text-sm opacity-70">
            {label}{incoming.isGroup ? ` · ${incoming.title || 'Group'}` : ''}
          </p>
        </div>
        <Button size="icon" variant="destructive" className="rounded-full" onClick={onDecline} aria-label="Decline">
          <PhoneOff className="h-5 w-5" />
        </Button>
        <Button size="icon" className="rounded-full bg-emerald-500 text-white hover:bg-emerald-600" onClick={onAccept} aria-label="Accept">
          {incoming.callType === 'video' ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
        </Button>
      </div>
    </motion.div>
  );
}
