import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { createTableClient } from 'zitejs/runtime';
import { requireActiveUser } from '../lib/server';

type Safety = { id: string; userId?: string; blockedUserIds?: string; profileVisibility?: string; quietNotifications?: boolean; preferredLanguage?: string; accountStatus?: string; suspensionReason?: string };
type SafetyInput = { userId: string | null; blockedUserIds: string | null; profileVisibility: string | null; quietNotifications: boolean | null; preferredLanguage: string | null; accountStatus?: string | null; suspensionReason?: string | null };
const safety = createTableClient<Safety, SafetyInput>('UchatUserSafety');

export default createEndpoint({
  description: 'Save UChat privacy, language, and notification preferences',
  authenticated: true,
  inputSchema: z.object({
    profileVisibility: z.enum(['public', 'private']),
    quietNotifications: z.boolean(),
    preferredLanguage: z.enum(['en', 'lg', 'sw', 'ach', 'fr']),
  }),
  outputSchema: z.object({ ok: z.boolean() }),
  execute: async ({ input, context }) => {
    await requireActiveUser(context.user.id);
    const existing = await safety.findOne({ filters: { userId: context.user.id } });
    const record: SafetyInput = {
      userId: context.user.id,
      blockedUserIds: existing?.blockedUserIds ?? '',
      profileVisibility: input.profileVisibility === 'private' ? 'Private' : 'Public',
      quietNotifications: input.quietNotifications,
      preferredLanguage: ({ en: 'English', lg: 'Luganda', sw: 'Kiswahili', ach: 'Acholi', fr: 'French' } as const)[input.preferredLanguage],
      accountStatus: existing?.accountStatus ?? 'Active',
      suspensionReason: existing?.suspensionReason ?? '',
    };
    if (existing) await safety.update({ id: existing.id, record });
    else await safety.create({ record });
    return { ok: true };
  },
});
