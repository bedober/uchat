import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { createTableClient } from 'zitejs/runtime';
import { requireActiveUser } from '../lib/server';

type Safety = { id: string; userId?: string; blockedUserIds?: string; accountStatus?: string };
type SafetyInput = { userId: string | null; blockedUserIds: string | null; profileVisibility: string | null; quietNotifications: boolean | null; preferredLanguage: string | null };
const safety = createTableClient<Safety, SafetyInput>('UchatUserSafety');

export default createEndpoint({
  description: 'Starts a direct or group chat (reuses an existing direct chat)',
  authenticated: true,
  inputSchema: z.object({ memberIds: z.array(z.string()), title: z.string().optional() }),
  outputSchema: z.object({ id: z.string() }),
  execute: async ({ input, context }) => {
    await requireActiveUser(context.user.id);
    const me = context.user.id;
    const others = [...new Set(input.memberIds.filter((id) => id !== me))];
    if (others.length === 0) throw new Error('Pick at least one person');
    const mySafety = await safety.findOne({ filters: { userId: me } });
    const myBlocked = (mySafety?.blockedUserIds ?? '').split('\n').map((id) => id.trim()).filter(Boolean);
    for (const otherId of others) {
      const otherSafety = await safety.findOne({ filters: { userId: otherId } });
      if (String(otherSafety?.accountStatus ?? '').toLowerCase() === 'suspended') throw new Error('You cannot start a chat with a suspended account');
      const otherBlocked = (otherSafety?.blockedUserIds ?? '').split('\n').map((id) => id.trim()).filter(Boolean);
      if (myBlocked.includes(otherId) || otherBlocked.includes(me)) {
        throw new Error('You cannot start a chat because one account has blocked the other');
      }
    }
    const isGroup = others.length > 1;
    if (!isGroup) {
      const { rows } = await zite.sql({
        query: `SELECT id FROM "Conversations" WHERE "isGroup" IS NOT TRUE AND "members" ? $1 AND "members" ? $2
                AND jsonb_array_length("members") = 2 LIMIT 1`,
        params: [me, others[0]],
      });
      if (rows[0]) return { id: String(rows[0].id) };
    }
    const convo = await zite.conversations.create({
      record: {
        title: isGroup ? input.title?.trim() || null : null,
        isGroup,
        members: [me, ...others],
        lastMessageAt: new Date().toISOString(),
      },
    });
    return { id: convo.id };
  },
});
