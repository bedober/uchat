import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { peopleByIds, personSchema } from '../lib/server';

export default createEndpoint({
  description: "Lists the signed-in user's conversations with last message and unread count",
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.object({
    conversations: z.array(z.object({
      id: z.string(),
      title: z.string(),
      isGroup: z.boolean(),
      members: z.array(personSchema),
      lastMessageAt: z.string().nullable(),
      preview: z.string(),
      unread: z.number(),
    })),
  }),
  execute: async ({ context }) => {
    const me = context.user.id;
    const { rows } = await zite.sql({
      query: `SELECT c.id, c."title" AS "title", c."isGroup" AS "isGroup", c."members" AS "members",
                COALESCE(c."lastMessageAt", c.created_at) AS "sortAt",
                (SELECT json_build_object('text', m."text", 'kind', m."kind", 'viewOnce', m."viewOnce", 'sender', m."sender"->>0)
                   FROM "ConversationsMessages" l JOIN "Messages" m ON m.id = l."messagesId"
                   WHERE l."conversationsId" = c.id ORDER BY m.created_at DESC LIMIT 1) AS "last",
                (SELECT COUNT(*) FROM "ConversationsMessages" l JOIN "Messages" m ON m.id = l."messagesId"
                   WHERE l."conversationsId" = c.id AND COALESCE(m."sender"->>0, '') <> $1
                     AND NOT (m."seenBy" ? $1)) AS "unread"
              FROM "Conversations" c
              WHERE c."members" ? $1
              ORDER BY "sortAt" DESC
              LIMIT 200`,
      params: [me],
    });
    const allIds = [...new Set(rows.flatMap((r) => (r.members as string[]) ?? []))];
    const people = new Map((await peopleByIds(allIds)).map((p) => [p.id, p]));
    return {
      conversations: rows.map((r) => {
        const members = ((r.members as string[]) ?? []).map((id) => people.get(id)).filter((p) => !!p);
        const others = members.filter((p) => p.id !== me);
        const last = r.last as { text?: string; kind?: string; viewOnce?: boolean; sender?: string } | null;
        let preview = 'No messages yet';
        if (last) {
          const body = last.viewOnce ? 'View once message' : last.kind === 'Image' ? '📷 Photo' : last.kind === 'Video' ? '🎥 Video' : last.text ?? '';
          const who = last.sender === me ? 'You' : people.get(last.sender ?? '')?.name.split(' ')[0];
          preview = r.isGroup || last.sender === me ? `${who}: ${body}` : body;
        }
        return {
          id: String(r.id),
          title: r.isGroup ? String(r.title || others.map((o) => o.name).join(', ')) : others[0]?.name ?? 'Just you',
          isGroup: !!r.isGroup,
          members,
          lastMessageAt: r.sortAt ? new Date(String(r.sortAt)).toISOString() : null,
          preview,
          unread: Number(r.unread ?? 0),
        };
      }),
    };
  },
});
