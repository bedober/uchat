import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth, loginWithRedirect } from 'zitejs/auth';
import { getMe } from 'zitejs/api';
import { Toaster } from '@project/components/ui/sonner';
import { Loader2 } from 'lucide-react';
import { CallProvider } from './lib/calls';
import Shell from './components/Shell';
import ProfileForm from './components/ProfileForm';
import ChatsPage from './pages/ChatsPage';
import FeedPage from './pages/FeedPage';
import CallsPage from './pages/CallsPage';
import ProfilePage from './pages/ProfilePage';
import PersonPage from './pages/PersonPage';
import SettingsPage from './pages/SettingsPage';
import MarketplacePage from './pages/MarketplacePage';
import SavedPostsPage from './pages/SavedPostsPage';
import CreatorStudioPage from './pages/CreatorStudioPage';

function Splash() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-5 bg-background px-6 py-10 text-foreground">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-xl font-black tracking-tight text-primary-foreground shadow-sm">
        U
      </div>
      <div className="text-center">
        <p className="text-2xl font-extrabold tracking-tight">UChat</p>
        <p className="mt-1 text-sm text-muted-foreground">Your conversations, all together.</p>
      </div>
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label="Loading UChat" />
      <span className="uchat-security-status">
        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
        SECURITY ACTIVE
      </span>
    </div>
  );
}

function SignedIn({ userId }: { userId: string }) {
  const { data, isLoading, refetch } = useQuery({ queryKey: ['me'], queryFn: () => getMe({}) });
  if (isLoading) return <Splash />;
  if (!data?.profile) {
    return (
      <div className="mx-auto flex min-h-full max-w-md flex-col justify-center p-6">
        <h1 className="text-3xl font-extrabold">Welcome to UChat</h1>
        <p className="mb-6 mt-1 text-muted-foreground">Set your name and photo so friends can find you.</p>
        <ProfileForm initial={null} submitLabel="Start chatting" onSaved={() => refetch()} />
      </div>
    );
  }
  return (
    <BrowserRouter>
      <CallProvider me={userId}>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/" element={<ChatsPage />} />
            <Route path="/c/:id" element={<ChatsPage />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/calls" element={<CallsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/saved" element={<SavedPostsPage />} />
            <Route path="/creator" element={<CreatorStudioPage />} />
            <Route path="/u/:id" element={<PersonPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </CallProvider>
    </BrowserRouter>
  );
}

export default function App() {
  const { user, isLoading } = useAuth();
  useEffect(() => {
    if (!isLoading && !user) loginWithRedirect();
  }, [isLoading, user]);

  return (
    <>
      {isLoading || !user ? <Splash /> : <SignedIn userId={user.id} />}
      <Toaster />
    </>
  );
}
