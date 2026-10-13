import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ListFeedOutputType, managePost, submitReport, toggleLike, translateText } from 'zitejs/api';
import { useAuth } from 'zitejs/auth';
import { toast } from 'sonner';
import { Bookmark, Flag, Gift, Heart, Languages, Loader2, MessageCircle, MoreHorizontal, Pencil, Share2, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import Gifts from './Gifts';
import Likers from './Likers';
import { shareLink } from '../lib/share';
import { Button } from '@project/components/ui/button';
import { Textarea } from '@project/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@project/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@project/components/ui/alert-dialog';
import { cn } from '@project/components/lib/utils';
import PersonAvatar from './PersonAvatar';
import Comments from './Comments';
import { ago, errMsg } from '../lib/format';

type Post = ListFeedOutputType['posts'][0];

export default function PostCard({ post, onChanged, lowData = false }: { post: Post; onChanged: () => void; lowData?: boolean }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.likedByMe);
  const [likes, setLikes] = useState(post.likeCount);
  const [panel, setPanel] = useState<string | null>(null);
  const toggle = (p: string) => setPanel((cur) => (cur === p ? null : p));
  const [giftCount, setGiftCount] = useState(post.giftCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [editing, setEditing] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [saved, setSaved] = useState(() => {
    try { return (JSON.parse(localStorage.getItem('uchat-saved-posts') || '[]') as string[]).includes(post.id); } catch { return false; }
  });
  const toggleSaved = () => {
    try {
      const ids = new Set(JSON.parse(localStorage.getItem('uchat-saved-posts') || '[]') as string[]);
      if (ids.has(post.id)) ids.delete(post.id); else ids.add(post.id);
      localStorage.setItem('uchat-saved-posts', JSON.stringify([...ids]));
      setSaved(ids.has(post.id));
      window.dispatchEvent(new CustomEvent('uchat-saved-posts-changed'));
      toast.success(ids.has(post.id) ? 'Post saved' : 'Post removed from saved');
    } catch { toast.error('Could not save this post on this device'); }
  };
  const [translated, setTranslated] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const translate = async () => {
    if (translated) { setTranslated(null); return; }
    if (!post.body.trim()) return;
    setTranslating(true);
    try {
      let target = 'en';
      try { target = JSON.parse(localStorage.getItem('uchat-preferences') || '{}').language || 'en'; } catch {}
      const result = await translateText({ text: post.body, target: target as 'en' | 'lg' | 'sw' | 'ach' | 'fr' });
      setTranslated(result.translatedText);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setTranslating(false);
    }
  };
  const [draft, setDraft] = useState(post.body);
  const [confirm, setConfirm] = useState(false);
  const mine = user?.id === post.author.id;

  const like = async () => {
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    try {
      await toggleLike({ postId: post.id, like: next });
    } catch (e) {
      setLiked(!next);
      setLikes((n) => n + (next ? -1 : 1));
      toast.error(errMsg(e));
    }
  };
  const reportPost = async () => {
    const reason = window.prompt('Report reason: spam, scam, harassment, impersonation, unsafe, or other', 'other');
    if (!reason) return;
    const normalized = reason.trim().toLowerCase();
    if (!['spam', 'scam', 'harassment', 'impersonation', 'unsafe', 'other'].includes(normalized)) {
      toast.error('Choose spam, scam, harassment, impersonation, unsafe, or other');
      return;
    }
    try {
      await submitReport({ targetId: post.id, targetType: 'post', reason: normalized as 'spam' | 'scam' | 'harassment' | 'impersonation' | 'unsafe' | 'other' });
      toast.success('Report submitted for review');
    } catch (error) { toast.error(errMsg(error)); }
  };

  const act = async (action: 'update' | 'delete') => {
    try {
      await managePost({ action, postId: post.id, body: draft });
      setEditing(false);
      onChanged();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center gap-3 p-4 pb-3">
        <PersonAvatar name={post.author.name} image={post.author.image} className="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <Link to={`/u/${post.author.id}`} className="block truncate text-sm font-semibold hover:underline">{post.author.name}</Link>
          <p className="text-xs text-muted-foreground">{ago(post.postedAt)}</p>
        </div>
        {mine && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Post options"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditing(true)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setConfirm(true)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {editing ? (
        <div className="space-y-2 px-4 pb-3">
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setDraft(post.body); }}>Cancel</Button>
            <Button size="sm" onClick={() => act('update')} disabled={draft.length > 2000}>Save</Button>
          </div>
        </div>
      ) : post.body && (
        <div className="px-4 pb-3">
          <p className="whitespace-pre-wrap text-[15px]">{post.body}</p>
          {translated && <p className="mt-2 whitespace-pre-wrap border-l-2 border-primary pl-3 text-sm text-muted-foreground">{translated}</p>}
          <Button variant="ghost" size="sm" className="mt-1 h-7 px-2 text-xs" onClick={translate} disabled={translating}>
            {translating ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Languages className="mr-1 h-3.5 w-3.5" />}
            {translating ? 'Translating…' : translated ? 'Show original' : 'Translate'}
          </Button>
        </div>
      )}
      {post.media.length > 0 && (
        lowData && !mediaLoaded ? (
          <button type="button" onClick={() => setMediaLoaded(true)} className="flex w-full items-center justify-center gap-2 bg-muted px-4 py-8 text-sm font-semibold text-muted-foreground hover:bg-accent">
            <span>Load {post.media.length} media item{post.media.length === 1 ? '' : 's'}</span><span className="text-xs">· uses data</span>
          </button>
        ) : (
          <div className={cn('grid gap-0.5', post.media.length > 1 && 'grid-cols-2')}>
            {post.media.map((m) => m.isVideo
              ? <video key={m.url} src={m.url} controls playsInline preload={lowData ? 'none' : 'metadata'} className="max-h-[480px] w-full bg-black" />
              : <img key={m.url} loading={lowData ? 'lazy' : 'eager'} src={m.url} alt="Post media" className="max-h-[480px] w-full object-cover" />)}
          </div>
        )
      )}
      <div className="flex gap-1 px-2 py-2">
        <Button variant="ghost" size="sm" onClick={like} className={cn(liked && 'text-primary')}>
          <Heart className={cn('mr-1.5 h-4 w-4', liked && 'fill-current')} />{likes}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => toggle('comments')}>
          <MessageCircle className="mr-1.5 h-4 w-4" />{commentCount}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => toggle('gifts')}>
          <Gift className="mr-1.5 h-4 w-4" />{giftCount}
        </Button>
        <Button variant="ghost" size="sm" aria-label={saved ? 'Remove saved post' : 'Save post'} onClick={toggleSaved} className={cn(saved && 'text-primary')}><Bookmark className={cn('h-4 w-4', saved && 'fill-current')} /></Button>
        <Button variant="ghost" size="sm" aria-label="Report post" onClick={reportPost}><Flag className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" className="ml-auto" aria-label="Share"
          onClick={() => shareLink(`${post.author.name} on UChat`, post.body ? post.body.slice(0, 140) : `See ${post.author.name}'s post on UChat`, '/feed')}>
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
      {panel && (
        <Tabs value={panel} onValueChange={setPanel} className="border-t bg-muted/50 px-4 py-3">
          <TabsList className="mb-3">
            <TabsTrigger value="likes">Likes {likes}</TabsTrigger>
            <TabsTrigger value="comments">Comments {commentCount}</TabsTrigger>
            <TabsTrigger value="gifts">Gifts {giftCount}</TabsTrigger>
          </TabsList>
          <TabsContent value="likes"><Likers postId={post.id} count={likes} /></TabsContent>
          <TabsContent value="comments" className="-mx-4 -mb-3"><Comments postId={post.id} onCount={setCommentCount} /></TabsContent>
          <TabsContent value="gifts"><Gifts postId={post.id} canSend={!mine} onCount={setGiftCount} /></TabsContent>
        </Tabs>
      )}
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => act('delete')}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
