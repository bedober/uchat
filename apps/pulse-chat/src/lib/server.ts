import { zite } from 'zitejs/db';
import { createTableClient } from 'zitejs/runtime';
import { z } from 'zod';

type AccountSafety = { id: string; userId?: string; accountStatus?: string; suspensionReason?: string };
type AccountSafetyInput = { userId: string | null; blockedUserIds: string | null; profileVisibility: string | null; quietNotifications: boolean | null; preferredLanguage: string | null; accountStatus?: string | null; suspensionReason?: string | null };
const accountSafety = createTableClient<AccountSafety, AccountSafetyInput>('UchatUserSafety');

/** Blocks account actions while allowing sign-in and support access. */
export async function requireActiveUser(userId: string) {
  const record = await accountSafety.findOne({ filters: { userId } });
  if (String(record?.accountStatus ?? '').toLowerCase() === 'suspended') {
    throw new Error('This account is suspended. Contact UChat support for help.');
  }
}

type PostSafety = { id: string; userId?: string; blockedUserIds?: string; profileVisibility?: string; accountStatus?: string };
type PostSafetyInput = { userId: string | null; blockedUserIds: string | null; profileVisibility: string | null; quietNotifications: boolean | null; preferredLanguage: string | null; accountStatus?: string | null; suspensionReason?: string | null };
const postSafety = createTableClient<PostSafety, PostSafetyInput>('UchatUserSafety');
type PostFollow = { id: string; followerId?: string; followedUserId?: string; status?: string };
type PostFollowInput = { relationship: string | null; followerId: string | null; followedUserId: string | null; status: string | null };
const postFollows = createTableClient<PostFollow, PostFollowInput>('UchatFollows');

/** Enforces post visibility and bilateral block rules on every post-specific API. */
export async function requireCanViewPost(postId: string, userId: string) {
  const post = await zite.feedPosts.findOne({ id: postId });
  if (!post) throw new Error('Post not found');
  const authorId = arr(post.author)[0];
  if (!authorId) throw new Error('Post not found');
  const [viewerSafety, authorSafety] = await Promise.all([
    postSafety.findOne({ filters: { userId } }),
    postSafety.findOne({ filters: { userId: authorId } }),
  ]);
  const viewerBlocks = (viewerSafety?.blockedUserIds ?? '').split('\n').map((v) => v.trim()).filter(Boolean);
  const authorBlocks = (authorSafety?.blockedUserIds ?? '').split('\n').map((v) => v.trim()).filter(Boolean);
  if (viewerBlocks.includes(authorId) || authorBlocks.includes(userId)) throw new Error('This post is unavailable.');
  if (authorId !== userId && String(authorSafety?.accountStatus ?? '').toLowerCase() === 'suspended') throw new Error('This post is unavailable.');
  if (authorId !== userId && String(authorSafety?.profileVisibility ?? '').toLowerCase() === 'private') {
    const accepted = await postFollows.findOne({ filters: { followerId: userId, followedUserId: authorId, status: 'Active' } });
    if (!accepted) throw new Error('This post is unavailable.');
  }
  return post;
}

export const arr = (v: string | string[] | undefined | null): string[] =>
  !v ? [] : Array.isArray(v) ? v : [v];

export const personSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().nullable(),
  status: z.string().nullable(),
  online: z.boolean(),
});
export type Person = z.infer<typeof personSchema>;

const ONLINE_MS = 30_000;

export async function peopleByIds(ids: string[]): Promise<Person[]> {
  if (ids.length === 0) return [];
  const { rows } = await zite.sql({
    query: `SELECT u.id, COALESCE(p."displayName", u."name", u."email") AS "name", u."image" AS "image",
              p."status" AS "status", p."lastSeen" AS "lastSeen"
            FROM "ziteUsers" u
            LEFT JOIN "ChatProfiles" p ON p."user"->>0 = u.id
            WHERE u.id = ANY($1::text[])`,
    params: [ids],
  });
  return rows.map(toPerson);
}

export function toPerson(r: Record<string, unknown>): Person {
  const seen = r.lastSeen ? new Date(String(r.lastSeen)).getTime() : 0;
  return {
    id: String(r.id),
    name: String(r.name ?? 'Someone'),
    image: r.image ? String(r.image) : null,
    status: r.status ? String(r.status) : null,
    online: Date.now() - seen < ONLINE_MS,
  };
}

export async function requireMember(conversationId: string, userId: string) {
  const convo = await zite.conversations.findOne({ id: conversationId });
  if (!convo || !arr(convo.members).includes(userId)) {
    throw new Error('Chat not found');
  }
  return convo;
}

export async function requireCallMember(callId: string, userId: string) {
  const call = await zite.calls.findOne({ id: callId });
  if (!call) throw new Error('Call not found');
  const convo = await requireMember(arr(call.conversation)[0] ?? '', userId);
  return { call, convo };
}
