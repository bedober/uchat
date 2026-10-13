import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { peopleByIds, personSchema, requireActiveUser, requireCanViewPost } from '../lib/server';

const GIFTS = ['Rose', 'Star', 'Heart', 'Fire', 'Crown', 'Diamond'] as const;

export default createEndpoint({
  description: 'Lists gifts sent on a post, optionally sending a new gift first',
  authenticated: true,
  inputSchema: z.object({ postId: z.string().min(1).max(200), send: z.enum(GIFTS).optional() }),
  outputSchema: z.object({
    gifts: z.array(z.object({ id: z.string(), type: z.string(), sender: personSchema, at: z.string() })),
  }),
  execute: async ({ input, context }) => {
    await requireCanViewPost(input.postId, context.user.id);
    if (input.send) await requireActiveUser(context.user.id);
    if (input.send) {
      if (!GIFTS.includes(input.send)) throw new Error('Unknown gift');
      await zite.postGifts.create({ record: { giftType: input.send, post: input.postId, sender: context.user.id } });
    }
    const { rows } = await zite.sql({
      query: `SELECT g.id, g."giftType" AS "type", g."sender"->>0 AS "senderId", g.created_at AS "at"
              FROM "FeedPostsPostGifts" l JOIN "PostGifts" g ON g.id = l."postGiftsId"
              WHERE l."feedPostsId" = $1 ORDER BY g.created_at DESC LIMIT 200`,
      params: [input.postId],
    });
    const people = new Map((await peopleByIds([...new Set(rows.map((r) => String(r.senderId)))])).map((p) => [p.id, p]));
    return {
      gifts: rows.map((r) => ({
        id: String(r.id),
        type: String(r.type ?? 'Rose'),
        sender: people.get(String(r.senderId)) ?? { id: '', name: 'Someone', image: null, status: null, online: false },
        at: new Date(String(r.at)).toISOString(),
      })),
    };
  },
});
