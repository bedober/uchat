import { createHash } from 'node:crypto';
import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { createTableClient } from 'zitejs/runtime';

type PushSubscriptionRecord = { id: string; subscriptionKey?: string; userId?: string };
type PushSubscriptionInput = { subscriptionKey: string | null; userId: string | null; endpointUrl: string | null; subscriptionJson: string | null; userAgent: string | null; lastUsed: string | null };
const subscriptions = createTableClient<PushSubscriptionRecord, PushSubscriptionInput>('UchatPushSubscriptions');

export default createEndpoint({
  description: 'Remove this browser’s push subscription',
  authenticated: true,
  inputSchema: z.object({ endpoint: z.string().url().max(2048) }),
  outputSchema: z.object({ ok: z.boolean() }),
  execute: async ({ input, context }) => {
    const subscriptionKey = createHash('sha256').update(input.endpoint).digest('hex');
    const existing = await subscriptions.findOne({ filters: { subscriptionKey } });
    if (existing?.userId === context.user.id) await subscriptions.delete({ id: existing.id });
    return { ok: true };
  },
});
