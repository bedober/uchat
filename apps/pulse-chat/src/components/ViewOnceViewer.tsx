import { useEffect, useRef, useState } from 'react';
import { openViewOnce } from 'zitejs/api';
import { Loader2, X } from 'lucide-react';
import { errMsg } from '../lib/format';

export default function ViewOnceViewer({ messageId, onClose }: { messageId: string; onClose: () => void }) {
  const [state, setState] = useState<{ url: string | null; kind: string; error?: string } | null>(null);

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    openViewOnce({ messageId })
      .then((r) => setState({ url: r.mediaUrl, kind: r.kind }))
      .catch((e) => setState({ url: null, kind: '', error: errMsg(e) }));
  }, [messageId]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" onContextMenu={(e) => e.preventDefault()}>
      <div className="flex items-center justify-between p-4">
        <span className="text-sm opacity-80">View once</span>
        <button onClick={onClose} aria-label="Close"><X className="h-6 w-6" /></button>
      </div>
      <div className="flex flex-1 items-center justify-center p-4">
        {!state && <Loader2 className="h-6 w-6 animate-spin" />}
        {state && !state.url && <p className="opacity-80">{state.error ?? 'This has already been opened.'}</p>}
        {state?.url && (state.kind === 'Video'
          ? <video src={state.url} autoPlay controls playsInline controlsList="nodownload" className="max-h-full max-w-full" />
          : <img src={state.url} alt="" draggable={false} className="max-h-full max-w-full select-none object-contain" />)}
      </div>
      {state?.url && <p className="pb-8 text-center text-sm opacity-70">This disappears when you close it</p>}
    </div>
  );
}
