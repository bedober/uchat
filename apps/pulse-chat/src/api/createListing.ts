import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireActiveUser } from '../lib/server';

export default createEndpoint({
  description: 'Create a community marketplace listing',
  authenticated: true,
  inputSchema: z.object({
    title: z.string(),
    description: z.string(),
    priceUgx: z.number().nonnegative(),
    category: z.enum(['Product', 'Service', 'Job opportunity']),
    contact: z.string(),
    photoUrl: z.string().url().optional(),
    photoName: z.string().max(200).optional(),
  }),
  outputSchema: z.object({ id: z.string(), ok: z.boolean() }),
  execute: async ({ input, context }) => {
    await requireActiveUser(context.user.id);
    const title = input.title.trim();
    const description = input.description.trim();
    const contact = input.contact.trim();
    if (title.length < 3 || title.length > 90) throw new Error('Title must be 3–90 characters');
    if (description.length < 5 || description.length > 1500) throw new Error('Description must be 5–1,500 characters');
    if (!contact || contact.length > 100) throw new Error('Enter a contact number or contact handle');
    const record = await zite.marketplaceListings.create({
      record: {
        title,
        description,
        priceUgx: input.priceUgx,
        category: input.category,
        contact,
        seller: context.user.id,
        status: 'Active',
        photo: input.photoUrl ? [{ url: input.photoUrl, filename: input.photoName || 'listing-photo' }] : null,
      },
    });
    return { id: record.id, ok: true };
  },
});
