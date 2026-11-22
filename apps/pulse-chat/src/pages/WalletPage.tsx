import { Wallet } from 'lucide-react';

export default function WalletPage() {
  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col gap-5 overflow-y-auto px-4 py-6 sm:px-6">
      <header>
        <p className="uchat-eyebrow">YOUR MONEY</p>
        <h1 className="uchat-page-title">Wallet</h1>
        <p className="uchat-page-description">Manage your UChat wallet and transactions.</p>
      </header>
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2 text-primary"><Wallet className="h-5 w-5" /><span className="text-sm font-semibold">Wallet overview</span></div>
        <p className="text-sm text-muted-foreground">Your wallet balance and transaction history will appear here when wallet services are connected.</p>
      </section>
    </div>
  );
}
