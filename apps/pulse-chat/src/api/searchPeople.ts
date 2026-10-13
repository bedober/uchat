import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { personSchema, toPerson } from '../lib/server';

export default createEndpoint({
  description: 'Searches UChat users by name or email to start a chat',
  authenticated: true,
  inputSchema: z.object({ query: z.string().trim().max(100) }),
  outputSchema: z.object({ people: z.array(personSchema.extend({ email: z.string() })) }),
  execute: async ({ input, context }) => {
    const { rows } = await zite.sql({
      query: `SELECT u.id, COALESCE(p."displayName", u."name") AS "name", u."email" AS "email", u."image" AS "image",
                p."status" AS "status", p."lastSeen" AS "lastSeen"
              FROM "ChatProfiles" p
              JOIN "ziteUsers" u ON u.id = p."user"->>0
              WHERE u.id <> $1
                AND ($2 = '' OR p."displayName" ILIKE '%' || $2 || '%' OR u."email" ILIKE '%' || $2 || '%')
              ORDER BY p."displayName" ASC
              LIMIT 30`,
      params: [context.user.id, input.query.trim()],
    });
    return { people: rows.map((r) => ({ ...toPerson(r), email: String(r.email ?? '') })) };
  },
});
