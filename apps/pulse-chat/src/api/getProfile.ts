import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { createTableClient } from 'zitejs/runtime';

type Safety = { id: string; userId?: string; blockedUserIds?: string; profileVisibility?: string; accountStatus?: string };
type SafetyInput = { userId: string | null; blockedUserIds: string | null; profileVisibility: string | null; quietNotifications: boolean | null; preferredLanguage: string | null };
const safety = createTableClient<Safety, SafetyInput>('UchatUserSafety');
type Follow = { id: string; followerId?: string; followedUserId?: string; status?: string };
type FollowInput = { relationship: string | null; followerId: string | null; followedUserId: string | null; status: string | null };
const follows = createTableClient<Follow, FollowInput>('UchatFollows');
import { peopleByIds, personSchema } from '../lib/server';
import { readResume, resumeSchema } from '../lib/resume';

export default createEndpoint({
  description: "Shows a UChat user's public profile and profile details",
  authenticated: true,
  inputSchema: z.object({ userId: z.string() }),
  outputSchema: z.object({ person: personSchema, resume: resumeSchema, postCount: z.number() }),
  execute: async ({ input, context }) => {
    const targetSafety = await safety.findOne({ filters: { userId: input.userId } });
    if (String(targetSafety?.accountStatus ?? '').toLowerCase() === 'suspended' && context.user.id !== input.userId) {
      throw new Error('This account is currently unavailable.');
    }
    if (String(targetSafety?.profileVisibility ?? '').toLowerCase() === 'private' && context.user.id !== input.userId) {
      const accepted = await follows.findOne({ filters: { followerId: context.user.id, followedUserId: input.userId, status: 'Active' } });
      if (!accepted) throw new Error('This user has a private profile. Follow them and wait for approval to view it.');
    }
    const mySafety = await safety.findOne({ filters: { userId: context.user.id } });
    const blocked = (mySafety?.blockedUserIds ?? '').split('\n').map((id) => id.trim()).filter(Boolean);
    const theirSafety = await safety.findOne({ filters: { userId: input.userId } });
    const theyBlockedMe = (theirSafety?.blockedUserIds ?? '').split('\n').map((id) => id.trim()).filter(Boolean).includes(context.user.id);
    if (blocked.includes(input.userId)) throw new Error('You blocked this account. Unblock it to view the profile.');
    if (theyBlockedMe) throw new Error('This profile is unavailable.');
    const p = await zite.chatProfiles.findOne({ filters: { user: input.userId } });
    if (!p) throw new Error('Profile not found');
    const [person] = await peopleByIds([input.userId]);
    const { rows } = await zite.sql({
      query: `SELECT COUNT(*) AS n FROM "FeedPosts" WHERE "author"->>0 = $1`,
      params: [input.userId],
    });
    return { person, resume: readResume(p), postCount: Number(rows[0]?.n ?? 0) };
  },
});
