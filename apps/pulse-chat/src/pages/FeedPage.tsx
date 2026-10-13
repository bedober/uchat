import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getSafety, listFeed, getFollowData } from 'zitejs/api';
import { ArrowDownUp, Leaf, Loader2 } from 'lucide-react';
import { Skeleton } from '@project/components/ui/skeleton';
import { Button } from '@project/components/ui/button';
import PostComposer from '../components/PostComposer';
import PostCard from '../components/PostCard';

export default function FeedPage() {
  const [lowData, setLowData] = useState(() => localStorage.getItem('uchat-low-data') === 'true');
  const [order, setOrder] = useState<'newest' | 'popular'>(() => localStorage.getItem('uchat-feed-order') === 'popular' ? 'popular' : 'newest');
  const [feedMode, setFeedMode] = useState<'all' | 'following'>(() => localStorage.getItem('uchat-feed-mode') === 'following' ? 'following' : 'all');

  useEffect(() => {
    const sync = () => {
      setLowData(localStorage.getItem('uchat-low-data') === 'true');
      setOrder(localStorage.getItem('uchat-feed-order') === 'popular' ? 'popular' : 'newest');
      setFeedMode(localStorage.getItem('uchat-feed-mode') === 'following' ? 'following' : 'all');
    };
    window.addEventListener('uchat-preferences-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('uchat-preferences-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const safety = useQuery({ queryKey: ['safety'], queryFn: () => getSafety({}) });
  const followData = useQuery({ queryKey: ['follow-data'], queryFn: () => getFollowData({}) });
  const q = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => listFeed({ offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
  });
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = q;

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const posts = useMemo(() => {
    const all = q.data?.pages.flatMap((page) => page.posts) ?? [];
    const visible = all.filter((post) => !safety.data?.blockedUserIds.includes(post.author.id));
    const scoped = feedMode === 'following' ? visible.filter((post) => followData.data?.followingIds.includes(post.author.id)) : visible;
    return order === 'popular' ? [...scoped].sort((a, b) => b.likeCount - a.likeCount) : scoped;
  }, [q.data, order, safety.data, feedMode, followData.data]);

  const toggleOrder = () => {
    const next = order === 'newest' ? 'popular' : 'newest';
    setOrder(next);
    localStorage.setItem('uchat-feed-order', next);
    window.dispatchEvent(new CustomEvent('uchat-preferences-changed'));
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-xl space-y-4 p-4 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div><h1 className="text-2xl font-extrabold">Feed</h1><div className="mt-2 flex gap-2"><Button size="sm" variant={feedMode === 'all' ? 'default' : 'outline'} onClick={() => { setFeedMode('all'); localStorage.setItem('uchat-feed-mode', 'all'); }}>Everyone</Button><Button size="sm" variant={feedMode === 'following' ? 'default' : 'outline'} onClick={() => { setFeedMode('following'); localStorage.setItem('uchat-feed-mode', 'following'); }}>Following</Button></div></div>
          <Button variant="outline" size="sm" onClick={toggleOrder}>
            <ArrowDownUp className="mr-1.5 h-4 w-4" />
            {order === 'newest' ? 'Newest first' : 'Most liked'}
          </Button>
        </div>
        {lowData && (
          <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
            <Leaf className="h-4 w-4 text-primary" />
            Low-data mode is on — tap a post to load its media.
          </div>
        )}
        <PostComposer onPosted={() => q.refetch()} />
        {q.isLoading && [0, 1].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        {!q.isLoading && posts.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">{feedMode === 'following' ? 'No posts from followed accounts yet. Follow people to build this feed.' : 'No posts yet — share the first one.'}</p>
        )}
        {posts.map((post) => <PostCard key={post.id} post={post} lowData={lowData} onChanged={() => q.refetch()} />)}
        <div ref={sentinel} className="flex justify-center py-4">
          {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>
      </div>
    </div>
  );
}
