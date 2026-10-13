import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { arr, requireCallMember } from '../lib/server';

export default createEndpoint({
  description: 'Sends call connection signals (offers, answers, network candidates) to other people in a call',
  authenticated: true,
  inputSchema: z.object({
    callId: z.string(),
    signals: z.array(z.object({ to: z.string(), kind: z.string(), payload: z.string() })),
  }),
  outputSchema: z.object({ sent: z.number() }),
  execute: async ({ input, context }) => {
    const { call, convo } = await requireCallMember(input.callId, context.user.id);
    const members = arr(convo.members);
    const valid = input.signals.filter((s) => members.includes(s.to));
    for (let i = 0; i < valid.length; i += 100) {
      await zite.callSignals.bulkCreate({
        records: valid.slice(i, i + 100).map((s) => ({
          call: call.id,
          fromUserId: context.user.id,
          toUserId: s.to,
          signalKind: s.kind,
          payload: s.payload,
        })),
      });
    }
    return { sent: valid.length };
  },
});
