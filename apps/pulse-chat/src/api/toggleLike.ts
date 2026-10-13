import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { arr, requireActiveUser, requireCanViewPost } from '../lib/server';

export default createEndpoint({
  description: 'Likes or unlikes a feed post after enforcing post visibility and account status',
  authenticated: true,
  inputSchema: z.object({ postId: z.string().min(1).max(200), like: z.boolean() }),
  outputSchema: z.object({ likeCount: z.number() }),
  execute: async ({ input, context }) => {
    await requireActiveUser(context.user.id);
    const post = await requireCanViewPost(input.postId, context.user.id);
    const others = arr(post.likedBy).filter((id) => id !== context.user.id);
    const likedBy = input.like ? [...others, context.user.id] : others;
    await zite.feedPosts.update({ id: post.id, record: { likedBy } });
    return { likeCount: likedBy.length };
  },
});
