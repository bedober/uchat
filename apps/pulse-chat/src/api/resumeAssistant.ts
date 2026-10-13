import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createEndpoint } from 'zitejs/backend';
import { integrations } from 'zitejs/integrations';
import { resumeSchema } from '../lib/resume';

const SYSTEM = `You are a friendly career assistant inside the Pulse app. Interview the user to build their resume profile.
Ask ONE short question at a time (role/headline, location, work experience with dates and what they did, education, skills, website, a short "about").
Write warmly and concisely. After every turn, update the resume draft with everything learned so far, polishing wording professionally but never inventing facts.
Respond ONLY with JSON: {"reply": string, "resume": {"headline": string, "location": string, "about": string, "website": string, "skills": string[], "experience": [{"title","org","start","end","description"}], "education": [{"school","degree","start","end"}]}}. Use "" for unknown values and an empty end for current roles.`;

export default createEndpoint({
  description: 'Chats with the AI assistant to draft the signed-in user\'s resume',
  authenticated: true,
  inputSchema: z.object({
    messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })),
    draft: resumeSchema,
  }),
  outputSchema: z.object({ reply: z.string(), resume: resumeSchema }),
  execute: async ({ input, context }) => {
    const { accessToken } = await integrations.get('gemini');
    const model = new GoogleGenerativeAI(accessToken).getGenerativeModel({
      model: 'gemini-3.5-flash-lite',
      systemInstruction: `${SYSTEM}\n\nUser's name: ${context.user.firstName ?? ''} ${context.user.lastName ?? ''}. Current draft: ${JSON.stringify(input.draft)}`,
      generationConfig: { responseMimeType: 'application/json' },
    });
    const msgs = input.messages.slice(-30).filter((m, i, a) => a.slice(0, i + 1).some((x) => x.role === 'user'));
    const result = await model.generateContent({
      contents: msgs.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    });
    const out = result.response.text();
    const json = out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1) || '{}';
    const raw = JSON.parse(json);
    const r = raw.resume && typeof raw.resume === 'object' ? raw.resume : {};
    const s = (v: unknown, d = '') => (typeof v === 'string' ? v : v == null ? d : String(v));
    const arr = (v: unknown): any[] => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []);
    const d = input.draft;
    const resume = {
      headline: s(r.headline, d.headline),
      location: s(r.location, d.location),
      about: s(r.about, d.about),
      website: s(r.website, d.website),
      skills: Array.isArray(r.skills) ? r.skills.map((x: unknown) => s(x)).filter(Boolean)
        : typeof r.skills === 'string' ? r.skills.split(',').map((x: string) => x.trim()).filter(Boolean) : d.skills,
      experience: Array.isArray(r.experience) ? arr(r.experience).map((e) => ({ title: s(e.title), org: s(e.org), start: s(e.start), end: s(e.end), description: s(e.description) })) : d.experience,
      education: Array.isArray(r.education) ? arr(r.education).map((e) => ({ school: s(e.school), degree: s(e.degree), start: s(e.start), end: s(e.end) })) : d.education,
    };
    return {
      reply: typeof raw.reply === 'string' ? raw.reply : 'Could you tell me a bit more?',
      resume,
    };
  },
});
