# UChat Android wrapper

A lightweight Android WebView app that opens https://uchat.zite.so.

## Build
1. Open this folder in Android Studio (Hedgehog or newer).
2. Let Gradle sync.
3. Select Build > Build Bundle(s) / APK(s) > Build APK(s).
4. Install the debug APK on an Android device.

For a signed release, create a release keystore in Android Studio and configure signing before publishing.

## Performance and limitations
- Hardware-accelerated WebView, DOM storage, browser cache and retained cookies are enabled.
- The app restores WebView state and shows a minimal loading surface.
- First launch requires internet; this wrapper cannot remove latency from the network, Zite hosting, or backend.
- Offline message sync, native push notifications, and background calling require native/backend integration and are not included yet.
- File chooser support is included for chat attachments; external HTTPS links open outside the app.
