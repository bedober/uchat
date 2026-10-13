import { useState } from 'react';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { useUpload } from 'zitejs/upload';
import { saveProfile } from 'zitejs/api';
import { toast } from 'sonner';
import { Camera, Loader2 } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import PersonAvatar from './PersonAvatar';
import { prepareImage } from '../lib/image';
import { errMsg } from '../lib/format';

const schema = z.object({
  displayName: z.string().trim().min(2, 'At least 2 characters').max(40, 'At most 40 characters'),
  status: z.string().max(80, 'At most 80 characters'),
});

type Initial = { displayName: string; status: string; avatarUrl: string | null } | null;

export default function ProfileForm({ initial, submitLabel, onSaved }: { initial: Initial; submitLabel: string; onSaved?: () => void }) {
  const [displayName, setName] = useState(initial?.displayName ?? '');
  const [status, setStatus] = useState(initial?.status ?? '');
  const [avatarUrl, setAvatar] = useState(initial?.avatarUrl ?? null);
  const [saving, setSaving] = useState(false);
  const { upload, isUploading } = useUpload();
  const qc = useQueryClient();
  const parsed = schema.safeParse({ displayName, status });
  const errors = parsed.success ? {} : parsed.error.flatten().fieldErrors;

  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      e.target.value = '';
      setAvatar((await upload(await prepareImage(file))).url);
    } catch (err) {
      toast.error(`Photo upload failed: ${errMsg(err)}`);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsed.success) return;
    setSaving(true);
    try {
      await saveProfile({ displayName, status, avatarUrl });
      await qc.invalidateQueries({ queryKey: ['me'] });
      toast.success('Profile saved');
      onSaved?.();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
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
      <div className="space-y-1.5">
        <Label htmlFor="dn">Display name</Label>
        <Input id="dn" value={displayName} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        {displayName && errors.displayName && <p className="text-xs text-destructive">{errors.displayName[0]}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="st">Status</Label>
        <Input id="st" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="In the studio 🎙️" />
        {errors.status && <p className="text-xs text-destructive">{errors.status[0]}</p>}
      </div>
      <Button type="submit" disabled={!parsed.success || saving || isUploading} className="w-full sm:w-auto">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}
