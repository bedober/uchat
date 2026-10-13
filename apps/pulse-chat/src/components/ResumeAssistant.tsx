import { useEffect, useRef, useState } from 'react';
import { resumeAssistant, GetMeOutputType } from 'zitejs/api';
import { toast } from 'sonner';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { cn } from '@project/components/lib/utils';
import { errMsg } from '../lib/format';
import ResumeView from './ResumeView';

type Profile = NonNullable<GetMeOutputType['profile']>;
type Resume = Profile['resume'];
type Msg = { role: 'user' | 'assistant'; content: string };

const GREETING: Msg = { role: 'assistant', content: "Hi! I'll help you build your resume. To start — what do you do, or what role are you aiming for?" };

export default function ResumeAssistant({ profile, onUse }: { profile: Profile; onUse: (r: Resume) => void }) {
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [draft, setDraft] = useState<Resume>(profile.resume);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

  const send = async () => {
    const content = text.trim();
    if (!content || busy) return;
    const next = [...messages, { role: 'user' as const, content }];
    setMessages(next); setText(''); setBusy(true);
    try {
      const res = await resumeAssistant({ messages: next, draft });
      setMessages([...next, { role: 'assistant', content: res.reply }]);
      setDraft(res.resume);
    } catch (e) {
      toast.error(errMsg(e));
      setMessages(messages); setText(content);
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex h-[26rem] flex-col rounded-2xl border bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-3 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" />Resume assistant</div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div key={i} className={cn('max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm', m.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted')}>{m.content}</div>
          ))}
          {busy && <div className="flex w-fit items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Thinking…</div>}
          <div ref={end} />
        </div>
        <form className="flex gap-2 border-t p-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your answer…" disabled={busy} />
          <Button type="submit" size="icon" disabled={busy || !text.trim()}><Send className="h-4 w-4" /></Button>
        </form>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Draft preview</h3>
          <Button size="sm" onClick={() => onUse(draft)} disabled={messages.length < 3}>Review & save</Button>
        </div>
        <ResumeView name={profile.displayName} image={profile.avatarUrl} status={profile.status} resume={draft} />
      </div>
    </div>
  );
}
