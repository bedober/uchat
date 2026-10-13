import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listFeed } from 'zitejs/api';
import { Bookmark, Loader2 } from 'lucide-react';
import PostCard from '../components/PostCard';

export default function SavedPostsPage() {
  const [ids, setIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('uchat-saved-posts') || '[]'); } catch { return []; }
  });
  useEffect(() => {
    const sync = () => {
      try { setIds(JSON.parse(localStorage.getItem('uchat-saved-posts') || '[]')); } catch { setIds([]); }
    };
    window.addEventListener('uchat-saved-posts-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('uchat-saved-posts-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const query = useQuery({ queryKey: ['saved-posts-feed'], queryFn: () => listFeed({ offset: 0 }) });
  const posts = query.data?.posts.filter((post) => ids.includes(post.id)) ?? [];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-xl space-y-4 p-4 md:p-6">
        <header><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Your collection</p><h1 className="mt-1 text-2xl font-extrabold">Saved posts</h1><p className="mt-1 text-sm text-muted-foreground">Saved posts are stored on this device.</p></header>
        {query.isLoading && <Loader2 className="mx-auto my-10 h-5 w-5 animate-spin text-muted-foreground" />}
        {!query.isLoading && posts.length === 0 && <div className="rounded-2xl border border-dashed p-8 text-center"><Bookmark className="mx-auto mb-2 h-7 w-7 text-muted-foreground" /><p className="font-semibold">No saved posts found</p><p className="mt-1 text-sm text-muted-foreground">Save a post from the feed. This page searches the latest 20 posts.</p></div>}
        {posts.map((post) => <PostCard key={post.id} post={post} onChanged={() => query.refetch()} />)}
      </div>
    </div>
  );
}
