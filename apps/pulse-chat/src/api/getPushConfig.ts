import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { getStoredApiKey } from '../lib/credentials';

export default createEndpoint({
  description: 'Returns the public VAPID key for browser push subscription',
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.object({ enabled: z.boolean(), publicKey: z.string().nullable() }),
  execute: async () => {
    const publicKey = await getStoredApiKey('uchat_vapid_public_key');
    const privateKey = await getStoredApiKey('uchat_vapid_private_key');
    return { enabled: Boolean(publicKey && privateKey), publicKey: publicKey ?? null };
  },
});
