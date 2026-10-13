import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { peopleByIds, personSchema, requireCanViewPost } from '../lib/server';

export default createEndpoint({
  description: 'Lists the people who liked a post',
  authenticated: true,
  inputSchema: z.object({ postId: z.string().min(1).max(200) }),
  outputSchema: z.object({ people: z.array(personSchema) }),
  execute: async ({ input, context }) => {
    const post = await requireCanViewPost(input.postId, context.user.id);
    const ids = (post?.likedBy ?? []) as string[];
    return { people: ids.length ? await peopleByIds(ids.slice(0, 200)) : [] };
  },
});
