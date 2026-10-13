import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { readResume, resumeSchema } from '../lib/resume';

export default createEndpoint({
  description: "Returns the signed-in user's chat profile and resume, if they have set one up",
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.object({
    profile: z.object({
      displayName: z.string(),
      status: z.string(),
      avatarUrl: z.string().nullable(),
      resume: resumeSchema,
    }).nullable(),
  }),
  execute: async ({ context }) => {
    const p = await zite.chatProfiles.findOne({ filters: { user: context.user.id } });
    if (!p) return { profile: null };
    return {
      profile: {
        displayName: p.displayName ?? '',
        status: p.status ?? '',
        avatarUrl: p.avatar?.[0]?.url ?? null,
        resume: readResume(p),
      },
    };
  },
});
