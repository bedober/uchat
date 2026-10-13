import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Submit a safety report for review',
  authenticated: true,
  inputSchema: z.object({
    targetId: z.string().min(1).max(200),
    targetType: z.enum(['user', 'post', 'listing']),
    reason: z.enum(['spam', 'scam', 'harassment', 'impersonation', 'unsafe', 'other']),
    details: z.string().max(1000).optional(),
  }),
  outputSchema: z.object({ ok: z.boolean() }),
  execute: async ({ input, context }) => {
    const targetType = input.targetType === 'user' ? 'User' : input.targetType === 'post' ? 'Post' : 'Marketplace listing';
    const reason = ({ spam: 'Spam', scam: 'Scam or fraud', harassment: 'Harassment', impersonation: 'Impersonation', unsafe: 'Unsafe content', other: 'Other' } as const)[input.reason];
    await zite.uchatModerationReports.create({ record: {
      targetId: input.targetId,
      targetType,
      reporterId: context.user.id,
      reason,
      details: input.details?.trim() ?? '',
      status: 'Open',
    } });
    return { ok: true };
  },
});
