import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { arr, peopleByIds, personSchema, requireMember } from '../lib/server';

const messageSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  text: z.string(),
  kind: z.enum(['text', 'image', 'video']),
  mediaUrl: z.string().nullable(),
  viewOnce: z.boolean(),
  openedAt: z.string().nullable(),
  seenByOthers: z.boolean(),
  sentAt: z.string(),
});

export default createEndpoint({
  description: 'Loads messages in a chat and marks them as seen',
  authenticated: true,
  inputSchema: z.object({ conversationId: z.string() }),
  outputSchema: z.object({
    title: z.string(),
    isGroup: z.boolean(),
    members: z.array(personSchema),
    messages: z.array(messageSchema),
  }),
  execute: async ({ input, context }) => {
    const me = context.user.id;
    const convo = await requireMember(input.conversationId, me);
    const memberIds = arr(convo.members);
    const { rows } = await zite.sql({
      query: `SELECT * FROM (
                SELECT m.id, m."text" AS "text", m."sender"->>0 AS "senderId", m."kind" AS "kind", m."mediaUrl" AS "mediaUrl",
                  m."viewOnce" AS "viewOnce", m."openedAt" AS "openedAt", m."seenBy" AS "seenBy", m.created_at AS "sentAt"
                FROM "ConversationsMessages" l JOIN "Messages" m ON m.id = l."messagesId"
                WHERE l."conversationsId" = $1
                ORDER BY m.created_at DESC LIMIT 200) t
              ORDER BY "sentAt" ASC`,
      params: [input.conversationId],
    });

    const unseen = rows.filter((r) => r.senderId !== me && !((r.seenBy as string[]) ?? []).includes(me)).slice(-50);
    await Promise.all(unseen.map((r) =>
      zite.messages.update({ id: String(r.id), record: { seenBy: [...((r.seenBy as string[]) ?? []), me] } })));

    const members = await peopleByIds(memberIds);
    const others = members.filter((p) => p.id !== me);
    return {
      title: convo.isGroup ? convo.title || others.map((o) => o.name).join(', ') : others[0]?.name ?? 'Just you',
      isGroup: !!convo.isGroup,
      members,
      messages: rows.map((r) => {
        const kind = String(r.kind ?? 'Text').toLowerCase() as 'text' | 'image' | 'video';
        const viewOnce = !!r.viewOnce;
        const seenBy = (r.seenBy as string[]) ?? [];
        return {
          id: String(r.id),
          senderId: String(r.senderId ?? ''),
          text: String(r.text ?? ''),
          kind,
          // View-once media is only ever handed out by openViewOnce
          mediaUrl: viewOnce ? null : r.mediaUrl ? String(r.mediaUrl) : null,
          viewOnce,
          openedAt: r.openedAt ? new Date(String(r.openedAt)).toISOString() : null,
          seenByOthers: seenBy.some((id) => id !== r.senderId),
          sentAt: new Date(String(r.sentAt)).toISOString(),
        };
      }),
    };
  },
});
