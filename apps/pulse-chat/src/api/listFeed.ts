import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { createTableClient } from 'zitejs/runtime';
import { peopleByIds, personSchema } from '../lib/server';

type Safety = { id: string; userId?: string; blockedUserIds?: string; profileVisibility?: string; accountStatus?: string };
type SafetyInput = { userId: string | null; blockedUserIds: string | null; profileVisibility: string | null; quietNotifications: boolean | null; preferredLanguage: string | null };
const safety = createTableClient<Safety, SafetyInput>('UchatUserSafety');
type Follow = { id: string; followerId?: string; followedUserId?: string; status?: string };
type FollowInput = { relationship: string | null; followerId: string | null; followedUserId: string | null; status: string | null };
const follows = createTableClient<Follow, FollowInput>('UchatFollows');

const PAGE = 20;

export default createEndpoint({
  description: 'Loads the social feed, 20 posts at a time, newest first',
  authenticated: true,
  inputSchema: z.object({ offset: z.number().int().min(0).max(100000) }),
  outputSchema: z.object({
    posts: z.array(z.object({
      id: z.string(),
      body: z.string(),
      author: personSchema,
      media: z.array(z.object({ url: z.string(), isVideo: z.boolean() })),
      likeCount: z.number(),
      likedByMe: z.boolean(),
      commentCount: z.number(),
      giftCount: z.number(),
      postedAt: z.string(),
    })),
    nextOffset: z.number().nullable(),
  }),
  execute: async ({ input, context }) => {
    const me = context.user.id;
    const { rows } = await zite.sql({
      query: `SELECT p.id, p."body" AS "body", p."author"->>0 AS "authorId", p."media" AS "media", p."likedBy" AS "likedBy",
                p.created_at AS "postedAt",
                (SELECT COUNT(*) FROM "FeedPostsPostComments" l JOIN "PostComments" c ON c.id = l."postCommentsId"
                  WHERE l."feedPostsId" = p.id) AS "commentCount",
                (SELECT COUNT(*) FROM "FeedPostsPostGifts" g WHERE g."feedPostsId" = p.id) AS "giftCount"
              FROM "FeedPosts" p
              ORDER BY p.created_at DESC
              LIMIT ${PAGE + 1} OFFSET $1`,
      params: [input.offset],
    });
    const page = rows.slice(0, PAGE);
    const mySafety = await safety.findOne({ filters: { userId: me } });
    const blocked = (mySafety?.blockedUserIds ?? '').split('\n').map((id) => id.trim()).filter(Boolean);
    const authorIds = [...new Set(page.map((r) => String(r.authorId)))];
    const authorSafety = await Promise.all(authorIds.map(async (id) => [id, await safety.findOne({ filters: { userId: id } })] as const));
    const safetyByUser = new Map(authorSafety);
    const visibleChecks = await Promise.all(page.map(async (r) => {
      const authorId = String(r.authorId);
      const authorPrivacy = safetyByUser.get(authorId)?.profileVisibility;
      if (blocked.includes(authorId)) return false;
      const authorBlocked = (safetyByUser.get(authorId)?.blockedUserIds ?? '').split('\n').map((id) => id.trim()).filter(Boolean);
      if (authorBlocked.includes(me)) return false;
      if (String(safetyByUser.get(authorId)?.accountStatus ?? '').toLowerCase() === 'suspended' && authorId !== me) return false;
      if (String(authorPrivacy ?? '').toLowerCase() !== 'private' || authorId === me) return true;
      const accepted = await follows.findOne({ filters: { followerId: me, followedUserId: authorId, status: 'Active' } });
      return Boolean(accepted);
    }));
    const visiblePage = page.filter((_, i) => visibleChecks[i]);
    const people = new Map((await peopleByIds([...new Set(visiblePage.map((r) => String(r.authorId)))])).map((p) => [p.id, p]));
    return {
      posts: visiblePage.map((r) => {
        const liked = (r.likedBy as string[]) ?? [];
        const media = ((r.media as Array<{ url?: string; mimeType?: string; filename?: string }>) ?? [])
          .filter((m) => m && m.url)
          .map((m) => ({
            url: String(m.url),
            isVideo: (m.mimeType ?? '').startsWith('video') || /\.(mp4|mov|webm|m4v)$/i.test(m.filename ?? m.url ?? ''),
          }));
        return {
          id: String(r.id),
          body: String(r.body ?? ''),
          author: people.get(String(r.authorId)) ?? { id: '', name: 'Someone', image: null, status: null, online: false },
          media,
          likeCount: liked.length,
          likedByMe: liked.includes(me),
          commentCount: Number(r.commentCount ?? 0),
          giftCount: Number(r.giftCount ?? 0),
          postedAt: new Date(String(r.postedAt)).toISOString(),
        };
      }),
      nextOffset: rows.length > PAGE ? input.offset + PAGE : null,
    };
  },
});
