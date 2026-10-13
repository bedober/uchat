import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProfile, createConversation, getSafety, manageBlock, submitReport, getFollowData, manageFollow } from 'zitejs/api';
import { useAuth } from 'zitejs/auth';
import { toast } from 'sonner';
import { ArrowLeft, Flag, MessageCircle, Phone, ShieldBan } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Skeleton } from '@project/components/ui/skeleton';
import ResumeView from '../components/ResumeView';
import { useCalls } from '../lib/calls';
import { errMsg } from '../lib/format';

export default function PersonPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const { call, inCall } = useCalls();
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const safety = useQuery({ queryKey: ['safety'], queryFn: () => getSafety({}) });
  const follow = useQuery({ queryKey: ['follow-data', id], queryFn: () => getFollowData({ targetUserId: id }), enabled: Boolean(id && id !== user?.id) });
  const isBlocked = safety.data?.blockedUserIds.includes(id) ?? false;
  const { data, isLoading, error } = useQuery({ queryKey: ['profile', id], queryFn: () => getProfile({ userId: id }) });

  const toggleFollow = async () => {
    try {
      const action = follow.data?.isFollowing || follow.data?.requestPending ? 'unfollow' : 'follow';
      const result = await manageFollow({ action, targetUserId: id });
      await qc.invalidateQueries({ queryKey: ['follow-data'] });
      await qc.invalidateQueries({ queryKey: ['profile', id] });
      toast.success(result.status === 'Pending' ? 'Follow request sent' : result.status === 'Active' ? 'Following account' : 'Unfollowed account');
    } catch (e) { toast.error(errMsg(e)); }
  };

  const toggleBlock = async () => {
    try {
      await manageBlock({ targetUserId: id, blocked: !isBlocked });
      await qc.invalidateQueries({ queryKey: ['safety'] });
      toast.success(isBlocked ? 'Account unblocked' : 'Account blocked');
    } catch (e) { toast.error(errMsg(e)); }
  };

  const report = async () => {
    const reason = window.prompt('Report reason: spam, scam, harassment, impersonation, unsafe, or other', 'other');
    if (!reason) return;
    const normalized = reason.trim().toLowerCase();
    if (!['spam', 'scam', 'harassment', 'impersonation', 'unsafe', 'other'].includes(normalized)) {
      toast.error('Choose spam, scam, harassment, impersonation, unsafe, or other');
      return;
    }
    try {
      await submitReport({ targetId: id, targetType: 'user', reason: normalized as 'spam' | 'scam' | 'harassment' | 'impersonation' | 'unsafe' | 'other' });
      toast.success('Report submitted for review');
    } catch (e) { toast.error(errMsg(e)); }
  };

  const openChat = async (then?: (convId: string) => void) => {
    setBusy(true);
    try {
      const { id: convId } = await createConversation({ memberIds: [id] });
      then ? then(convId) : nav(`/c/${convId}`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl p-4 md:p-6">
        <Button variant="ghost" size="sm" className="mb-3" onClick={() => nav(-1)}><ArrowLeft className="mr-1 h-4 w-4" />Back</Button>
        {isLoading && <Skeleton className="h-96 w-full rounded-2xl" />}
        {error && <div className="py-12 text-center"><p className="text-muted-foreground">This profile is private or unavailable.</p>{id !== user?.id && <Button className="mt-4" variant="outline" disabled={follow.isLoading || isBlocked} onClick={toggleFollow}>{follow.data?.requestPending ? 'Cancel follow request' : follow.data?.isFollowing ? 'Following · Unfollow' : 'Request to follow'}</Button>}</div>}
        {data && (
          <ResumeView
            name={data.person.name}
            image={data.person.image}
            status={data.person.status}
            resume={data.resume}
            postCount={data.postCount}
            actions={id !== user?.id && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={follow.isLoading || isBlocked} onClick={toggleFollow}>{follow.data?.requestPending ? 'Request pending · Cancel' : follow.data?.isFollowing ? 'Following · Unfollow' : 'Follow'}</Button>
                {!isBlocked && <Button size="sm" disabled={busy} onClick={() => openChat()}><MessageCircle className="mr-1.5 h-4 w-4" />Message</Button>}
                {!isBlocked && <Button size="sm" variant="outline" disabled={busy || inCall} onClick={() => openChat((c) => call(c, 'voice'))} aria-label="Call"><Phone className="h-4 w-4" /></Button>}
                <Button size="sm" variant="outline" onClick={toggleBlock}><ShieldBan className="mr-1.5 h-4 w-4" />{isBlocked ? 'Unblock' : 'Block'}</Button>
                <Button size="sm" variant="ghost" onClick={report}><Flag className="mr-1.5 h-4 w-4" />Report</Button>
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
}
