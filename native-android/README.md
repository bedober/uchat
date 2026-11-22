# UChat Android

Standalone native Android client built with Kotlin and Jetpack Compose. It does not use Zite, Zite runtime packages, or a website WebView. The launcher opens the native UChat interface.

## Current navigation

- Chats
- Calls
- Wallet (center tab)
- Communities
- Settings

The app no longer seeds the chat list with fabricated sample conversations. Until a signed-in account and live API connection are configured, empty states are shown rather than simulated users or messages.

## Backend configuration

The Vercel API is under `/api/v1`. See `api/README.md` for the required Upstash Redis, Google SMTP App Password, Twilio and authentication secrets. Configure these in Vercel Project Settings; never commit secrets to the repository.

## Feature status

The centered Wallet navigation and native screen are present, but wallet key generation, recovery, on-chain or peer-to-peer transfers, and marketplace settlement are not yet implemented. The wallet screen intentionally shows no invented balance.

The native client still requires integration with the Vercel API for live OTP sign-in, conversation discovery, message send/receive, encrypted local persistence and synchronization. End-to-end encryption must use a reviewed protocol and verified identity keys before being described as production-secure. Voice/video calling requires a complete WebRTC client, call UI, permissions, signaling integration and TURN configuration.

Do not distribute this build as a production messaging or wallet app until those integrations and two-device tests pass.

## Build

Open this folder in Android Studio with JDK 17 and Android SDK 35, or run the repository's GitHub Actions workflow. Debug APK output: `app/build/outputs/apk/debug/app-debug.apk`.
