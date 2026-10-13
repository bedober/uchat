import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { arr } from '../lib/server';

export default createEndpoint({
  description: 'Deletes a message the signed-in user sent',
  authenticated: true,
  inputSchema: z.object({ messageId: z.string() }),
  outputSchema: z.object({ ok: z.boolean() }),
  execute: async ({ input, context }) => {
    const msg = await zite.messages.findOne({ id: input.messageId });
    if (!msg || arr(msg.sender)[0] !== context.user.id) throw new Error('Message not found');
    await zite.messages.delete({ id: msg.id });
    return { ok: true };
  },
});
