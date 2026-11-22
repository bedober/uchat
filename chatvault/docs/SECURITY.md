# ChatVault security status

## Current status

This is a development foundation, not a production secure messenger. The mobile app has demo navigation only. The encryption adapter is deliberately fail-closed and throws rather than silently sending plaintext. The Node relay forwards opaque ciphertext in process memory and does not persist message payloads.

## Non-negotiable production requirements

1. Use a maintained Signal Protocol implementation. Do not invent a replacement protocol or combine independent AES/HMAC primitives around an unreviewed ratchet.
2. Keep identity private keys and session state in platform-protected storage; document backup and multi-device key semantics.
3. Authenticate Firebase ID tokens on every HTTP and WebSocket connection. Bind device IDs server-side; rate-limit OTP, pre-key fetches, sends, group operations and wallet actions.
4. Publish and test a threat model, protocol versioning, safety-number UX, key-change notifications, device revocation, replay protection and downgrade resistance.
5. For groups, enforce membership epochs and rotate Sender Keys on add/remove. A newly added member must not receive old keys.
6. For calls, verify media key ownership end-to-end; DTLS-SRTP transport encryption alone does not prove server-independent E2EE.
7. Encrypt media client-side before upload. Avoid plaintext thumbnails, analytics payloads, crash reports and push-notification previews.
8. Use TLS 1.3 where supported, certificate pinning with backup pins and safe rotation, secure headers, dependency scanning and independent penetration testing.
9. Wallet operations require a double-entry ledger, immutable idempotency keys, reconciliation, fraud controls, KYC/AML review where applicable, limits and server-side authorization. Never credit a wallet from a browser redirect.
10. Never claim unlimited users, sub-100ms global delivery, perfect forward secrecy or unbreakable security without measured and independently reviewed evidence.

## Known incomplete controls

- Firebase token verification is a TODO; local bearer token is development-only.
- No PostgreSQL metadata schema or migrations yet.
- No Signal Protocol adapter, key storage, group Sender Keys, QR verification or encrypted backup yet.
- No WebRTC signaling/TURN deployment or E2EE call verification yet.
- No Pesapal order/IPN/payout implementation or wallet ledger yet.
- No offline durable delivery queue, media object storage, rate limits or production observability yet.
