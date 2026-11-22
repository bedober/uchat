# ChatVault

Flutter Android/iOS client and Node.js ciphertext relay foundation.

> **Status: foundation / development preview — not production-ready.** The repository currently contains navigation and demo data, a fail-closed E2EE interface, and an in-memory encrypted-envelope relay skeleton. Authentication, Signal Protocol, calls, persistent account metadata, Pesapal transactions and release signing still require implementation and security testing.

## Repository layout

- `mobile/` — Flutter client (Android and iOS).
- `server/` — Node.js + Socket.IO relay. It accepts opaque ciphertext envelopes and does not persist message bodies.
- `docs/SECURITY.md` — security boundaries and required production controls.

## Run the client

Install Flutter 3.24+ and a supported Dart SDK:

```sh
cd mobile
flutter pub get
flutter analyze
flutter test
flutter run
```

Firebase must be initialized with platform-specific configuration before enabling Firebase Auth or FCM. No Firebase credentials are committed.

## Run the relay locally

```sh
cd server
npm install
cp .env.example .env
# Set a local-only test token in .env
npm run check
npm start
```

The local bearer-token check is a development stub. Replace it with Firebase Admin SDK token verification and bind each authenticated device to a server-verified account before any deployment.

## Integrations and required setup

- **Firebase Phone Auth / FCM:** create Android and iOS apps in Firebase; configure SHA fingerprints, APNs, phone-auth regions and abuse protections.
- **Africa's Talking:** use only as a supported SMS fallback behind a server adapter. Never put API keys in the app.
- **Signal Protocol:** integrate a maintained, audited Signal Protocol implementation with X3DH/PQXDH as appropriate, Double Ratchet, device sessions, pre-key rotation, safety-number verification and group Sender Keys. The current Dart interface intentionally fails closed; it is not an encryption implementation.
- **Calls:** add WebRTC signaling, TURN servers, ICE policy, DTLS-SRTP verification and an independently reviewed E2EE media key design. A call UI alone is not a secure call.
- **Pesapal API v3:** backend-only OAuth token acquisition, order creation, registered IPN, server-side status verification, idempotent ledger posting and reconciliation. Payouts require explicit merchant capability/approval. Never trust a client redirect as proof of payment.
- **Storage:** encrypt media on the client before upload; use short-lived object URLs and never upload plaintext thumbnails.
- **PostgreSQL:** store account, device, group/channel membership, delivery metadata and an append-only wallet ledger only. Do not store plaintext messages or encryption keys.

## Demo data

The preview contains 10 chat rows, 3 groups (one sample group displays 5,000 members), and 2 channels. These are explicitly demo records and do not represent tested capacity.

## Release builds

Android: `cd mobile && flutter build apk --release`

iOS: `cd mobile && flutter build ipa --release` (requires macOS, Xcode, Apple signing and provisioning).

Do not distribute a release until the production authentication, E2EE, calls, wallet ledger, compliance, abuse controls and device tests are complete.
