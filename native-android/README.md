# UChat Mesh for Android

Native Android companion module for the existing UChat/Pulse Chat repository.

## Included in scaffold 0.1.0
- Kotlin / Jetpack Compose app, min SDK 28, target SDK 35.
- Android Keystore-backed AES-256-GCM local encryption.
- X25519 ephemeral key-agreement and HKDF-SHA256 primitive.
- Capability detection for Bluetooth LE, Wi-Fi Direct and Wi-Fi Aware.
- Bluetooth LE scanning and Wi-Fi Direct peer discovery entry points.
- Local encrypt/decrypt demonstration screen.
- GitHub Actions debug APK build.

## Security status
This is an early development scaffold, not a production WhatsApp-equivalent E2E messenger. The AES-256-GCM key currently protects data locally on one device; it is not shared with contacts. X25519/HKDF is a cryptographic primitive, not a complete authenticated Signal protocol. Production requires an audited handshake, identity binding and verification, Double Ratchet or equivalent forward-secure protocol, replay protection, group key management, encrypted relay queues, secure attachment handling, and independent security review. Do not advertise the current scaffold as production E2E encryption.

## Build
Open this folder in Android Studio with JDK 17 and Android SDK 35, or run gradle assembleDebug. APK output: app/build/outputs/apk/debug/app-debug.apk.

## Radio limitations
BLE currently provides discovery only. Wi-Fi Direct discovery is initiated but socket transport and peer session negotiation are future work. Wi-Fi Aware is capability-detected but not yet wired up. Android background scanning and continuous connections are subject to OS permissions, lifecycle and battery restrictions. Relays must only forward authenticated ciphertext and never receive plaintext or session keys.