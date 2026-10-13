import { useState } from 'react';
import { useUpload } from 'zitejs/upload';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createListing, listMarketplace, submitReport } from 'zitejs/api';
import { toast } from 'sonner';
import { BriefcaseBusiness, Flag, ImagePlus, MessageCircle, Plus, Search, ShoppingBag, Tag } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Textarea } from '@project/components/ui/textarea';
import { Label } from '@project/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import PersonAvatar from '../components/PersonAvatar';

const categories = ['All', 'Product', 'Service', 'Job opportunity'] as const;
type Category = typeof categories[number];

export default function MarketplacePage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('All');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [kind, setKind] = useState<'Product' | 'Service' | 'Job opportunity'>('Product');
  const [contact, setContact] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const { upload } = useUpload();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['marketplace', category, search],
    queryFn: () => listMarketplace({ category: category === 'All' ? undefined : category, search: search.trim() || undefined }),
  });

  const create = useMutation({
    mutationFn: async () => {
      const uploaded = photo ? await upload(photo) : null;
      return createListing({
        title,
        description,
        priceUgx: Number(price || 0),
        category: kind,
        contact,
        photoUrl: uploaded?.url,
        photoName: photo?.name,
      });
    },
    onSuccess: async () => {
      toast.success('Your listing is live');
      setTitle('');
      setDescription('');
      setPrice('');
      setContact('');
      setPhoto(null);
      setShowForm(false);
      await qc.invalidateQueries({ queryKey: ['marketplace'] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not publish listing'),
  });

  const formatPrice = (amount: number) => amount <= 0 ? 'Contact for price' : 'UGX ' + new Intl.NumberFormat('en-UG').format(amount);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-5 p-4 pb-10 md:p-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Community commerce</p>
            <h1 className="mt-1 text-2xl font-extrabold">Marketplace</h1>
            <p className="mt-1 text-sm text-muted-foreground">Find local products, services, and job opportunities from the community.</p>
          </div>
          <Button onClick={() => setShowForm((v) => !v)}><Plus className="mr-1.5 h-4 w-4" />{showForm ? 'Close' : 'Sell or offer'}</Button>
        </header>

        {showForm && (
          <form className="space-y-4 rounded-2xl border bg-card p-4" onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}>
            <h2 className="font-bold">Create a listing</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="listing-title">Title</Label>
                <Input id="listing-title" required minLength={3} maxLength={90} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Phone repair service" />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={kind} onValueChange={(v: 'Product' | 'Service' | 'Job opportunity') => setKind(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Product">Product</SelectItem>
                    <SelectItem value="Service">Service</SelectItem>
                    <SelectItem value="Job opportunity">Job opportunity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="listing-price">Price in UGX (optional)</Label>
                <Input id="listing-price" type="number" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0 for contact seller" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="listing-contact">Contact / WhatsApp</Label>
                <Input id="listing-contact" required maxLength={100} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Your phone number or contact handle" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="listing-photo">Listing photo (optional)</Label>
              <Input id="listing-photo" type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
              {photo && <p className="text-xs text-muted-foreground">Selected: {photo.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="listing-description">Description</Label>
              <Textarea id="listing-description" required minLength={5} maxLength={1500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what you're offering..." />
            </div>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Publishing...' : 'Publish listing'}</Button>
          </form>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products, services, jobs..." />
          </div>
          <Select value={category} onValueChange={(v: Category) => setCategory(v)}>
            <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
            <SelectContent>{categories.map((item) => <SelectItem key={item} value={item}>{item === 'All' ? 'All categories' : item}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {query.isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Loading listings...</p>}
        {query.isError && <p className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">Marketplace could not load. Please try again.</p>}
        {!query.isLoading && !query.isError && (query.data?.listings.length ?? 0) === 0 && (
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <ShoppingBag className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <h2 className="font-semibold">No listings yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">Be the first to list a product, service, or opportunity.</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {query.data?.listings.map((listing) => {
            let digits = listing.contact.replace(/\D/g, '');
            if (digits.startsWith('0')) digits = '256' + digits.slice(1);
            else if (digits.length === 9 && digits.startsWith('7')) digits = '256' + digits;
            const whatsapp = digits.length >= 8 ? 'https://wa.me/' + digits : null;
            return (
              <article key={listing.id} className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
                {listing.photoUrl && <img src={listing.photoUrl} alt={listing.title} loading="lazy" className="max-h-64 w-full rounded-xl object-cover" />}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"><Tag className="h-3 w-3" />{listing.category}</span>
                    <h2 className="mt-2 break-words text-lg font-bold">{listing.title}</h2>
                  </div>
                  <BriefcaseBusiness className="h-5 w-5 shrink-0 text-muted-foreground" />
                </div>
                <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{listing.description}</p>
                <p className="text-lg font-extrabold">{formatPrice(listing.priceUgx)}</p>
                <div className="flex items-center gap-2 border-t pt-3">
                  <PersonAvatar name={listing.seller.name} image={listing.seller.image} className="h-8 w-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{listing.seller.name}</p>
                    <p className="text-xs text-muted-foreground">Community seller</p>
                  </div>
                  <Button size="sm" variant="ghost" aria-label="Report listing" onClick={async () => {
                    const reason = window.prompt('Report reason: spam, scam, harassment, impersonation, unsafe, or other', 'scam');
                    if (!reason) return;
                    const normalized = reason.trim().toLowerCase();
                    if (!['spam', 'scam', 'harassment', 'impersonation', 'unsafe', 'other'].includes(normalized)) { toast.error('Choose a valid report reason'); return; }
                    try {
                      await submitReport({ targetId: listing.id, targetType: 'listing', reason: normalized as 'spam' | 'scam' | 'harassment' | 'impersonation' | 'unsafe' | 'other' });
                      toast.success('Report submitted for review');
                    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not submit report'); }
                  }}><Flag className="h-4 w-4" /></Button>
                  {whatsapp ? (
                    <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"><MessageCircle className="mr-1.5 h-4 w-4" />Contact</a>
                  ) : <span className="max-w-32 break-all text-xs text-muted-foreground">{listing.contact}</span>}
                </div>
              </article>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">Listings are community-posted. Verify sellers and agree on safe payment and delivery before sending money.</p>
      </div>
    </div>
  );
}
