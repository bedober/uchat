import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMe, GetMeOutputType } from 'zitejs/api';
import { useAuth, logout } from 'zitejs/auth';
import { Download, LogOut, Share2, Sparkles } from 'lucide-react';
import { shareLink } from '../lib/share';
import { toast } from 'sonner';
import { downloadResume } from '../lib/downloadResume';
import { Button } from '@project/components/ui/button';
import { Skeleton } from '@project/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import ResumeView from '../components/ResumeView';
import ResumeEditor from '../components/ResumeEditor';
import ResumeAssistant from '../components/ResumeAssistant';

type Resume = NonNullable<GetMeOutputType['profile']>['resume'];

export default function ProfilePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('resume');
  const [aiDraft, setAiDraft] = useState<Resume | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['me'], queryFn: () => getMe({}) });
  const profile = data?.profile;
  const editing = profile && aiDraft ? { ...profile, resume: aiDraft } : profile;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl p-4 md:p-6">
        {isLoading || !profile || !editing ? <Skeleton className="h-96 w-full rounded-2xl" /> : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4 flex-wrap">
              <TabsTrigger value="resume">My resume</TabsTrigger>
              <TabsTrigger value="ai"><Sparkles className="mr-1 h-3.5 w-3.5" />AI assistant</TabsTrigger>
              <TabsTrigger value="edit">Edit profile</TabsTrigger>
            </TabsList>
            <TabsContent value="resume">
              <ResumeView name={profile.displayName} image={profile.avatarUrl} status={profile.status} resume={profile.resume}
                actions={<div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setTab('ai')}><Sparkles className="mr-1 h-4 w-4" />Build with AI</Button>
                  <Button variant="outline" size="sm" onClick={() => setTab('edit')}>Edit</Button>
                  <Button size="sm" onClick={() => {
                    if (!downloadResume(profile.displayName, user?.email, profile.resume)) toast.error('Allow pop-ups to download your resume');
                  }}><Download className="mr-1 h-4 w-4" />Download PDF</Button>
                  <Button variant="outline" size="sm" onClick={() => user && shareLink(`${profile.displayName} – Resume`,
                    `Check out ${profile.displayName}'s profile on UChat${profile.resume.headline ? ` — ${profile.resume.headline}` : ''}`, `/u/${user.id}`)}>
                    <Share2 className="mr-1 h-4 w-4" />Share</Button>
                </div>} />
            </TabsContent>
            <TabsContent value="ai" forceMount className="data-[state=inactive]:hidden">
              <ResumeAssistant profile={profile} onUse={(r) => { setAiDraft(r); setTab('edit'); }} />
            </TabsContent>
            <TabsContent value="edit">
              {aiDraft && <p className="mb-4 rounded-lg bg-accent px-3 py-2 text-sm">Draft from the AI assistant — check it over, then save.</p>}
              <ResumeEditor key={JSON.stringify(editing.resume)} profile={editing}
                onSaved={() => { setAiDraft(null); setTab('resume'); }} />
            </TabsContent>
          </Tabs>
        )}
        {profile && (
          <div className="mt-8 flex items-center justify-between border-t pt-4">
            <span className="truncate text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={() => logout()}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
          </div>
        )}
      </div>
    </div>
  );
}
