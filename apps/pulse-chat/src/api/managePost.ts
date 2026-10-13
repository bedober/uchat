import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { arr, requireActiveUser } from '../lib/server';

export default createEndpoint({
  description: 'Creates, edits or deletes a feed post by the signed-in user',
  authenticated: true,
  inputSchema: z.object({
    action: z.enum(['create', 'update', 'delete']),
    postId: z.string().optional(),
    body: z.string().optional(),
    media: z.array(z.object({ url: z.string(), filename: z.string() })).optional(),
  }),
  outputSchema: z.object({ id: z.string() }),
  execute: async ({ input, context }) => {
    await requireActiveUser(context.user.id);
    const body = (input.body ?? '').trim();
    if (input.action === 'create') {
      if (!body && !input.media?.length) throw new Error('Write something or add a photo');
      const post = await zite.feedPosts.create({
        record: { body: body || null, author: context.user.id, media: input.media ?? [], likedBy: [] },
      });
      return { id: post.id };
    }
    const post = input.postId ? await zite.feedPosts.findOne({ id: input.postId }) : undefined;
    if (!post || arr(post.author)[0] !== context.user.id) throw new Error('Post not found');
    if (input.action === 'delete') {
      await zite.feedPosts.delete({ id: post.id });
    } else {
      if (!body && !post.media?.length) throw new Error('Post cannot be empty');
      await zite.feedPosts.update({ id: post.id, record: { body: body || null } });
    }
    return { id: post.id };
  },
});
