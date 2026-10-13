import { useRef, useState } from 'react';
import { useUpload } from 'zitejs/upload';
import { managePost } from 'zitejs/api';
import { toast } from 'sonner';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Textarea } from '@project/components/ui/textarea';
import { errMsg, isVideoFile } from '../lib/format';

export default function PostComposer({ onPosted }: { onPosted: () => void }) {
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const { upload } = useUpload();
  const input = useRef<HTMLInputElement>(null);
  const tooLong = body.length > 2000;

  const post = async () => {
    setBusy(true);
    try {
      const media = await Promise.all(files.map(async (f) => ({ url: (await upload(f)).url, filename: f.name })));
      await managePost({ action: 'create', body, media });
      setBody('');
      setFiles([]);
      onPosted();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What's new?" className="min-h-[70px] resize-none border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0" />
      {tooLong && <p className="text-xs text-destructive">Keep it under 2,000 characters</p>}
      {files.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={i} className="relative">
              {isVideoFile(f)
                ? <video src={URL.createObjectURL(f)} className="h-20 w-20 rounded-lg object-cover" muted />
                : <img src={URL.createObjectURL(f)} alt="" className="h-20 w-20 rounded-lg object-cover" />}
              <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute -right-1.5 -top-1.5 rounded-full bg-secondary p-1 text-secondary-foreground" aria-label="Remove"><X className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <Button variant="ghost" size="sm" onClick={() => input.current?.click()}><ImagePlus className="mr-1.5 h-4 w-4" />Photo / video</Button>
        <input ref={input} type="file" multiple accept="image/*,video/*" className="hidden"
          onChange={(e) => { setFiles([...files, ...Array.from(e.target.files ?? [])].slice(0, 6)); e.target.value = ''; }} />
        <Button size="sm" onClick={post} disabled={busy || tooLong || (!body.trim() && files.length === 0)}>
          {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Post
        </Button>
      </div>
    </div>
  );
}
