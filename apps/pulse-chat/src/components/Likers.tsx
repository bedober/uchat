import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { postLikers, PostLikersOutputType } from 'zitejs/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import PersonAvatar from './PersonAvatar';
import { errMsg } from '../lib/format';

export default function Likers({ postId, count }: { postId: string; count: number }) {
  const [people, setPeople] = useState<PostLikersOutputType['people'] | null>(null);
  useEffect(() => {
    postLikers({ postId }).then((r) => setPeople(r.people)).catch((e) => toast.error(errMsg(e)));
  }, [postId, count]);
  if (!people) return <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />;
  if (!people.length) return <p className="text-sm text-muted-foreground">No likes yet.</p>;
  return (
    <div className="space-y-2">
      {people.map((p) => (
        <Link key={p.id} to={`/u/${p.id}`} className="flex items-center gap-2 text-sm hover:underline">
          <PersonAvatar name={p.name} image={p.image} className="h-7 w-7 text-xs" />{p.name}
        </Link>
      ))}
    </div>
  );
}
