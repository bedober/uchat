import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { peopleByIds } from '../lib/server';

export default createEndpoint({
  description: "Lists the signed-in user's recent calls",
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.object({
    calls: z.array(z.object({
      id: z.string(),
      conversationId: z.string(),
      title: z.string(),
      image: z.string().nullable(),
      callType: z.enum(['voice', 'video']),
      status: z.string(),
      outgoing: z.boolean(),
      startedAt: z.string().nullable(),
      durationSec: z.number().nullable(),
    })),
  }),
  execute: async ({ context }) => {
    const me = context.user.id;
    const { rows } = await zite.sql({
      query: `SELECT k.id, k."callType" AS "callType", k."callStatus" AS "status", k."caller"->>0 AS "callerId",
                k."startedAt" AS "startedAt", k."endedAt" AS "endedAt",
                c.id AS "conversationId", c."isGroup" AS "isGroup", c."title" AS "title", c."members" AS "members"
              FROM "Calls" k
              JOIN "CallsConversations" l ON l."callsId" = k.id
              JOIN "Conversations" c ON c.id = l."conversationsId"
              WHERE c."members" ? $1
              ORDER BY k."startedAt" DESC NULLS LAST LIMIT 50`,
      params: [me],
    });
    const ids = [...new Set(rows.flatMap((r) => (r.members as string[]) ?? []))];
    const people = new Map((await peopleByIds(ids)).map((p) => [p.id, p]));
    return {
      calls: rows.map((r) => {
        const others = ((r.members as string[]) ?? []).filter((id) => id !== me).map((id) => people.get(id)).filter((p) => !!p);
        const start = r.startedAt ? new Date(String(r.startedAt)) : null;
        const end = r.endedAt ? new Date(String(r.endedAt)) : null;
        return {
          id: String(r.id),
          conversationId: String(r.conversationId),
          title: r.isGroup ? String(r.title || others.map((o) => o.name).join(', ')) : others[0]?.name ?? 'Call',
          image: r.isGroup ? null : others[0]?.image ?? null,
          callType: (r.callType === 'Video' ? 'video' : 'voice') as 'voice' | 'video',
          status: String(r.status ?? ''),
          outgoing: r.callerId === me,
          startedAt: start?.toISOString() ?? null,
          durationSec: start && end && r.status === 'Ended' ? Math.round((end.getTime() - start.getTime()) / 1000) : null,
        };
      }),
    };
  },
});
