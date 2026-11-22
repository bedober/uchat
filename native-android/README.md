# UChat Android

UChat is delivered on Android as a lightweight Android client for the existing UChat web app.

## User experience

- Opening the app loads **https://uchat.zite.so** directly.
- No mesh dashboard, manual encryption-key generation, shared-key entry, radio setup, or Firebase setup screen is shown.
- Accounts, chat screens, and any features available on the UChat website are provided by the website itself.
- The Android client enables JavaScript, DOM storage, cookies, file selection for web uploads, download hand-off, page progress, and Android back navigation.
- The app uses HTTPS and blocks mixed-content loading.

## Important product boundary

This Android package is a WebView client, not a new messaging backend. It does not independently implement WhatsApp-style messaging, push notifications, voice/video calls, contact sync, or end-to-end encryption. Those capabilities must exist and be configured in the UChat website/backend at https://uchat.zite.so. The app does not create or manage cryptographic identity keys itself.

For a complete WhatsApp-like product, the web platform still needs working user accounts, realtime message delivery, persistent conversation storage, media upload, notification delivery, and a reviewed end-to-end encryption protocol. Do not claim WhatsApp-equivalent security unless that protocol has been implemented and independently reviewed.

## Build

Open this folder in Android Studio with JDK 17 and Android SDK 35, or run the repository's Android GitHub Actions workflow. Debug APK output: `app/build/outputs/apk/debug/app-debug.apk`.

A successful workflow run is required before distributing an APK. Install and test on a physical Android phone, including login, chat navigation, media upload, file download, and Android back navigation.

## Website

- Production entry point: https://uchat.zite.so
