import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { arr, peopleByIds, personSchema, requireCallMember } from '../lib/server';

export default createEndpoint({
  description: 'Polls a live call: who is in it, its status, and connection signals waiting for this user',
  authenticated: true,
  inputSchema: z.object({ callId: z.string() }),
  outputSchema: z.object({
    status: z.string(),
    callType: z.enum(['voice', 'video']),
    title: z.string(),
    joined: z.array(personSchema),
    startedAt: z.string().nullable(),
    signals: z.array(z.object({ from: z.string(), kind: z.string(), payload: z.string() })),
  }),
  execute: async ({ input, context }) => {
    const me = context.user.id;
    const { call, convo } = await requireCallMember(input.callId, me);
    const { rows } = await zite.sql({
      query: `SELECT s.id, s."fromUserId" AS "from", s."signalKind" AS "kind", s."payload" AS "payload"
              FROM "CallSignals" s JOIN "CallSignalsCalls" l ON l."callSignalsId" = s.id
              WHERE l."callsId" = $1 AND s."toUserId" = $2
              ORDER BY s.autonumber_id ASC LIMIT 200`,
      params: [call.id, me],
    });
    await Promise.all(rows.map((r) => zite.callSignals.delete({ id: String(r.id) })));
    const memberIds = arr(convo.members);
    const people = await peopleByIds(memberIds);
    const joined = arr(call.joined);
    const others = people.filter((p) => p.id !== me);
    return {
      status: String(call.callStatus ?? 'Ended'),
      callType: call.callType === 'Video' ? 'video' : 'voice',
      title: convo.isGroup ? convo.title || others.map((o) => o.name).join(', ') : others[0]?.name ?? 'Call',
      joined: people.filter((p) => joined.includes(p.id)),
      startedAt: call.startedAt ?? null,
      signals: rows.map((r) => ({ from: String(r.from), kind: String(r.kind), payload: String(r.payload ?? '') })),
    };
  },
});
