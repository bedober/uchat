import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { createTableClient } from 'zitejs/runtime';

type Follow = { id: string; followerId?: string; followedUserId?: string; status?: string };
type FollowInput = { relationship: string | null; followerId: string | null; followedUserId: string | null; status: string | null };
const follows = createTableClient<Follow, FollowInput>('UchatFollows');
type Safety = { id: string; userId?: string; blockedUserIds?: string; profileVisibility?: string; accountStatus?: string; suspensionReason?: string };
type SafetyInput = { userId: string | null; blockedUserIds: string | null; profileVisibility: string | null; quietNotifications: boolean | null; preferredLanguage: string | null; accountStatus?: string | null; suspensionReason?: string | null };
const safety = createTableClient<Safety, SafetyInput>('UchatUserSafety');

export default createEndpoint({
  description: 'Follow or unfollow a profile and accept/reject private profile requests',
  authenticated: true,
  inputSchema: z.object({ action: z.enum(['follow', 'unfollow', 'approve', 'reject']), targetUserId: z.string().optional(), requestId: z.string().optional() }),
  outputSchema: z.object({ ok: z.boolean(), status: z.string() }),
  execute: async ({ input, context }) => {
    const me = context.user.id;
    if (input.action === 'approve' || input.action === 'reject') {
      if (!input.requestId) throw new Error('Follow request is missing');
      const request = await follows.findOne({ id: input.requestId });
      if (!request || request.followedUserId !== me || request.status !== 'Pending') throw new Error('Follow request not found');
      if (input.action === 'reject') await follows.delete({ id: request.id });
      else await follows.update({ id: request.id, record: { status: 'Active' } });
      return { ok: true, status: input.action === 'approve' ? 'Active' : 'Rejected' };
    }
    const target = input.targetUserId;
    if (!target || target === me) throw new Error('Choose another account');
    const mySafety = await safety.findOne({ filters: { userId: me } });
    const theirSafety = await safety.findOne({ filters: { userId: target } });
    const myBlocked = (mySafety?.blockedUserIds ?? '').split('\n').map((x) => x.trim()).filter(Boolean);
    const theirBlocked = (theirSafety?.blockedUserIds ?? '').split('\n').map((x) => x.trim()).filter(Boolean);
    if (myBlocked.includes(target) || theirBlocked.includes(me)) throw new Error('Following is unavailable because one account has blocked the other');
    const existing = await follows.findOne({ filters: { followerId: me, followedUserId: target } });
    if (input.action === 'unfollow') {
      if (existing) await follows.delete({ id: existing.id });
      return { ok: true, status: 'None' };
    }
    const status = String(theirSafety?.profileVisibility ?? '').toLowerCase() === 'private' ? 'Pending' : 'Active';
    if (existing) await follows.update({ id: existing.id, record: { status } });
    else await follows.create({ record: { relationship: me + ':' + target, followerId: me, followedUserId: target, status } });
    return { ok: true, status };
  },
});
