import { useState } from 'react';
import { format } from 'date-fns';
import { GetMessagesOutputType, deleteMessage, translateText } from 'zitejs/api';
import { toast } from 'sonner';
import { Eye, EyeOff, Languages, Loader2, Trash2, Image as ImageIcon, Video } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@project/components/ui/alert-dialog';
import { cn } from '@project/components/lib/utils';
import ViewOnceViewer from './ViewOnceViewer';
import { errMsg } from '../lib/format';

type Msg = GetMessagesOutputType['messages'][0];
type Props = { message: Msg; mine: boolean; senderName?: string; showSeen: boolean; onChanged: () => void };

function ViewOnceChip({ m, mine, onOpen }: { m: Msg; mine: boolean; onOpen: () => void }) {
  const Icon = m.kind === 'video' ? Video : ImageIcon;
  if (m.openedAt) {
    return <span className="flex items-center gap-2 text-sm opacity-70"><EyeOff className="h-4 w-4" />Opened · {format(new Date(m.openedAt), 'HH:mm')}</span>;
  }
  if (mine) return <span className="flex items-center gap-2 text-sm"><Icon className="h-4 w-4" />View once {m.kind === 'video' ? 'video' : 'photo'}</span>;
  return (
    <button onClick={onOpen} className="flex items-center gap-2 text-sm font-semibold">
      <Eye className="h-4 w-4" />{m.kind === 'video' ? 'Video' : 'Photo'} · tap to view once
    </button>
  );
}

export default function MessageBubble({ message: m, mine, senderName, showSeen, onChanged }: Props) {
  const [viewing, setViewing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const translate = async () => {
    if (translated) { setTranslated(null); return; }
    if (!m.text?.trim()) return;
    setTranslating(true);
    try {
      let target = 'en';
      try { target = JSON.parse(localStorage.getItem('uchat-preferences') || '{}').language || 'en'; } catch {}
      const result = await translateText({ text: m.text, target: target as 'en' | 'lg' | 'sw' | 'ach' | 'fr' });
      setTranslated(result.translatedText);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setTranslating(false);
    }
  };
  const remove = async () => {
    try {
      await deleteMessage({ messageId: m.id });
      onChanged();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div className={cn('group flex max-w-[80%] flex-col', mine ? 'items-end self-end' : 'items-start self-start')}>
      {senderName && <span className="mb-0.5 ml-2 text-xs font-semibold text-primary">{senderName}</span>}
      <div className="flex items-center gap-1">
        {mine && (
          <button onClick={() => setConfirm(true)} className="p-1 text-muted-foreground opacity-0 transition group-hover:opacity-100" aria-label="Delete message">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        <div className={cn('overflow-hidden rounded-2xl shadow-sm', mine ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-card text-card-foreground')}>
          {m.viewOnce ? (
            <div className="px-4 py-2.5"><ViewOnceChip m={m} mine={mine} onOpen={() => setViewing(true)} /></div>
          ) : m.mediaUrl && m.kind === 'image' ? (
            <a href={m.mediaUrl} target="_blank" rel="noreferrer"><img src={m.mediaUrl} alt="" className="max-h-80 w-full max-w-xs object-cover" /></a>
          ) : m.mediaUrl && m.kind === 'video' ? (
            <video src={m.mediaUrl} controls playsInline className="max-h-80 w-full max-w-xs bg-black" />
          ) : null}
          {m.text && (
            <div className="px-4 py-2">
              <p className="whitespace-pre-wrap break-words text-[15px]">{m.text}</p>
              {translated && <p className="mt-2 whitespace-pre-wrap border-l-2 border-current/40 pl-2 text-sm opacity-80">{translated}</p>}
              <button type="button" onClick={translate} disabled={translating} className="mt-1 inline-flex items-center gap-1 text-xs opacity-75 hover:opacity-100">
                {translating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
                {translating ? 'Translating…' : translated ? 'Show original' : 'Translate'}
              </button>
            </div>
          )}
        </div>
      </div>
      <span className="mx-2 mt-0.5 text-[11px] text-muted-foreground">
        {format(new Date(m.sentAt), 'HH:mm')}{showSeen ? (m.seenByOthers ? ' · Seen' : ' · Sent') : ''}
      </span>
      {viewing && <ViewOnceViewer messageId={m.id} onClose={() => { setViewing(false); onChanged(); }} />}
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>It will be removed for everyone in this chat.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
