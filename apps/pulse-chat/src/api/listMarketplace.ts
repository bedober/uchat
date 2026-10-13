import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { peopleByIds, personSchema } from '../lib/server';
import { createTableClient } from 'zitejs/runtime';

type Safety = { id: string; userId?: string; accountStatus?: string };
type SafetyInput = { userId: string | null; blockedUserIds: string | null; profileVisibility: string | null; quietNotifications: boolean | null; preferredLanguage: string | null; accountStatus?: string | null; suspensionReason?: string | null };
const safety = createTableClient<Safety, SafetyInput>('UchatUserSafety');

export default createEndpoint({
  description: 'Browse active community marketplace listings',
  authenticated: true,
  inputSchema: z.object({ category: z.string().optional(), search: z.string().optional() }),
  outputSchema: z.object({
    listings: z.array(z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      priceUgx: z.number(),
      category: z.string(),
      contact: z.string(),
      photoUrl: z.string().nullable(),
      seller: personSchema,
    })),
  }),
  execute: async ({ input }) => {
    const { records } = await zite.marketplaceListings.findAll({ filters: { status: 'Active' }, limit: 200 });
    const sellerIdsForSafety = [...new Set(records.map((r) => Array.isArray(r.seller) ? r.seller[0] : r.seller).filter((id): id is string => !!id))];
    const sellerSafety = await Promise.all(sellerIdsForSafety.map(async (id) => [id, await safety.findOne({ filters: { userId: id } })] as const));
    const suspendedSellers = new Set(sellerSafety.filter(([, s]) => String(s?.accountStatus ?? '').toLowerCase() === 'suspended').map(([id]) => id));
    const visibleRecords = records.filter((r) => !suspendedSellers.has((Array.isArray(r.seller) ? r.seller[0] : r.seller) ?? ''));
    const filtered = visibleRecords.filter((r) => {
      const categoryMatch = !input.category || input.category === 'All' || r.category === input.category;
      const q = (input.search ?? '').trim().toLowerCase();
      const searchMatch = !q || [r.title, r.description, r.category].some((v) => (v ?? '').toLowerCase().includes(q));
      return categoryMatch && searchMatch;
    });
    const sellerIds = [...new Set(filtered.map((r) => Array.isArray(r.seller) ? r.seller[0] : r.seller).filter((id): id is string => !!id))];
    const people = new Map((await peopleByIds(sellerIds)).map((person) => [person.id, person]));
    return {
      listings: filtered
        .sort((a, b) => String(b.id).localeCompare(String(a.id)))
        .map((r) => {
          const sellerId = Array.isArray(r.seller) ? r.seller[0] : r.seller;
          return {
            id: r.id,
            title: r.title ?? 'Untitled listing',
            description: r.description ?? '',
            priceUgx: Number(r.priceUgx ?? 0),
            category: r.category ?? 'Product',
            contact: r.contact ?? '',
            photoUrl: r.photo?.[0]?.url ?? null,
            seller: people.get(sellerId ?? '') ?? { id: sellerId ?? '', name: 'Community seller', image: null, status: null, online: false },
          };
        }),
    };
  },
});
