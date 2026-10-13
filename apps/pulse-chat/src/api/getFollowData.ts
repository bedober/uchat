import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { createTableClient } from 'zitejs/runtime';

type Follow = { id: string; followerId?: string; followedUserId?: string; status?: string };
type FollowInput = { relationship: string | null; followerId: string | null; followedUserId: string | null; status: string | null };
const follows = createTableClient<Follow, FollowInput>('UchatFollows');

export default createEndpoint({
  description: 'Read follow state and pending follow requests for the signed-in user',
  authenticated: true,
  inputSchema: z.object({ targetUserId: z.string().optional() }),
  outputSchema: z.object({
    isFollowing: z.boolean(),
    requestPending: z.boolean(),
    followers: z.number(),
    following: z.number(),
    incoming: z.array(z.object({ id: z.string(), followerId: z.string() })),
    followingIds: z.array(z.string()),
  }),
  execute: async ({ input, context }) => {
    const me = context.user.id;
    const [outgoing, incoming, followers, following] = await Promise.all([
      input.targetUserId ? follows.findOne({ filters: { followerId: me, followedUserId: input.targetUserId } }) : Promise.resolve(undefined),
      follows.findAll({ filters: { followedUserId: me, status: 'Pending' }, limit: 100 }),
      follows.findAll({ filters: { followedUserId: input.targetUserId ?? me, status: 'Active' }, limit: 2000 }),
      follows.findAll({ filters: { followerId: input.targetUserId ?? me, status: 'Active' }, limit: 2000 }),
    ]);
    return {
      isFollowing: outgoing?.status === 'Active',
      requestPending: outgoing?.status === 'Pending',
      followers: followers.records.length,
      following: following.records.length,
      incoming: incoming.records.map((r) => ({ id: r.id, followerId: r.followerId ?? '' })),
      followingIds: following.records.map((r) => r.followedUserId ?? '').filter(Boolean),
    };
  },
});
