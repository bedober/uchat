import { useQuery } from '@tanstack/react-query';
import { getCreatorEarnings, listFeed } from 'zitejs/api';
import { useAuth } from 'zitejs/auth';
import { BarChart3, Gift, Heart, MessageCircle, Wallet } from 'lucide-react';

export default function CreatorStudioPage() {
  const { user } = useAuth();
  const query = useQuery({ queryKey: ['creator-studio-feed'], queryFn: () => listFeed({ offset: 0 }) });
  const earningsQuery = useQuery({ queryKey: ['creator-earnings'], queryFn: () => getCreatorEarnings({}) });
  const posts = query.data?.posts.filter((post) => post.author.id === user?.id) ?? [];
  const totalLikes = posts.reduce((sum, post) => sum + post.likeCount, 0);
  const totalComments = posts.reduce((sum, post) => sum + post.commentCount, 0);
  const totalGifts = posts.reduce((sum, post) => sum + post.giftCount, 0);
  const stats = [
    { label: 'Posts loaded', value: posts.length, icon: BarChart3 },
    { label: 'Likes', value: totalLikes, icon: Heart },
    { label: 'Comments', value: totalComments, icon: MessageCircle },
    { label: 'Community gifts', value: totalGifts, icon: Gift },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-6 p-4 pb-10 md:p-6">
        <header><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">For creators</p><h1 className="mt-1 text-2xl font-extrabold">Creator Studio</h1><p className="mt-1 text-sm text-muted-foreground">A snapshot of your recent content performance.</p></header>
        {query.isLoading && <p className="py-8 text-sm text-muted-foreground">Loading your creator stats…</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border bg-card p-4"><Icon className="mb-3 h-5 w-5 text-primary" /><p className="text-2xl font-extrabold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>)}
        </div>
        <section className="space-y-4 rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /><h2 className="font-bold">Creator earnings</h2></div>
          {earningsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading earnings policy…</p> : earningsQuery.isError ? <p className="text-sm text-muted-foreground">Earnings information is temporarily unavailable.</p> : <><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[{label:'Pending gifts',value:earningsQuery.data?.totals.pendingUGX ?? 0},{label:'On hold',value:earningsQuery.data?.totals.onHoldUGX ?? 0},{label:'Available',value:earningsQuery.data?.totals.availableUGX ?? 0},{label:'Paid out',value:earningsQuery.data?.totals.paidUGX ?? 0}].map((s) => <div key={s.label} className="rounded-xl bg-muted p-3"><p className="text-lg font-extrabold">UGX {s.value.toLocaleString()}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>)}</div><div className="grid gap-2 text-sm sm:grid-cols-2"><p>Creator share: <strong>{earningsQuery.data?.policy.creatorSharePercent}%</strong> of net gift revenue</p><p>Platform share: <strong>{earningsQuery.data?.policy.platformSharePercent}%</strong></p><p>Minimum withdrawal: <strong>UGX {earningsQuery.data?.policy.minimumWithdrawalUGX.toLocaleString()}</strong></p><p>Earnings hold: <strong>{earningsQuery.data?.policy.earningsHoldDays} days</strong></p><p>Provider: <strong>{earningsQuery.data?.policy.paymentProvider}</strong></p><p>Withdrawal policy: <strong>{earningsQuery.data?.policy.withdrawalApprovalMode}</strong></p></div><div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm"><strong>Live payments are disabled.</strong> Existing community gifts are not cash transactions. Your payable balance remains UGX 0 until a real payment is verified by Flutterwave, the ledger is reconciled, and the hold period and payout checks are complete.</div><p className="text-xs text-muted-foreground">{earningsQuery.data?.policy.implementationStatus}</p></>}
        </section>
        <p className="text-xs text-muted-foreground">Stats reflect the latest 20 feed posts returned by the feed API, not lifetime totals.</p>
      </div>
    </div>
  );
}
