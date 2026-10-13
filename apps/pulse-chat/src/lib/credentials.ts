import { createDecipheriv, createHash } from 'node:crypto';
import { createTableClient } from 'zitejs/runtime';

type Credential = { id: string; serviceKey?: string; encryptedValue?: string; iv?: string };
type CredentialInput = { serviceKey: string | null; provider: string | null; encryptedValue: string | null; iv: string | null; updatedBy: string | null; lastUpdated: string | null };
const credentials = createTableClient<Credential, CredentialInput>('UchatApiCredentials');

/** Server-only credential lookup. Never return this value from an API endpoint. */
export async function getStoredApiKey(serviceKey: string): Promise<string | undefined> {
  const record = await credentials.findOne({ filters: { serviceKey } });
  if (!record) return undefined;
  const secret = process.env.ZITE_UCHAT_CREDENTIAL_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) throw new Error('The API credential vault is locked. Configure ZITE_UCHAT_CREDENTIAL_ENCRYPTION_KEY in server Secrets.');
  if (!record.encryptedValue || !record.iv) throw new Error('Saved API credential is incomplete');
  const [ivPart, tagPart] = record.iv.split(':');
  if (!ivPart || !tagPart) throw new Error('Saved API credential has an invalid encryption marker');
  const key = createHash('sha256').update(secret).digest();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivPart, 'base64'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(record.encryptedValue, 'base64')), decipher.final()]).toString('utf8');
}
