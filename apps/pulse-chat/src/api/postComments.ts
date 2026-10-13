import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { peopleByIds, personSchema, requireActiveUser, requireCanViewPost } from '../lib/server';

export default createEndpoint({
  description: 'Lists comments on a post, optionally adding a new one first',
  authenticated: true,
  inputSchema: z.object({ postId: z.string().min(1).max(200), newComment: z.string().max(500).optional() }),
  outputSchema: z.object({
    comments: z.array(z.object({ id: z.string(), text: z.string(), author: personSchema, at: z.string() })),
  }),
  execute: async ({ input, context }) => {
    await requireCanViewPost(input.postId, context.user.id);
    if (input.newComment?.trim()) await requireActiveUser(context.user.id);
    const text = input.newComment?.trim();
    if (text) {
      if (text.length > 500) throw new Error('Comment is too long');
      await zite.postComments.create({ record: { comment: text, post: input.postId, author: context.user.id } });
    }
    const { rows } = await zite.sql({
      query: `SELECT c.id, c."comment" AS "text", c."author"->>0 AS "authorId", c.created_at AS "at"
              FROM "FeedPostsPostComments" l JOIN "PostComments" c ON c.id = l."postCommentsId"
              WHERE l."feedPostsId" = $1 ORDER BY c.created_at ASC LIMIT 200`,
      params: [input.postId],
    });
    const people = new Map((await peopleByIds([...new Set(rows.map((r) => String(r.authorId)))])).map((p) => [p.id, p]));
    return {
      comments: rows.map((r) => ({
        id: String(r.id),
        text: String(r.text ?? ''),
        author: people.get(String(r.authorId)) ?? { id: '', name: 'Someone', image: null, status: null, online: false },
        at: new Date(String(r.at)).toISOString(),
      })),
    };
  },
});
