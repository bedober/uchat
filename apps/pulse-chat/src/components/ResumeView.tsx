import { GetMeOutputType } from 'zitejs/api';
import { Briefcase, GraduationCap, Globe, MapPin } from 'lucide-react';
import { Badge } from '@project/components/ui/badge';
import PersonAvatar from './PersonAvatar';

export type Resume = NonNullable<GetMeOutputType['profile']>['resume'];

function Section({ title, icon: Icon, children }: { title: string; icon?: typeof Briefcase; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-4 w-4" />}{title}
      </h2>
      {children}
    </section>
  );
}

const range = (s: string, e: string) => [s, e || (s ? 'Present' : '')].filter(Boolean).join(' – ');

type Props = { name: string; image: string | null; status?: string | null; resume: Resume; actions?: React.ReactNode; postCount?: number };

export default function ResumeView({ name, image, status, resume, actions, postCount }: Props) {
  const empty = !resume.about && !resume.skills.length && !resume.experience.length && !resume.education.length;
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="h-24 bg-gradient-to-r from-primary to-secondary" />
        <div className="px-5 pb-5">
          <PersonAvatar name={name} image={image} className="-mt-10 h-20 w-20 border-4 border-card text-2xl" />
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold">{name}</h1>
              {resume.headline && <p className="font-medium">{resume.headline}</p>}
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {resume.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{resume.location}</span>}
                {resume.website && <a href={resume.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline"><Globe className="h-3.5 w-3.5" />{resume.website.replace(/^https?:\/\//, '')}</a>}
                {postCount !== undefined && <span>{postCount} posts</span>}
              </div>
              {status && <p className="mt-2 text-sm italic text-muted-foreground">“{status}”</p>}
            </div>
            {actions}
          </div>
        </div>
      </div>
      {empty && <p className="py-6 text-center text-sm text-muted-foreground">No resume details yet.</p>}
      {resume.about && <Section title="About"><p className="whitespace-pre-wrap text-[15px] leading-relaxed">{resume.about}</p></Section>}
      {resume.experience.length > 0 && (
        <Section title="Experience" icon={Briefcase}>
          <ol className="space-y-4 border-l-2 border-accent pl-4">
            {resume.experience.map((e, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[23px] top-1.5 h-3 w-3 rounded-full bg-primary" />
                <p className="font-semibold">{e.title}</p>
                <p className="text-sm">{e.org}</p>
                <p className="text-xs text-muted-foreground">{range(e.start, e.end)}</p>
                {e.description && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{e.description}</p>}
              </li>
            ))}
          </ol>
        </Section>
      )}
      {resume.education.length > 0 && (
        <Section title="Education" icon={GraduationCap}>
          <ul className="space-y-3">
            {resume.education.map((e, i) => (
              <li key={i}>
                <p className="font-semibold">{e.school}</p>
                {e.degree && <p className="text-sm">{e.degree}</p>}
                <p className="text-xs text-muted-foreground">{range(e.start, e.end)}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {resume.skills.length > 0 && (
        <Section title="Skills">
          <div className="flex flex-wrap gap-2">{resume.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</div>
        </Section>
      )}
    </div>
  );
}
