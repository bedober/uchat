import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { getStoredApiKey } from '../lib/credentials';

const supported = ['en', 'lg', 'sw', 'ach', 'fr'] as const;

export default createEndpoint({
  description: 'Translate a user-selected post or message into their chosen language',
  authenticated: true,
  inputSchema: z.object({
    text: z.string().min(1).max(3000),
    target: z.enum(supported),
    source: z.enum(supported).optional(),
  }),
  outputSchema: z.object({ translatedText: z.string(), target: z.string() }),
  execute: async ({ input }) => {
    const text = input.text.trim();
    if (!text) throw new Error('Enter text to translate');
    if (input.target === (input.source ?? 'en')) return { translatedText: text, target: input.target };
    // If an administrator saved a Google Cloud Translation key, use it server-side.
    // Fall back to MyMemory when no key is configured or the provider does not support this language pair.
    try {
      const googleKey = await getStoredApiKey('google_cloud_translation');
      if (googleKey) {
        const response = await fetch('https://translation.googleapis.com/language/translate/v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-goog-api-key': googleKey },
          body: JSON.stringify({ q: text, target: input.target, source: input.source ?? 'en', format: 'text' }),
        });
        if (response.ok) {
          const payload = await response.json() as { data?: { translations?: Array<{ translatedText?: string }> } };
          const translatedText = payload.data?.translations?.[0]?.translatedText;
          if (translatedText) return { translatedText, target: input.target };
        }
      }
    } catch {
      // Keep the free fallback available if the optional paid integration is not configured correctly.
    }

    const params = new URLSearchParams({
      q: text,
      langpair: (input.source ?? 'en') + '|' + input.target,
    });
    const response = await fetch('https://api.mymemory.translated.net/get?' + params.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('Translation service is temporarily unavailable');
    const payload = await response.json() as { responseStatus?: number; responseData?: { translatedText?: string } };
    const translatedText = payload.responseData?.translatedText;
    if (!translatedText || payload.responseStatus !== 200) {
      throw new Error('Could not translate this text. Try another language or shorter text.');
    }
    return { translatedText, target: input.target };
  },
});
