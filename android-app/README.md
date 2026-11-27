# UChat Android app

The Android app opens the live UChat service at https://uchat.zite.so.

## Online and offline behavior
- Online: loads UChat directly from the server, so account data and new messages remain server-backed.
- Offline: displays a locally saved MHTML snapshot of the last successfully loaded page when one is available.
- First-ever use without internet: displays a simple offline/retry screen.
- When connectivity returns, the app automatically reloads the live server.
- The saved page is a read-only snapshot. Sending messages, calls, login requests, and refreshing live data require internet. This is not a full offline message database or background sync system.

## Build
1. Open this folder in Android Studio (Hedgehog or newer).
2. Let Gradle sync.
3. Select Build > Build Bundle(s) / APK(s) > Build APK(s).
4. Install the debug APK on an Android device.

For a signed release, configure a release keystore before publishing.
