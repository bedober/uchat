import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { arr, requireMember } from '../lib/server';

export default createEndpoint({
  description: 'Opens a view-once photo or video exactly once, then removes it',
  authenticated: true,
  inputSchema: z.object({ messageId: z.string() }),
  outputSchema: z.object({ mediaUrl: z.string().nullable(), kind: z.string() }),
  execute: async ({ input, context }) => {
    const msg = await zite.messages.findOne({ id: input.messageId });
    if (!msg || !msg.viewOnce) throw new Error('Message not found');
    await requireMember(arr(msg.conversation)[0] ?? '', context.user.id);
    if (arr(msg.sender)[0] === context.user.id) throw new Error("You can't open your own view-once message");
    if (msg.openedAt || !msg.mediaUrl) return { mediaUrl: null, kind: String(msg.kind) };
    const url = msg.mediaUrl;
    await zite.messages.update({ id: msg.id, record: { openedAt: new Date().toISOString(), mediaUrl: null } });
    return { mediaUrl: url, kind: String(msg.kind) };
  },
});
