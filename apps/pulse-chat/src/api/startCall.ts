import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireActiveUser, requireMember } from '../lib/server';

export default createEndpoint({
  description: 'Starts a voice or video call in a chat',
  authenticated: true,
  inputSchema: z.object({ conversationId: z.string(), callType: z.enum(['voice', 'video']) }),
  outputSchema: z.object({ callId: z.string() }),
  execute: async ({ input, context }) => {
    await requireActiveUser(context.user.id);
    await requireMember(input.conversationId, context.user.id);
    const call = await zite.calls.create({
      record: {
        roomName: `call-${Date.now()}`,
        conversation: input.conversationId,
        caller: context.user.id,
        joined: [context.user.id],
        callType: input.callType === 'video' ? 'Video' : 'Voice',
        callStatus: 'Ringing',
        startedAt: new Date().toISOString(),
      },
    });
    return { callId: call.id };
  },
});
