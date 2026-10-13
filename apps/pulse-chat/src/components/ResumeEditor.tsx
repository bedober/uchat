import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { GetMeOutputType, saveProfile } from 'zitejs/api';
import { toast } from 'sonner';
import { Camera, Loader2, Plus, Trash2 } from 'lucide-react';
import { useUpload } from 'zitejs/upload';
import PersonAvatar from './PersonAvatar';
import { prepareImage } from '../lib/image';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Textarea } from '@project/components/ui/textarea';
import { errMsg } from '../lib/format';
import type { Resume } from './ResumeView';

type Profile = NonNullable<GetMeOutputType['profile']>;
const blankExp = { title: '', org: '', start: '', end: '', description: '' };
const blankEdu = { school: '', degree: '', start: '', end: '' };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

export default function ResumeEditor({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
  const [r, setR] = useState<Resume>(profile.resume);
  const [skills, setSkills] = useState(profile.resume.skills.join(', '));
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const set = <K extends keyof Resume>(k: K, v: Resume[K]) => setR((x) => ({ ...x, [k]: v }));
  const setExp = (i: number, k: keyof typeof blankExp, v: string) =>
    set('experience', r.experience.map((e, j) => (j === i ? { ...e, [k]: v } : e)));
  const setEdu = (i: number, k: keyof typeof blankEdu, v: string) =>
    set('education', r.education.map((e, j) => (j === i ? { ...e, [k]: v } : e)));
  const [displayName, setName] = useState(profile.displayName);
  const [status, setStatus] = useState(profile.status);
  const [avatarUrl, setAvatar] = useState(profile.avatarUrl);
  const { upload, isUploading } = useUpload();
  const nameErr = displayName.trim().length < 2 || displayName.trim().length > 40;
  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try { setAvatar((await upload(await prepareImage(file))).url); toast.success('Photo ready — tap Save profile'); }
    catch (err) { toast.error(`Photo upload failed: ${errMsg(err)}`); }
  };
  const missingTitle = r.experience.some((e) => (e.org.trim() || e.description.trim()) && !e.title.trim());
  const missingSchool = r.education.some((e) => e.degree.trim() && !e.school.trim());

  const save = async () => {
    setSaving(true);
    try {
      await saveProfile({
        displayName: displayName.trim(),
        status,
        avatarUrl,
        resume: { ...r, skills: skills.split(',').map((s) => s.trim()).filter(Boolean) },
      });
      await qc.invalidateQueries({ queryKey: ['me'] });
      toast.success('Profile saved');
      onSaved();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <label className="flex w-fit cursor-pointer items-center gap-4">
        <div className="relative">
          <PersonAvatar name={displayName || '?'} image={avatarUrl} className="h-20 w-20 text-xl" />
          <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </span>
        </div>
        <span className="text-sm font-semibold text-primary">Change photo</span>
        <input type="file" accept="image/*" className="hidden" onChange={pickPhoto} disabled={isUploading} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Display name *">
          <Input value={displayName} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          {nameErr && <p className="text-xs text-destructive">Name must be 2–40 characters.</p>}
        </Field>
        <Field label="Status"><Input value={status} maxLength={80} onChange={(e) => setStatus(e.target.value)} placeholder="In the studio 🎙️" /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Headline"><Input value={r.headline} maxLength={120} onChange={(e) => set('headline', e.target.value)} placeholder="Singer, songwriter & producer" /></Field>
        <Field label="Location"><Input value={r.location} maxLength={80} onChange={(e) => set('location', e.target.value)} placeholder="Kampala, Uganda" /></Field>
        <Field label="Website"><Input value={r.website} onChange={(e) => set('website', e.target.value)} placeholder="yoursite.com" /></Field>
        <Field label="Skills (comma separated)"><Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Vocals, Mixing, Songwriting" /></Field>
      </div>
      <Field label="About"><Textarea value={r.about} maxLength={3000} rows={5} onChange={(e) => set('about', e.target.value)} placeholder="Tell people about yourself" /></Field>

      <div className="space-y-3">
        <div className="flex items-center justify-between"><h3 className="font-bold">Experience</h3>
          <Button variant="outline" size="sm" onClick={() => set('experience', [...r.experience, { ...blankExp }])}><Plus className="mr-1 h-4 w-4" />Add</Button></div>
        {r.experience.map((e, i) => (
          <div key={i} className="space-y-3 rounded-xl border p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input value={e.title} onChange={(x) => setExp(i, 'title', x.target.value)} placeholder="Role / title *" />
              <Input value={e.org} onChange={(x) => setExp(i, 'org', x.target.value)} placeholder="Company / organization" />
              <Input value={e.start} onChange={(x) => setExp(i, 'start', x.target.value)} placeholder="Start (e.g. Jan 2022)" />
              <Input value={e.end} onChange={(x) => setExp(i, 'end', x.target.value)} placeholder="End (blank = Present)" />
            </div>
            <Textarea value={e.description} rows={3} onChange={(x) => setExp(i, 'description', x.target.value)} placeholder="What did you do?" />
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => set('experience', r.experience.filter((_, j) => j !== i))}><Trash2 className="mr-1 h-4 w-4" />Remove</Button>
          </div>
        ))}
        {missingTitle && <p className="text-xs text-destructive">Each experience needs a role / title.</p>}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between"><h3 className="font-bold">Education</h3>
          <Button variant="outline" size="sm" onClick={() => set('education', [...r.education, { ...blankEdu }])}><Plus className="mr-1 h-4 w-4" />Add</Button></div>
        {r.education.map((e, i) => (
          <div key={i} className="space-y-3 rounded-xl border p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input value={e.school} onChange={(x) => setEdu(i, 'school', x.target.value)} placeholder="School *" />
              <Input value={e.degree} onChange={(x) => setEdu(i, 'degree', x.target.value)} placeholder="Degree / course" />
              <Input value={e.start} onChange={(x) => setEdu(i, 'start', x.target.value)} placeholder="Start year" />
              <Input value={e.end} onChange={(x) => setEdu(i, 'end', x.target.value)} placeholder="End year" />
            </div>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => set('education', r.education.filter((_, j) => j !== i))}><Trash2 className="mr-1 h-4 w-4" />Remove</Button>
          </div>
        ))}
        {missingSchool && <p className="text-xs text-destructive">Each education entry needs a school.</p>}
      </div>

      <Button onClick={save} disabled={saving || isUploading || nameErr || missingTitle || missingSchool}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save profile
      </Button>
    </div>
  );
}
