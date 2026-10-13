import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { arr, requireCallMember } from '../lib/server';

export default createEndpoint({
  description: 'Accepts, declines or leaves a call',
  authenticated: true,
  inputSchema: z.object({ callId: z.string(), action: z.enum(['join', 'decline', 'leave']) }),
  outputSchema: z.object({ status: z.string() }),
  execute: async ({ input, context }) => {
    const me = context.user.id;
    const { call, convo } = await requireCallMember(input.callId, me);
    const joined = arr(call.joined);
    const now = new Date().toISOString();
    const done = call.callStatus === 'Ended' || call.callStatus === 'Missed' || call.callStatus === 'Declined';

    if (input.action === 'join') {
      if (done) throw new Error('This call has ended');
      await zite.calls.update({ id: call.id, record: { joined: [...new Set([...joined, me])], callStatus: 'Active' } });
      return { status: 'Active' };
    }
    if (input.action === 'decline') {
      if (!convo.isGroup && call.callStatus === 'Ringing') {
        await zite.calls.update({ id: call.id, record: { callStatus: 'Declined', endedAt: now } });
        return { status: 'Declined' };
      }
      return { status: String(call.callStatus) };
    }
    // leave
    const remaining = joined.filter((id) => id !== me);
    const end = !done && (!convo.isGroup || remaining.length === 0 || (call.callStatus === 'Active' && remaining.length <= 1));
    const status = end ? (call.callStatus === 'Ringing' ? 'Missed' : 'Ended') : String(call.callStatus);
    await zite.calls.update({
      id: call.id,
      record: { joined: remaining, ...(end ? { callStatus: status, endedAt: now } : {}) },
    });
    return { status };
  },
});
