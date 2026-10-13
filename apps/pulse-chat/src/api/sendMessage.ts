import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { createTableClient } from 'zitejs/runtime';
import { arr, peopleByIds, requireActiveUser, requireMember } from '../lib/server';
import { sendPushToUsers } from '../lib/push';

type Safety = { id: string; userId?: string; blockedUserIds?: string; accountStatus?: string };
type SafetyInput = { userId: string | null; blockedUserIds: string | null; profileVisibility: string | null; quietNotifications: boolean | null; preferredLanguage: string | null };
const safety = createTableClient<Safety, SafetyInput>('UchatUserSafety');

const KIND = { text: 'Text', image: 'Image', video: 'Video' } as const;

export default createEndpoint({
  description: 'Sends a text, photo, video or view-once message to a chat',
  authenticated: true,
  inputSchema: z.object({
    conversationId: z.string(),
    text: z.string(),
    kind: z.enum(['text', 'image', 'video']),
    mediaUrl: z.string().nullable(),
    viewOnce: z.boolean(),
  }),
  outputSchema: z.object({ id: z.string() }),
  execute: async ({ input, context }) => {
    await requireActiveUser(context.user.id);
    const conversation = await requireMember(input.conversationId, context.user.id);
    const members = arr(conversation.members);
    const mySafety = await safety.findOne({ filters: { userId: context.user.id } });
    const myBlocked = (mySafety?.blockedUserIds ?? '').split('\n').map((id) => id.trim()).filter(Boolean);
    for (const otherId of members.filter((id) => id !== context.user.id)) {
      const otherSafety = await safety.findOne({ filters: { userId: otherId } });
      if (String(otherSafety?.accountStatus ?? '').toLowerCase() === 'suspended') throw new Error('Messaging a suspended account is unavailable');
      const otherBlocked = (otherSafety?.blockedUserIds ?? '').split('\n').map((id) => id.trim()).filter(Boolean);
      if (myBlocked.includes(otherId) || otherBlocked.includes(context.user.id)) {
        throw new Error('Messaging is unavailable because one account has blocked the other');
      }
    }
    const text = input.text.trim();
    if (input.kind === 'text' && !text) throw new Error('Message is empty');
    if (input.kind !== 'text' && !input.mediaUrl) throw new Error('Missing media');
    const msg = await zite.messages.create({
      record: {
        conversation: input.conversationId,
        sender: context.user.id,
        text: text || null,
        kind: KIND[input.kind],
        mediaUrl: input.kind === 'text' ? null : input.mediaUrl,
        viewOnce: input.kind !== 'text' && input.viewOnce,
        seenBy: [],
      },
    });
    await zite.conversations.update({ id: input.conversationId, record: { lastMessageAt: new Date().toISOString() } });
    const recipients = members.filter((id) => id !== context.user.id);
    const sender = (await peopleByIds([context.user.id]))[0];
    await sendPushToUsers(recipients, {
      title: sender?.name ? `${sender.name} sent you a message` : 'New UChat message',
      body: input.kind === 'text' ? (text.length > 120 ? `${text.slice(0, 117)}…` : text) : `Shared a ${input.kind}`,
      url: `/c/${input.conversationId}`,
    });
    return { id: msg.id };
  },
});
