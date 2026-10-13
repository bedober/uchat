import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { createTableClient } from 'zitejs/runtime';

type Safety = { id: string; userId?: string; blockedUserIds?: string; profileVisibility?: string; quietNotifications?: boolean; preferredLanguage?: string; accountStatus?: string; suspensionReason?: string };
type SafetyInput = { userId: string | null; blockedUserIds: string | null; profileVisibility: string | null; quietNotifications: boolean | null; preferredLanguage: string | null; accountStatus?: string | null; suspensionReason?: string | null };
const safety = createTableClient<Safety, SafetyInput>('UchatUserSafety');

export default createEndpoint({
  description: 'Block or unblock a UChat account',
  authenticated: true,
  inputSchema: z.object({ targetUserId: z.string().min(1).max(200), blocked: z.boolean() }),
  outputSchema: z.object({ blockedUserIds: z.array(z.string()) }),
  execute: async ({ input, context }) => {
    if (input.targetUserId === context.user.id) throw new Error('You cannot block your own account');
    const existing = await safety.findOne({ filters: { userId: context.user.id } });
    const ids = new Set((existing?.blockedUserIds ?? '').split('\n').map((id) => id.trim()).filter(Boolean));
    if (input.blocked) ids.add(input.targetUserId); else ids.delete(input.targetUserId);
    const blockedUserIds = [...ids];
    const record: SafetyInput = {
      userId: context.user.id,
      blockedUserIds: blockedUserIds.join('\n'),
      profileVisibility: existing?.profileVisibility ?? 'Public',
      quietNotifications: existing?.quietNotifications ?? false,
      preferredLanguage: existing?.preferredLanguage ?? 'English',
      accountStatus: existing?.accountStatus ?? 'Active',
      suspensionReason: existing?.suspensionReason ?? '',
    };
    if (existing) await safety.update({ id: existing.id, record });
    else await safety.create({ record });
    return { blockedUserIds };
  },
});
