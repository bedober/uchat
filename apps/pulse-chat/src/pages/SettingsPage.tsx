import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSafety, updateSafety, getFollowData, manageFollow, getPushConfig, savePushSubscription, deletePushSubscription } from 'zitejs/api';
import { Bell, Languages, Leaf, LockKeyhole, Save, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { Label } from '@project/components/ui/label';
import { Switch } from '@project/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';

type Preferences = {
  lowData: boolean;
  language: 'en' | 'lg' | 'sw' | 'ach' | 'fr';
  feedOrder: 'newest' | 'popular';
  quietNotifications: boolean;
  profileVisibility: 'public' | 'private';
};

const defaults: Preferences = {
  lowData: false,
  language: 'en',
  feedOrder: 'newest',
  quietNotifications: false,
  profileVisibility: 'public',
};

function loadLocal(): Partial<Preferences> {
  try {
    const raw = JSON.parse(localStorage.getItem('uchat-preferences') || '{}');
    return {
      lowData: localStorage.getItem('uchat-low-data') === 'true',
      feedOrder: localStorage.getItem('uchat-feed-order') === 'popular' ? 'popular' : 'newest',
      ...raw,
    };
  } catch { return defaults; }
}

function decodeVapidKey(value: string): ArrayBuffer {
  const padded = value + '='.repeat((4 - value.length % 4) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const bytes = Uint8Array.from(raw, (char) => char.charCodeAt(0));
  return bytes.buffer as ArrayBuffer;
}

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<Preferences>({ ...defaults, ...loadLocal() });
  const [saving, setSaving] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported] = useState(() => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);
  const safety = useQuery({ queryKey: ['safety'], queryFn: () => getSafety({}) });
  const followData = useQuery({ queryKey: ['follow-data'], queryFn: () => getFollowData({}) });

  useEffect(() => {
    if (!safety.data) return;
    setPrefs((old) => ({
      ...old,
      language: safety.data.preferredLanguage as Preferences['language'],
      quietNotifications: safety.data.quietNotifications,
      profileVisibility: safety.data.profileVisibility as Preferences['profileVisibility'],
    }));
  }, [safety.data]);

  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) => setPrefs((old) => ({ ...old, [key]: value }));

  useEffect(() => {
    if (!pushSupported) return;
    navigator.serviceWorker.getRegistration('/').then(async (registration) => {
      const subscription = await registration?.pushManager.getSubscription();
      setPushEnabled(Boolean(subscription) && Notification.permission === 'granted');
    }).catch(() => setPushEnabled(false));
  }, [pushSupported]);

  const enablePush = async () => {
    if (!pushSupported) { toast.error('This browser does not support web push notifications.'); return; }
    setPushBusy(true);
    try {
      const config = await getPushConfig({});
      if (!config.enabled || !config.publicKey) throw new Error('Push is not configured yet. Ask the UChat admin to generate VAPID keys in the Admin Dashboard.');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Notification permission was not granted.');
      const registration = await navigator.serviceWorker.register('/sw.js');
      const current = await registration.pushManager.getSubscription();
      const subscription = current ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidKey(config.publicKey) });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error('The browser returned an incomplete push subscription.');
      await savePushSubscription({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
      setPushEnabled(true);
      toast.success('Push notifications enabled on this browser.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not enable push notifications.'); }
    finally { setPushBusy(false); }
  };

  const disablePush = async () => {
    setPushBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await deletePushSubscription({ endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setPushEnabled(false);
      toast.success('Push notifications disabled on this browser.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not disable push notifications.'); }
    finally { setPushBusy(false); }
  };

  const handleFollowRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      await manageFollow({ action, requestId });
      await followData.refetch();
      toast.success(action === 'approve' ? 'Follow request approved' : 'Follow request declined');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update follow request'); }
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateSafety({
        profileVisibility: prefs.profileVisibility,
        quietNotifications: prefs.quietNotifications,
        preferredLanguage: prefs.language,
      });
      localStorage.setItem('uchat-preferences', JSON.stringify(prefs));
      localStorage.setItem('uchat-low-data', String(prefs.lowData));
      localStorage.setItem('uchat-feed-order', prefs.feedOrder);
      window.dispatchEvent(new CustomEvent('uchat-preferences-changed'));
      await safety.refetch();
      toast.success('Preferences saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save preferences');
    } finally { setSaving(false); }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-6 p-4 pb-10 md:p-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Your experience</p>
          <h1 className="mt-1 text-2xl font-extrabold">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Control your feed, data use, language, and account visibility.</p>
        </header>

        <section className="space-y-4 rounded-2xl border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary"><Leaf className="h-5 w-5" /></div>
            <div className="flex-1"><h2 className="font-semibold">Save data</h2><p className="text-sm text-muted-foreground">Keep feed photos and videos unloaded until you choose to view them.</p></div>
            <Switch checked={prefs.lowData} onCheckedChange={(v) => update('lowData', v)} aria-label="Enable low-data mode" />
          </div>
          <div className="flex items-start gap-3 border-t pt-4">
            <div className="rounded-xl bg-primary/10 p-2 text-primary"><SlidersHorizontal className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1"><Label>Feed order</Label><p className="mb-2 text-sm text-muted-foreground">Choose how posts are arranged in your feed.</p>
              <Select value={prefs.feedOrder} onValueChange={(v: 'newest' | 'popular') => update('feedOrder', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Newest first</SelectItem><SelectItem value="popular">Most liked first (loaded posts)</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary"><Languages className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1"><Label>Preferred language</Label><p className="mb-2 text-sm text-muted-foreground">Translate posts and messages into this language when you tap Translate.</p>
              <Select value={prefs.language} onValueChange={(v: Preferences['language']) => update('language', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                  <SelectItem value="en">English</SelectItem><SelectItem value="lg">Luganda</SelectItem><SelectItem value="sw">Kiswahili</SelectItem><SelectItem value="ach">Acholi</SelectItem><SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-start gap-3 border-t pt-4">
            <div className="rounded-xl bg-primary/10 p-2 text-primary"><Bell className="h-5 w-5" /></div>
            <div className="flex-1"><h2 className="font-semibold">Quiet notifications</h2><p className="text-sm text-muted-foreground">When enabled, UChat will not send you push alerts for new messages.</p></div>
            <Switch checked={prefs.quietNotifications} onCheckedChange={(v) => update('quietNotifications', v)} aria-label="Quiet notifications preference" />
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <div className="flex items-start gap-3"><div className="rounded-xl bg-primary/10 p-2 text-primary"><Bell className="h-5 w-5" /></div><div className="flex-1"><h2 className="font-semibold">Browser push notifications</h2><p className="text-sm text-muted-foreground">Receive new-message alerts when UChat is not open. Your browser must allow notifications. On Android, Chrome works best; iPhone support depends on installing the site to the Home Screen.</p><p className="mt-1 text-xs text-muted-foreground">Status: {pushSupported ? (pushEnabled ? 'Enabled on this browser' : 'Not enabled') : 'Not supported in this browser'}.</p></div></div>
          {pushEnabled ? <Button variant="outline" onClick={disablePush} disabled={pushBusy}>{pushBusy ? 'Updating…' : 'Disable on this browser'}</Button> : <Button onClick={enablePush} disabled={!pushSupported || pushBusy}>{pushBusy ? 'Enabling…' : 'Enable push notifications'}</Button>}
        </section>

        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <div className="flex items-start gap-3"><div className="rounded-xl bg-primary/10 p-2 text-primary"><ShieldCheck className="h-5 w-5" /></div><div><h2 className="font-semibold">Profile visibility</h2><p className="text-sm text-muted-foreground">Private profiles should only be visible to approved connections. Public is the current default.</p></div></div>
          <Select value={prefs.profileVisibility} onValueChange={(v: 'public' | 'private') => update('profileVisibility', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="public">Public profile</SelectItem><SelectItem value="private">Private profile</SelectItem></SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">This preference is stored in your account. Enforcement across every public profile endpoint is still being completed.</p>
        </section>

        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <div><h2 className="font-semibold">Follow requests</h2><p className="text-sm text-muted-foreground">Approve or decline people requesting access to your private profile.</p></div>
          {!followData.data?.incoming.length ? <p className="text-sm text-muted-foreground">No pending requests.</p> : followData.data.incoming.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"><div className="min-w-0"><p className="text-sm font-semibold">Follow request</p><p className="break-all text-xs text-muted-foreground">Account ID: {request.followerId}</p></div><div className="flex gap-2"><Button size="sm" onClick={() => handleFollowRequest(request.id, 'approve')}>Approve</Button><Button size="sm" variant="outline" onClick={() => handleFollowRequest(request.id, 'reject')}>Decline</Button></div></div>)}
        </section>

        <Button onClick={save} disabled={saving || safety.isLoading} className="w-full sm:w-auto"><Save className="mr-2 h-4 w-4" />{saving ? 'Saving…' : 'Save preferences'}</Button>
        <p className="flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5" />Account safety settings sync to your account; feed and low-data settings are saved in this browser.</p>
      </div>
    </div>
  );
}
