import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { createTableClient } from 'zitejs/runtime';

type Ledger = { id: string; transactionReference?: string; payerUserId?: string; creatorUserId?: string; giftType?: string; giftAmountUgx?: number; processingFeeUgx?: number; netRevenueUgx?: number; creatorShareUgx?: number; platformShareUgx?: number; paymentStatus?: string; verifiedAt?: string; availableAt?: string };
type LedgerInput = { transactionReference: string | null; payerUserId: string | null; creatorUserId: string | null; postId: string | null; giftType: string | null; giftAmountUgx: number | null; processingFeeUgx: number | null; netRevenueUgx: number | null; creatorShareUgx: number | null; platformShareUgx: number | null; paymentStatus: string | null; provider: string | null; providerTransactionId: string | null; webhookEventId: string | null; verifiedAt: string | null; availableAt: string | null; failureOrReversalNote: string | null };
type Settings = { id: string; settingsKey?: string; creatorSharePercent?: number; platformSharePercent?: number; minimumWithdrawalUgx?: number; earningsHoldDays?: number; paymentProvider?: string; withdrawalApprovalMode?: string; liveMoneyMovementEnabled?: boolean; implementationStatus?: string };
type SettingsInput = { settingsKey: string | null; creatorSharePercent: number | null; platformSharePercent: number | null; minimumWithdrawalUgx: number | null; earningsHoldDays: number | null; paymentProvider: string | null; withdrawalApprovalMode: string | null; liveMoneyMovementEnabled: boolean | null; implementationStatus: string | null; updatedBy: string | null; lastUpdated: string | null };
const ledger = createTableClient<Ledger, LedgerInput>('UchatGiftLedger');
const settingsTable = createTableClient<Settings, SettingsInput>('UchatMonetizationSettings');

export default createEndpoint({
  description: 'Read-only creator earnings and approved monetization policy; never initiates charges or transfers',
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.object({
    policy: z.object({ creatorSharePercent: z.number(), platformSharePercent: z.number(), minimumWithdrawalUGX: z.number(), earningsHoldDays: z.number(), paymentProvider: z.string(), withdrawalApprovalMode: z.string(), liveMoneyMovementEnabled: z.boolean(), implementationStatus: z.string() }),
    totals: z.object({ pendingUGX: z.number(), onHoldUGX: z.number(), availableUGX: z.number(), paidUGX: z.number(), verifiedTransactions: z.number() }),
  }),
  execute: async ({ context }) => {
    const settings = await settingsTable.findOne({ filters: { settingsKey: 'default' } });
    const { records } = await ledger.findAll({ filters: { creatorUserId: context.user.id }, limit: 2000 });
    const sum = (statuses: string[]) => records.filter((r) => statuses.includes(String(r.paymentStatus ?? ''))).reduce((n, r) => n + Number(r.creatorShareUgx ?? 0), 0);
    return {
      policy: {
        creatorSharePercent: Number(settings?.creatorSharePercent ?? 70),
        platformSharePercent: Number(settings?.platformSharePercent ?? 30),
        minimumWithdrawalUGX: Number(settings?.minimumWithdrawalUgx ?? 20000),
        earningsHoldDays: Number(settings?.earningsHoldDays ?? 7),
        paymentProvider: String(settings?.paymentProvider ?? 'Flutterwave'),
        withdrawalApprovalMode: String(settings?.withdrawalApprovalMode ?? 'Automatic after provider verification'),
        liveMoneyMovementEnabled: settings?.liveMoneyMovementEnabled === true,
        implementationStatus: String(settings?.implementationStatus ?? 'Payment processing not configured'),
      },
      totals: {
        pendingUGX: sum(['Pending Payment']),
        onHoldUGX: sum(['Payment Verified', 'On Hold']),
        availableUGX: sum(['Available']),
        paidUGX: sum(['Paid']),
        verifiedTransactions: records.filter((r) => ['Payment Verified', 'On Hold', 'Available', 'Paid'].includes(String(r.paymentStatus ?? ''))).length,
      },
    };
  },
});
