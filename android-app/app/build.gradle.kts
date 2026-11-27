plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "com.siege.uchat"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.siege.uchat"
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }
}
