import { createECDH, createHmac, createPrivateKey, createCipheriv, randomBytes, createSign } from 'node:crypto';
import { createTableClient } from 'zitejs/runtime';
import { getStoredApiKey } from './credentials';

type PushSubscriptionRecord = { id: string; userId?: string; subscriptionJson?: string };
type PushSubscriptionInput = { subscriptionKey: string | null; userId: string | null; endpointUrl: string | null; subscriptionJson: string | null; userAgent: string | null; lastUsed: string | null };
type SafetyRecord = { id: string; userId?: string; quietNotifications?: boolean };
type SafetyInput = { userId: string | null; blockedUserIds: string | null; profileVisibility: string | null; quietNotifications: boolean | null; preferredLanguage: string | null; accountStatus?: string | null; suspensionReason?: string | null };
const subscriptions = createTableClient<PushSubscriptionRecord, PushSubscriptionInput>('UchatPushSubscriptions');
const safety = createTableClient<SafetyRecord, SafetyInput>('UchatUserSafety');

const b64url = (v: Buffer) => v.toString('base64url');
const decode = (v: string) => Buffer.from(v.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - v.length % 4) % 4), 'base64');
const hmac = (key: Buffer, value: Buffer | string) => createHmac('sha256', key).update(value).digest();

function expand(prk: Buffer, info: Buffer, length: number) {
  let output: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  let previous: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  for (let counter = 1; output.length < length; counter++) {
    previous = hmac(prk, Buffer.concat([previous, info, Buffer.from([counter])]));
    output = Buffer.concat([output, previous]);
  }
  return output.subarray(0, length);
}

function privateJwk(privateKey: Buffer, publicKey: Buffer) {
  return createPrivateKey({
    format: 'jwk',
    key: { kty: 'EC', crv: 'P-256', d: b64url(privateKey), x: b64url(publicKey.subarray(1, 33)), y: b64url(publicKey.subarray(33, 65)) },
  });
}

function vapidToken(endpoint: string, publicKey: string, privateKey: string) {
  const url = new URL(endpoint);
  const header = b64url(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64url(Buffer.from(JSON.stringify({ aud: url.origin, exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, sub: 'mailto:notifications@uchat.zite.so' })));
  const unsigned = header + '.' + payload;
  const privateBytes = decode(privateKey);
  const publicBytes = decode(publicKey);
  const key = privateJwk(privateBytes, publicBytes);
  const signer = createSign('SHA256');
  signer.update(unsigned);
  signer.end();
  return unsigned + '.' + b64url(signer.sign({ key, dsaEncoding: 'ieee-p1363' }));
}

function encryptPayload(subscription: { keys: { p256dh: string; auth: string } }, payload: string) {
  const clientPublic = decode(subscription.keys.p256dh);
  const authSecret = decode(subscription.keys.auth);
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  const serverPublic = ecdh.getPublicKey();
  const sharedSecret = ecdh.computeSecret(clientPublic);
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), clientPublic, serverPublic]);
  const keyPrk = hmac(authSecret, sharedSecret);
  const inputKeyMaterial = expand(keyPrk, keyInfo, 32);
  const salt = randomBytes(16);
  const prk = hmac(salt, inputKeyMaterial);
  const cek = expand(prk, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = expand(prk, Buffer.from('Content-Encoding: nonce\0'), 12);
  const cipher = createCipheriv('aes-128-gcm', cek, nonce);
  const plaintext = Buffer.concat([Buffer.from(payload), Buffer.from([2])]);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(4096, 16);
  header.writeUInt8(serverPublic.length, 20);
  return Buffer.concat([header, serverPublic, encrypted]);
}

async function deliver(endpoint: string, subscription: { keys: { p256dh: string; auth: string } }, payload: string, publicKey: string, privateKey: string) {
  const body = encryptPayload(subscription, payload);
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${vapidToken(endpoint, publicKey, privateKey)}, k=${publicKey}`,
      TTL: '3600',
      Urgency: 'normal',
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
    },
    body,
  });
}

export async function sendPushToUsers(userIds: string[], payload: { title: string; body: string; url?: string }) {
  try {
    const publicKey = await getStoredApiKey('uchat_vapid_public_key');
    const privateKey = await getStoredApiKey('uchat_vapid_private_key');
    if (!publicKey || !privateKey) return;
    for (const userId of [...new Set(userIds)]) {
      const preference = await safety.findOne({ filters: { userId } });
      if (preference?.quietNotifications) continue;
      const { records } = await subscriptions.findAll({ filters: { userId }, limit: 30 });
      for (const record of records) {
        if (!record.subscriptionJson) continue;
        try {
          const subscription = JSON.parse(record.subscriptionJson) as { endpoint: string; keys: { p256dh: string; auth: string } };
          const response = await deliver(subscription.endpoint, subscription, JSON.stringify({
            title: payload.title, body: payload.body, url: payload.url ?? '/',
          }), publicKey, privateKey);
          if (response.status === 404 || response.status === 410) await subscriptions.delete({ id: record.id }).catch(() => undefined);
        } catch {
          // Delivery is best-effort: never fail the primary chat action because of push.
        }
      }
    }
  } catch {
    // Missing keys or provider outages must not prevent messaging.
  }
}

export function generateVapidKeyPair() {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  return { publicKey: ecdh.getPublicKey().toString('base64url'), privateKey: ecdh.getPrivateKey().toString('base64url') };
}
