# UChat

UChat is an independently developed messaging platform. The native Android client is a standalone Kotlin and Jetpack Compose application; it does not require Zite, a Zite runtime, or a website WebView.

## Repository
- Native Android app: `native-android/`
- Vercel API: `api/`
- Legacy web client: `apps/pulse-chat/` (not required by the native Android app)
- Security notes: [SECURITY.md](SECURITY.md)

The Android client is intended to communicate directly with the separately hosted UChat API under `/api/v1`. Configure backend secrets in Vercel environment settings; never commit credentials.

See [native-android/README.md](native-android/README.md) and [api/README.md](api/README.md) for setup and implementation status.

Do not describe the app as production-secure until authentication, server authorization, reviewed end-to-end encryption, rate limits, key verification, and two-device tests have passed.
