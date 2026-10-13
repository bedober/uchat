import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { resumeSchema, writeResume } from '../lib/resume';
import { requireActiveUser } from '../lib/server';

export default createEndpoint({
  description: "Creates or updates the signed-in user's profile and resume",
  authenticated: true,
  inputSchema: z.object({
    displayName: z.string(),
    status: z.string(),
    avatarUrl: z.string().nullable(),
    resume: resumeSchema.optional(),
  }),
  outputSchema: z.object({ ok: z.boolean() }),
  execute: async ({ input, context }) => {
    await requireActiveUser(context.user.id);
    const name = input.displayName.trim();
    if (name.length < 2 || name.length > 40) throw new Error('Name must be 2–40 characters');
    if (input.status.length > 80) throw new Error('Status must be 80 characters or fewer');
    await zite.chatProfiles.bulkCreate({
      records: [{
        user: context.user.id,
        displayName: name,
        status: input.status.trim(),
        avatar: input.avatarUrl ? [input.avatarUrl] : null,
        lastSeen: new Date().toISOString(),
        ...(input.resume ? writeResume(input.resume) : {}),
      }],
      matchOn: ['user'],
    });
    if (input.avatarUrl) await zite.auth.updateUserProfile(context.user.id, { image: input.avatarUrl });
    return { ok: true };
  },
});
