import { z } from 'zod';

export const experienceSchema = z.object({
  title: z.string(),
  org: z.string(),
  start: z.string(),
  end: z.string(),
  description: z.string(),
});
export const educationSchema = z.object({
  school: z.string(),
  degree: z.string(),
  start: z.string(),
  end: z.string(),
});
export const resumeSchema = z.object({
  headline: z.string(),
  location: z.string(),
  about: z.string(),
  website: z.string(),
  skills: z.array(z.string()),
  experience: z.array(experienceSchema),
  education: z.array(educationSchema),
});
export type Resume = z.infer<typeof resumeSchema>;

function parseList<T>(raw: string | undefined, schema: z.ZodType<T>): T[] {
  try {
    const v = JSON.parse(raw || '[]');
    return Array.isArray(v) ? v.filter((x) => schema.safeParse(x).success) : [];
  } catch {
    return [];
  }
}

type Row = { headline?: string; location?: string; about?: string; website?: string; skills?: string; experience?: string; education?: string };

export function readResume(p: Row | undefined): Resume {
  return {
    headline: p?.headline ?? '',
    location: p?.location ?? '',
    about: p?.about ?? '',
    website: p?.website ?? '',
    skills: (p?.skills ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    experience: parseList(p?.experience, experienceSchema),
    education: parseList(p?.education, educationSchema),
  };
}

export function writeResume(r: Resume) {
  const website = r.website.trim();
  return {
    headline: r.headline.trim().slice(0, 120) || null,
    location: r.location.trim().slice(0, 80) || null,
    about: r.about.trim().slice(0, 3000) || null,
    website: website ? (/^https?:\/\//i.test(website) ? website : `https://${website}`) : null,
    skills: r.skills.map((s) => s.trim()).filter(Boolean).slice(0, 40).join(', ') || null,
    experience: JSON.stringify(r.experience.filter((e) => e.title.trim() || e.org.trim()).slice(0, 30)),
    education: JSON.stringify(r.education.filter((e) => e.school.trim()).slice(0, 20)),
  };
}
