plugins {
 id("com.android.application")
 id("org.jetbrains.kotlin.android")
 id("org.jetbrains.kotlin.plugin.compose")
}
if (file("google-services.json").exists()) pluginManager.apply("com.google.gms.google-services")
android {
 namespace = "com.uchat.mesh"
 compileSdk = 35
 defaultConfig { applicationId = "com.uchat.mesh"; minSdk = 28; targetSdk = 35; versionCode = 3; versionName = "0.3.0" }
 buildFeatures { compose = true }
 compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
 kotlinOptions { jvmTarget = "17" }
}
dependencies {
 implementation(platform("androidx.compose:compose-bom:2025.02.00"))
 implementation("androidx.activity:activity-compose:1.10.1")
 implementation("androidx.compose.ui:ui")
 implementation("androidx.compose.ui:ui-tooling-preview")
 implementation("androidx.compose.material3:material3")
 implementation("androidx.compose.material:material-icons-extended")
 implementation("androidx.core:core-ktx:1.15.0")
 implementation("com.google.android.gms:play-services-nearby:19.3.0")
 implementation("org.bouncycastle:bcprov-jdk18on:1.80")
 implementation(platform("com.google.firebase:firebase-bom:33.12.0"))
 implementation("com.google.firebase:firebase-auth")
 debugImplementation("androidx.compose.ui:ui-tooling")
 testImplementation("junit:junit:4.13.2")
}
