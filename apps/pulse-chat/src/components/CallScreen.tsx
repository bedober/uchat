import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import { toast } from 'sonner';
import { updateCall } from 'zitejs/api';
import { cn } from '@project/components/lib/utils';
import { useCallMesh } from '../lib/useCallMesh';
import { duration } from '../lib/format';
import PersonAvatar from './PersonAvatar';

type Props = { callId: string; me: string; startWithVideo: boolean; onClose: () => void };

function Tile({ stream, muted, label, image, mirrored }: { stream: MediaStream | null; muted?: boolean; label: string; image?: string | null; mirrored?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
    const check = () => setHasVideo(!!stream?.getVideoTracks().some((t) => t.enabled && t.readyState === 'live' && !t.muted));
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [stream]);
  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-white/5">
      <video ref={ref} autoPlay playsInline muted={muted} className={cn('h-full w-full object-cover', !hasVideo && 'hidden', mirrored && '-scale-x-100')} />
      {!hasVideo && <PersonAvatar name={label} image={image} className="h-20 w-20 text-2xl" />}
      <span className="absolute bottom-2 left-3 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">{label}</span>
    </div>
  );
}

export default function CallScreen({ callId, me, startWithVideo, onClose }: Props) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(startWithVideo);
  const [now, setNow] = useState(Date.now());
  const { state, local, remotes, connectedAt } = useCallMesh(callId, me, (status) => {
    toast(status === 'Declined' ? 'Call declined' : status === 'Missed' ? 'No answer' : 'Call ended');
    onClose();
  });

  useEffect(() => {
    local?.getAudioTracks().forEach((t) => (t.enabled = micOn));
    local?.getVideoTracks().forEach((t) => (t.enabled = camOn));
  }, [local, micOn, camOn]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const hangUp = async () => {
    await updateCall({ callId, action: 'leave' }).catch(() => {});
    onClose();
  };

  const others = state?.joined.filter((p) => p.id !== me) ?? [];
  const status = connectedAt ? duration(Math.floor((now - connectedAt) / 1000)) : others.length ? 'Connecting…' : 'Ringing…';

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-secondary text-secondary-foreground">
      <div className="px-6 pt-8 text-center">
        <p className="text-xl font-bold">{state?.title ?? 'Calling…'}</p>
        <p className="font-mono text-sm opacity-70">{status}</p>
      </div>
      <div className={cn('mx-auto grid w-full max-w-5xl flex-1 content-center gap-4 p-4', others.length > 0 ? 'sm:grid-cols-2' : '')}>
        {others.map((p) => <Tile key={p.id} stream={remotes[p.id] ?? null} label={p.name} image={p.image} />)}
        <Tile stream={local} muted mirrored label="You" />
      </div>
      <div className="flex justify-center gap-4 pb-10">
        <button onClick={() => setMicOn((m) => !m)} className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10" aria-label="Toggle microphone">
          {micOn ? <Mic /> : <MicOff />}
        </button>
        <button onClick={() => setCamOn((c) => !c)} className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10" aria-label="Toggle camera">
          {camOn ? <Video /> : <VideoOff />}
        </button>
        <button onClick={hangUp} className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-destructive-foreground" aria-label="Hang up">
          <PhoneOff />
        </button>
      </div>
    </div>
  );
}
