# UChat Mesh for Android

Native Android companion module in the existing UChat/Pulse Chat repository.

## Android module 0.2.0

- Kotlin / Jetpack Compose app, min SDK 28, target SDK 35.
- Android Keystore-backed AES-256-GCM local encryption for data at rest.
- X25519 ephemeral key-agreement and HKDF-SHA256 primitive (not a complete protocol).
- Radio capability detection for Bluetooth LE, Wi-Fi Direct and Wi-Fi Aware.
- BLE scanning and Wi-Fi Direct peer discovery entry points.
- **Nearby Connections transport layer** for advertising, discovering, requesting and accepting nearby peer connections, disconnect handling, and byte-payload transfer. Google Play services selects supported Bluetooth/Wi-Fi technologies.
- Compose UI now exposes advertise/discover/connect, a two-device authentication-code confirmation dialog, and encrypted byte-message send/receive.
- Optional manually shared 256-bit conversation key: AES-256-GCM with a fresh random nonce per message. Both phones must enter the same 64-character hex key; exchange it out-of-band.
- Incoming connections require explicit user approval after comparing the authentication digits on both devices.
- Outgoing transport method accepts ciphertext only (the caller must encrypt before sending).
- GitHub Actions debug APK build workflow.

## Important implementation status

The Compose screen is wired to the Nearby transport and shared-key encryption path. Two compatible Android devices with Google Play services can be tested together. This has not yet been compiled or verified on physical devices in this environment; a successful GitHub Actions run and two-device test are still required.

## Security status — not production-ready

The AES-256-GCM key in `MessageCipher` is generated in Android Keystore and is device-local. For cross-device test messages, `SharedKeyCipher` uses a manually shared 32-byte key. This provides symmetric message confidentiality and integrity only while that key remains secret. Anyone who obtains the shared key can read messages; there is no forward secrecy, automatic key rotation, multi-device identity system or secure group protocol. Nearby Connections also encrypts its transport, but transport encryption is not a substitute for an audited end-to-end messaging protocol.

The X25519/HKDF helper is only a primitive. It is not yet wired into a complete authenticated session protocol. Before production release, implement and independently review:
- a vetted Signal Protocol implementation (X3DH/PQXDH as supported and Double Ratchet), rather than a home-grown ratchet;
- durable identity keys, signed prekeys, one-time prekeys, key-change warnings and QR/safety-number verification;
- replay protection, message IDs, delivery acknowledgements and safe retry semantics;
- encrypted local message database, backup/export policy, attachment encryption and secure key lifecycle;
- group messaging key management, abuse/reporting controls, rate limits and metadata minimization;
- automated unit, instrumentation, interoperability and adversarial security tests.

Do not advertise this scaffold as WhatsApp-equivalent or independently audited E2E encryption.

## Build

Open `native-android/` in Android Studio with JDK 17 and Android SDK 35, or run `gradle assembleDebug` from this folder. The expected output is `app/build/outputs/apk/debug/app-debug.apk`. GitHub Actions is configured to build and publish a debug APK artifact; a successful workflow run must be confirmed before treating an APK as available.

## Radio and platform limitations

Nearby Connections uses Google Play services and chooses among supported Bluetooth and Wi-Fi transports. It does not provide universal access to every radio. Cellular modem/baseband signals are not an app-level peer-to-peer data channel; NFC and UWB are specialized, range- and hardware-limited technologies. Wi-Fi Direct and Wi-Fi Aware require compatible hardware and Android permissions. Background scanning and continuous connections are subject to Android lifecycle, permission, battery and vendor restrictions.

References:
- https://developers.google.com/nearby/connections/overview
- https://developers.google.com/nearby/connections/android/manage-connections
- https://developer.android.com/develop/connectivity/overview

## Background offline test mode (early prototype)

- The app now has an opt-in **Enable background mode** control. It starts an Android foreground service with an ongoing notification and keeps Nearby Connections advertising/discovery active while the app is backgrounded.
- Nearby Connections can select supported Bluetooth/Wi-Fi transports and does not inherently require internet access. Test both phones on the same Wi-Fi router with its WAN/internet disconnected, and separately test one phone's hotspot with mobile data disabled.
- The background service accepts the Nearby transport handshake and only stores a received message after AES-GCM authentication/decryption using the manually shared 256-bit conversation key. It does not put message plaintext in the notification.
- To stop background mode, open UChat and tap **Stop background** or stop the app service from Android settings.

### Test limitations — do not treat this as release-ready

- Background service is a test scaffold, not a complete always-on messenger. Android battery controls, force-stop, permission changes and vendor policies can stop it.
- The service currently handles background discovery and authenticated incoming message storage. Sending from the background service, reliable offline message queues/acknowledgements, reconnect/resume state, and seamless handoff between foreground and background transports are not complete.
- Transport-level auto-accept is used by this prototype; it is not identity verification. Only peers possessing the same secret can produce valid AES-GCM messages, but this remains a manually provisioned shared-key design without forward secrecy or key rotation.
- Verify on at least two physical Android devices. Emulator-only success is insufficient for Bluetooth/Wi-Fi radio behavior.
- This build is for controlled testing only, not sensitive communications or production deployment.
