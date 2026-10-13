import { createHash } from 'node:crypto';
import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { createTableClient } from 'zitejs/runtime';

type PushSubscriptionRecord = { id: string; subscriptionKey?: string; userId?: string; endpointUrl?: string; subscriptionJson?: string; userAgent?: string; lastUsed?: string };
type PushSubscriptionInput = { subscriptionKey: string | null; userId: string | null; endpointUrl: string | null; subscriptionJson: string | null; userAgent: string | null; lastUsed: string | null };
const subscriptions = createTableClient<PushSubscriptionRecord, PushSubscriptionInput>('UchatPushSubscriptions');

export default createEndpoint({
  description: 'Save the signed-in user’s browser push subscription',
  authenticated: true,
  inputSchema: z.object({
    endpoint: z.string().url().max(2048),
    keys: z.object({ p256dh: z.string().min(10).max(500), auth: z.string().min(4).max(200) }),
  }),
  outputSchema: z.object({ ok: z.boolean() }),
  execute: async ({ input, context }) => {
    if (!input.endpoint.startsWith('https://')) throw new Error('Push endpoint must use HTTPS');
    const subscription = { endpoint: input.endpoint, keys: input.keys };
    const subscriptionKey = createHash('sha256').update(input.endpoint).digest('hex');
    const existing = await subscriptions.findOne({ filters: { subscriptionKey } });
    const record = {
      subscriptionKey,
      userId: context.user.id,
      endpointUrl: input.endpoint,
      subscriptionJson: JSON.stringify(subscription),
      userAgent: '',
      lastUsed: new Date().toISOString(),
    };
    if (existing) await subscriptions.update({ id: existing.id, record });
    else await subscriptions.create({ record });
    return { ok: true };
  },
});
