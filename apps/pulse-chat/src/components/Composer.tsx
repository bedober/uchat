import { useRef, useState } from 'react';
import { useUpload } from 'zitejs/upload';
import { sendMessage } from 'zitejs/api';
import { toast } from 'sonner';
import { ImagePlus, Loader2, SendHorizontal, X } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Textarea } from '@project/components/ui/textarea';
import { cn } from '@project/components/lib/utils';
import { errMsg, isVideoFile } from '../lib/format';

export default function Composer({ conversationId, onSent }: { conversationId: string; onSent: () => void }) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [viewOnce, setViewOnce] = useState(false);
  const [sending, setSending] = useState(false);
  const { upload } = useUpload();
  const input = useRef<HTMLInputElement>(null);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image') && !isVideoFile(f)) return toast.error('Only photos and videos');
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };
  const clear = () => {
    setFile(null);
    setPreview(null);
    setViewOnce(false);
    if (input.current) input.current.value = '';
  };

  const send = async () => {
    if (sending || (!text.trim() && !file)) return;
    setSending(true);
    try {
      const mediaUrl = file ? (await upload(file)).url : null;
      await sendMessage({
        conversationId,
        text,
        kind: file ? (isVideoFile(file) ? 'video' : 'image') : 'text',
        mediaUrl,
        viewOnce: !!file && viewOnce,
      });
      setText('');
      clear();
      onSent();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t bg-card px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] md:px-6">
      {preview && file && (
        <div className="mb-2 flex items-end gap-3">
          <div className="relative">
            {isVideoFile(file)
              ? <video src={preview} className="h-24 rounded-lg" muted />
              : <img src={preview} alt="" className="h-24 rounded-lg object-cover" />}
            <button onClick={clear} className="absolute -right-2 -top-2 rounded-full bg-secondary p-1 text-secondary-foreground" aria-label="Remove"><X className="h-3 w-3" /></button>
          </div>
          <button onClick={() => setViewOnce((v) => !v)}
            className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold', viewOnce ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground')}>
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px]">1</span>
            View once
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <Button variant="ghost" size="icon" onClick={() => input.current?.click()} aria-label="Attach photo or video"><ImagePlus className="h-5 w-5" /></Button>
        <input ref={input} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Message"
          rows={1}
          className="max-h-32 min-h-[40px] flex-1 resize-none rounded-2xl bg-muted"
        />
        <Button size="icon" className="rounded-full" onClick={send} disabled={sending || (!text.trim() && !file)} aria-label="Send">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
