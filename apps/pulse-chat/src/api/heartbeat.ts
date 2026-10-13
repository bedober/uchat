import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { peopleByIds } from '../lib/server';

export default createEndpoint({
  description: 'Keeps the user online, expires unanswered calls and reports incoming calls and unread count',
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.object({
    unread: z.number(),
    incoming: z.object({
      callId: z.string(),
      conversationId: z.string(),
      callType: z.enum(['voice', 'video']),
      callerName: z.string(),
      callerImage: z.string().nullable(),
      isGroup: z.boolean(),
      title: z.string().nullable(),
    }).nullable(),
  }),
  execute: async ({ context }) => {
    const me = context.user.id;
    const profile = await zite.chatProfiles.findOne({ filters: { user: me } });
    if (profile) await zite.chatProfiles.update({ id: profile.id, record: { lastSeen: new Date().toISOString() } });

    const { rows: stale } = await zite.sql({
      query: `SELECT k.id FROM "Calls" k
              JOIN "CallsConversations" l ON l."callsId" = k.id
              JOIN "Conversations" c ON c.id = l."conversationsId"
              WHERE k."callStatus" = 'Ringing' AND k."startedAt" < now() - interval '30 seconds' AND c."members" ? $1`,
      params: [me],
    });
    await Promise.all(stale.map((r) => zite.calls.update({ id: String(r.id), record: { callStatus: 'Missed', endedAt: new Date().toISOString() } })));

    const { rows } = await zite.sql({
      query: `SELECT k.id, k."callType" AS "callType", k."caller"->>0 AS "callerId", c.id AS "conversationId",
                c."isGroup" AS "isGroup", c."title" AS "title"
              FROM "Calls" k
              JOIN "CallsConversations" l ON l."callsId" = k.id
              JOIN "Conversations" c ON c.id = l."conversationsId"
              WHERE k."callStatus" IN ('Ringing', 'Active') AND k."startedAt" >= now() - interval '30 seconds'
                AND c."members" ? $1 AND NOT (k."joined" ? $1) AND COALESCE(k."caller"->>0, '') <> $1
              ORDER BY k."startedAt" DESC LIMIT 1`,
      params: [me],
    });
    const { rows: unreadRows } = await zite.sql({
      query: `SELECT COUNT(*) AS n FROM "Conversations" c
              JOIN "ConversationsMessages" l ON l."conversationsId" = c.id
              JOIN "Messages" m ON m.id = l."messagesId"
              WHERE c."members" ? $1 AND COALESCE(m."sender"->>0, '') <> $1 AND NOT (m."seenBy" ? $1)`,
      params: [me],
    });

    let incoming: {
      callId: string; conversationId: string; callType: 'voice' | 'video'; callerName: string;
      callerImage: string | null; isGroup: boolean; title: string | null;
    } | null = null;
    if (rows[0]) {
      const r = rows[0];
      const [caller] = await peopleByIds([String(r.callerId)]);
      incoming = {
        callId: String(r.id),
        conversationId: String(r.conversationId),
        callType: (r.callType === 'Video' ? 'video' : 'voice') as 'voice' | 'video',
        callerName: caller?.name ?? 'Someone',
        callerImage: caller?.image ?? null,
        isGroup: !!r.isGroup,
        title: r.title ? String(r.title) : null,
      };
    }
    return { unread: Number(unreadRows[0]?.n ?? 0), incoming };
  },
});
