# UChat Vercel API

This folder contains the first production-oriented API layer for the native Android client. It is a Vercel Node.js Function and stores only encrypted message payloads; it never accepts a plaintext message field.

## Required Vercel environment variables

Set these for Preview and Production before enabling the API:

- `UPSTASH_REDIS_REST_URL` — Upstash Redis REST endpoint
- `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis REST token
- `UCHAT_AUTH_SECRET` — random secret with at least 32 bytes of entropy
- `GOOGLE_SMTP_USER` — the Gmail or Google Workspace address used to send verification codes
- `GOOGLE_SMTP_APP_PASSWORD` — a Google App Password (not your normal Google account password)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` — Twilio SMS sender configuration

Never commit these values to Git. Email sign-in uses Gmail SMTP through Nodemailer; phone sign-in needs Twilio. Both channels use one-time verification codes.

## Routes

- `GET /api/v1/health` — health check (no credentials)
- `POST /api/v1/auth/request-code` — `{ channel: "email"|"phone", identity, displayName? }`
- `POST /api/v1/auth/verify-code` — `{ channel, identity, code }`; returns a 30-day bearer token and profile
- `GET /api/v1/me` — current profile
- `POST /api/v1/conversations` — `{ memberIds: string[], title? }`
- `GET /api/v1/conversations` — conversations for the signed-in user
- `POST /api/v1/messages` — `{ conversationId, messageId, ciphertext }`
- `GET /api/v1/messages?conversationId=...&after=-` — stream synchronization
- `POST /api/v1/calls` — call signaling event `{ to, callId, type, payload, conversationId? }`
- `GET /api/v1/calls?after=-` — pending call signaling events

All routes except health and OTP request/verification require `Authorization: Bearer <token>`.

## Encryption contract

The message relay accepts an opaque `ciphertext` string only. Clients must encrypt message content on-device and must never send plaintext to this API. The current API is a relay/storage foundation, not a complete Signal-protocol implementation: before public launch, the Android client still needs an audited ratcheting E2E protocol, identity-key verification, encrypted local database, and key backup/recovery. WebRTC media uses DTLS-SRTP; call signaling is not a substitute for validating peer identity.

## Deployment and validation

The Vercel project must use this repository's root as its root directory so `api/v1/[...route].js` is discovered. The Vercel project also needs the environment variables above. Deploy only after those secrets are configured. The endpoint deliberately returns a service-unavailable response when a required provider is not configured.
