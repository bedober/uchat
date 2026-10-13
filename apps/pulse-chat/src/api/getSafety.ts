import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { createTableClient } from 'zitejs/runtime';

type Safety = { id: string; userId?: string; blockedUserIds?: string; profileVisibility?: string; quietNotifications?: boolean; preferredLanguage?: string; accountStatus?: string; suspensionReason?: string };
type SafetyInput = { userId: string | null; blockedUserIds: string | null; profileVisibility: string | null; quietNotifications: boolean | null; preferredLanguage: string | null };
const safety = createTableClient<Safety, SafetyInput>('UchatUserSafety');

export default createEndpoint({
  description: 'Read the signed-in user safety preferences',
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.object({
    blockedUserIds: z.array(z.string()),
    profileVisibility: z.enum(['public', 'private']),
    quietNotifications: z.boolean(),
    preferredLanguage: z.string(),
  }),
  execute: async ({ context }) => {
    const record = await safety.findOne({ filters: { userId: context.user.id } });
    return {
      blockedUserIds: (record?.blockedUserIds ?? '').split('\n').map((id) => id.trim()).filter(Boolean),
      profileVisibility: String(record?.profileVisibility ?? '').toLowerCase() === 'private' ? 'private' : 'public',
      quietNotifications: record?.quietNotifications ?? false,
      preferredLanguage: ({ English: 'en', Luganda: 'lg', Kiswahili: 'sw', Acholi: 'ach', French: 'fr' } as Record<string, string>)[record?.preferredLanguage ?? 'English'] ?? 'en',
    };
  },
});
