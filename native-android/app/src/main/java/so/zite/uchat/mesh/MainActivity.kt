package so.zite.uchat.mesh

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.OAuthProvider

class MainActivity : ComponentActivity() {
    private var firebaseAuth: FirebaseAuth? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        firebaseAuth = try { if (FirebaseApp.initializeApp(this) != null) FirebaseAuth.getInstance() else null } catch (_: Exception) { null }
        setContent { val auth = firebaseAuth; if (auth == null) AuthSetupScreen() else AuthGate(auth) }
    }


    @Composable
    private fun AuthGate(auth: FirebaseAuth) {
        var user by remember { mutableStateOf(auth.currentUser) }
        DisposableEffect(auth) {
            val listener = FirebaseAuth.AuthStateListener { user = it.currentUser }
            auth.addAuthStateListener(listener)
            onDispose { auth.removeAuthStateListener(listener) }
        }
        if (user == null) {
            AuthScreen(
                onEmailAuth = { email, password, create, done ->
                    val task = if (create) auth.createUserWithEmailAndPassword(email, password) else auth.signInWithEmailAndPassword(email, password)
                    task.addOnCompleteListener { result -> done(if (result.isSuccessful) "Welcome to UChat." else result.exception?.localizedMessage ?: "Authentication failed.") }
                },
                onSocialAuth = { providerId, done ->
                    val provider = OAuthProvider.newBuilder(providerId, this@MainActivity).build()
                    auth.startActivityForSignInWithProvider(this@MainActivity, provider).addOnCompleteListener { result ->
                        done(if (result.isSuccessful) "Signed in." else result.exception?.localizedMessage ?: "Sign-in failed.")
                    }
                }
            )
        } else {
            Column(Modifier.fillMaxSize()) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("Signed in as " + (user?.email ?: user?.displayName ?: "UChat user"), modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                    TextButton(onClick = { auth.signOut() }) { Text("Sign out") }
                }
                Box(Modifier.weight(1f)) { AppHome() }
            }
        }
    }

    @Composable
    private fun AuthSetupScreen() {
        MaterialTheme(colorScheme = lightColorScheme(primary = Color(0xFFEC533C), background = Color(0xFFFCFAF8))) {
            Surface(Modifier.fillMaxSize(), color = Color(0xFFFCFAF8)) {
                Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("UChat", style = MaterialTheme.typography.headlineLarge, color = Color(0xFFEC533C))
                    Text("Private conversations start here", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(20.dp))
                    Text("Authentication setup is required. Add google-services.json to native-android/app and enable Email/Password, Google and Facebook providers in Firebase Authentication.", style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
    }

    @Composable
    private fun AuthScreen(onEmailAuth: (String, String, Boolean, (String) -> Unit) -> Unit, onSocialAuth: (String, (String) -> Unit) -> Unit) {
        var createAccount by remember { mutableStateOf(false) }
        var email by remember { mutableStateOf("") }
        var password by remember { mutableStateOf("") }
        var showPassword by remember { mutableStateOf(false) }
        var busy by remember { mutableStateOf(false) }
        var message by remember { mutableStateOf("") }
        val colors = lightColorScheme(primary = Color(0xFFEC533C), onPrimary = Color.White, background = Color(0xFFFCFAF8), surface = Color.White, onSurface = Color(0xFF16161D))
        MaterialTheme(colorScheme = colors) {
            Surface(Modifier.fillMaxSize(), color = colors.background) {
                Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 24.dp, vertical = 32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    Text("UChat", style = MaterialTheme.typography.headlineLarge, color = colors.primary)
                    Spacer(Modifier.height(8.dp))
                    Text(if (createAccount) "Create your account" else "Welcome back", style = MaterialTheme.typography.headlineSmall)
                    Text("Your chats. Your privacy.", color = Color(0xFF77727A))
                    Spacer(Modifier.height(24.dp))
                    OutlinedButton(onClick = { busy = true; onSocialAuth("google.com") { message = it; busy = false } }, enabled = !busy, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp)) { Text("Continue with Google") }
                    OutlinedButton(onClick = { busy = true; onSocialAuth("facebook.com") { message = it; busy = false } }, enabled = !busy, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp)) { Text("Continue with Facebook") }
                    Row(Modifier.fillMaxWidth().padding(vertical = 16.dp), verticalAlignment = Alignment.CenterVertically) { HorizontalDivider(Modifier.weight(1f)); Text("  or use email  ", color = Color.Gray); HorizontalDivider(Modifier.weight(1f)) }
                    OutlinedTextField(value = email, onValueChange = { email = it.trim() }, label = { Text("Email address") }, singleLine = true, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp))
                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(value = password, onValueChange = { password = it }, label = { Text("Password") }, singleLine = true, visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(), trailingIcon = { IconButton(onClick = { showPassword = !showPassword }) { Icon(if (showPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility, "Toggle password visibility") } }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp))
                    Spacer(Modifier.height(16.dp))
                    Button(onClick = { if (!email.contains("@") || password.length < 6) message = "Enter a valid email and a password of at least 6 characters." else { busy = true; onEmailAuth(email, password, createAccount) { message = it; busy = false } } }, enabled = !busy, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp)) { Text(if (busy) "Please wait…" else if (createAccount) "Create account" else "Sign in") }
                    TextButton(onClick = { createAccount = !createAccount; message = "" }, enabled = !busy) { Text(if (createAccount) "Already have an account? Sign in" else "New to UChat? Create an account") }
                    if (message.isNotBlank()) Text(message, color = if (message.startsWith("Welcome") || message.startsWith("Signed in")) Color(0xFF287A49) else Color(0xFFB33A2B), style = MaterialTheme.typography.bodySmall)
                    Spacer(Modifier.height(20.dp))
                    Text("Account sign-in is separate from your end-to-end message encryption.", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                }
            }
        }
    }

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    private fun AppHome() {
        var selectedTab by remember { mutableStateOf("Chats") }
        val tabs = listOf("Chats", "Calls", "Feeds", "Wallet")
        val colors = lightColorScheme(
            primary = Color(0xFFEC533C),
            onPrimary = Color.White,
            background = Color(0xFFFCFAF8),
            surface = Color.White,
            onSurface = Color(0xFF16161D),
            surfaceVariant = Color(0xFFF3EFEC)
        )
        MaterialTheme(colorScheme = colors) {
            Scaffold(
                containerColor = colors.background,
                topBar = {
                    TopAppBar(
                        title = { Text("UChat", style = MaterialTheme.typography.headlineSmall) },
                        actions = {
                            TextButton(onClick = { selectedTab = "Profile" }) { Text("Profile") }
                        },
                        colors = TopAppBarDefaults.topAppBarColors(containerColor = colors.background)
                    )
                },
                bottomBar = {
                    NavigationBar(containerColor = Color.White) {
                        tabs.forEach { tab ->
                            NavigationBarItem(
                                selected = selectedTab == tab,
                                onClick = { selectedTab = tab },
                                icon = { Text(when (tab) { "Chats" -> "💬"; "Calls" -> "☎"; "Feeds" -> "▤"; else -> "◈" }) },
                                label = { Text(tab) }
                            )
                        }
                    }
                }
            ) { padding ->
                Column(
                    Modifier.fillMaxSize().padding(padding).padding(horizontal = 20.dp, vertical = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    when (selectedTab) {
                        "Chats" -> {
                            Text("Messages", style = MaterialTheme.typography.headlineMedium)
                            OutlinedTextField(
                                value = "",
                                onValueChange = {},
                                readOnly = true,
                                enabled = false,
                                label = { Text("Search conversations") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp)
                            )
                            Spacer(Modifier.height(28.dp))
                            Text("No conversations yet", style = MaterialTheme.typography.titleMedium)
                            Text("Your private conversations will appear here when you connect with people on UChat.", color = Color(0xFF77727A))
                        }
                        "Calls" -> {
                            Text("Calls", style = MaterialTheme.typography.headlineMedium)
                            Text("Your recent calls will appear here.", color = Color(0xFF77727A))
                        }
                        "Feeds" -> {
                            Text("Feeds", style = MaterialTheme.typography.headlineMedium)
                            Text("Updates from people and creators you follow will appear here.", color = Color(0xFF77727A))
                        }
                        "Wallet" -> {
                            Text("Wallet", style = MaterialTheme.typography.headlineMedium)
                            Text("Your on-device wallet and peer-to-peer payments will appear here when wallet support is added.", color = Color(0xFF77727A))
                        }
                        else -> {
                            Text("Profile", style = MaterialTheme.typography.headlineMedium)
                            Text("Manage your UChat account and preferences.")
                        }
                    }
                }
            }
        }
    }
}
