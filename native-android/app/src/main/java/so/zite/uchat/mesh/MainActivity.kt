package so.zite.uchat.mesh

import android.Manifest
import android.os.Build
import android.os.Bundle
import android.content.Intent
import java.security.SecureRandom
import androidx.activity.ComponentActivity
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Radar
import androidx.compose.material.icons.filled.Send
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
import so.zite.uchat.mesh.security.MessageCipher
import so.zite.uchat.mesh.security.BackupCrypto
import so.zite.uchat.mesh.security.SharedKeyCipher
import so.zite.uchat.mesh.security.SecureLocalStore
import so.zite.uchat.mesh.transport.RadioCapabilities
import so.zite.uchat.mesh.transport.BleDiscovery
import so.zite.uchat.mesh.transport.WifiDirectDiscovery
import so.zite.uchat.mesh.transport.NearbyMeshTransport

class MainActivity : ComponentActivity() {
    private var firebaseAuth: FirebaseAuth? = null
    private var nearbyPermissionsGranted by mutableStateOf(false)
    private val permissions = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
        nearbyPermissionsGranted = result.values.all { it }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        firebaseAuth = try { if (FirebaseApp.initializeApp(this) != null) FirebaseAuth.getInstance() else null } catch (_: Exception) { null }
        setContent { val auth = firebaseAuth; if (auth == null) AuthSetupScreen() else AuthGate(auth) }
    }

    private fun requestNearbyPermissions() {
        val needed = buildList {
            if (Build.VERSION.SDK_INT >= 31) {
                add(Manifest.permission.BLUETOOTH_SCAN)
                add(Manifest.permission.BLUETOOTH_CONNECT)
                add(Manifest.permission.BLUETOOTH_ADVERTISE)
            }
            if (Build.VERSION.SDK_INT >= 33) add(Manifest.permission.NEARBY_WIFI_DEVICES)
            if (Build.VERSION.SDK_INT <= 32) add(Manifest.permission.ACCESS_FINE_LOCATION)
        }.toTypedArray()
        permissions.launch(needed)
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
                Box(Modifier.weight(1f)) { MeshHome() }
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
    private fun MeshHome() {
        val caps = remember { RadioCapabilities.inspect(this) }
        val localCipher = remember { MessageCipher() }
        val secureStore = remember { SecureLocalStore(this) }
        var status by remember { mutableStateOf("Ready. Enable Bluetooth and Wi-Fi to connect nearby.") }
        var message by remember { mutableStateOf("") }
        var backupPassword by remember { mutableStateOf("") }
        var keyHex by remember { mutableStateOf(secureStore.loadConversationKey()) }
        val localEcho = remember { mutableStateListOf<String>().apply { addAll(secureStore.loadMessages()) } }
        fun recordMessage(entry: String) {
            localEcho.add(entry)
            secureStore.saveMessages(localEcho.toList())
        }

        val backupExportLauncher = rememberLauncherForActivityResult(
            ActivityResultContracts.CreateDocument("application/octet-stream")
        ) { uri ->
            if (uri != null) {
                val password = backupPassword.toCharArray()
                Thread {
                    try {
                        require(password.size >= 12) { "Use at least 12 characters for the backup password." }
                        val encrypted = BackupCrypto.encrypt(secureStore.exportPortableBackup(), password)
                        contentResolver.openOutputStream(uri)?.use { it.write(encrypted) }
                            ?: error("Could not open the selected cloud destination.")
                        runOnUiThread { status = "Encrypted backup saved. Keep your password safe; UChat cannot recover it." }
                    } catch (e: Exception) {
                        runOnUiThread { status = e.localizedMessage ?: "Backup failed." }
                    } finally { password.fill(' ') }
                }.start()
            }
        }
        val backupRestoreLauncher = rememberLauncherForActivityResult(
            ActivityResultContracts.OpenDocument()
        ) { uri ->
            if (uri != null) {
                val password = backupPassword.toCharArray()
                Thread {
                    try {
                        val encrypted = contentResolver.openInputStream(uri)?.use { input ->
                            val output = java.io.ByteArrayOutputStream()
                            val buffer = ByteArray(8192)
                            var total = 0
                            while (true) {
                                val count = input.read(buffer)
                                if (count < 0) break
                                total += count
                                require(total <= 50 * 1024 * 1024 + 64) { "Backup file is too large." }
                                output.write(buffer, 0, count)
                            }
                            output.toByteArray()
                        } ?: error("Could not read the selected backup.")
                        val payload = BackupCrypto.decrypt(encrypted, password)
                        secureStore.restorePortableBackup(payload)
                        runOnUiThread {
                            keyHex = secureStore.loadConversationKey()
                            localEcho.clear()
                            localEcho.addAll(secureStore.loadMessages())
                            status = "Backup restored and re-encrypted with this device's Android Keystore."
                        }
                    } catch (e: Exception) {
                        runOnUiThread { status = e.localizedMessage ?: "Restore failed." }
                    } finally { password.fill(' ') }
                }.start()
            }
        }
        var connectedEndpoint by remember { mutableStateOf<String?>(null) }
        var pendingPeer by remember { mutableStateOf<Triple<String, String, String>?>(null) }
        val peers = remember { mutableStateListOf<Pair<String, String>>() }
        val transport = remember {
            NearbyMeshTransport(this, object : NearbyMeshTransport.Listener {
                override fun onStatus(messageText: String) { status = messageText }
                override fun onPeerFound(endpointId: String, name: String) {
                    if (peers.none { it.first == endpointId }) peers.add(endpointId to name)
                }
                override fun onPeerLost(endpointId: String) { peers.removeAll { it.first == endpointId } }
                override fun onVerificationRequired(endpointId: String, name: String, authenticationDigits: String) {
                    pendingPeer = Triple(endpointId, name, authenticationDigits)
                }
                override fun onConnected(endpointId: String) {
                    connectedEndpoint = endpointId
                    status = "Connected. Compare the displayed verification code before sending private messages."
                }
                override fun onDisconnected(endpointId: String) {
                    if (connectedEndpoint == endpointId) connectedEndpoint = null
                    status = "Peer disconnected"
                }
                override fun onBytesReceived(endpointId: String, bytes: ByteArray) {
                    try {
                        val text = SharedKeyCipher.decrypt(keyHex, bytes).decodeToString()
                        recordMessage("Peer: $text")
                    } catch (_: Exception) {
                        recordMessage("Received an unreadable message. Check that both devices use the same key.")
                    }
                }
                override fun onFailure(messageText: String) { status = messageText }
            })
        }

        DisposableEffect(Unit) {
            onDispose { transport.stop() }
        }

        val uchatColors = lightColorScheme(
            primary = Color(0xFFEC533C),
            onPrimary = Color(0xFFFFFFFF),
            secondary = Color(0xFF25252D),
            onSecondary = Color(0xFFFAFAFA),
            background = Color(0xFFFCFAF8),
            onBackground = Color(0xFF16161D),
            surface = Color(0xFFFFFFFF),
            onSurface = Color(0xFF16161D),
            surfaceVariant = Color(0xFFF3EFEC),
            outline = Color(0xFFE5E0DC)
        )
        MaterialTheme(colorScheme = uchatColors) {
            Scaffold(
                containerColor = uchatColors.background,
                topBar = {
                    TopAppBar(
                        title = {
                            Column {
                                Text("UChat", style = MaterialTheme.typography.titleLarge)
                                Text("Private nearby messaging", style = MaterialTheme.typography.labelSmall, color = uchatColors.secondary)
                            }
                        },
                        navigationIcon = {
                            Icon(Icons.Default.Lock, null, Modifier.padding(start = 16.dp), tint = uchatColors.primary)
                        },
                        colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFFFCFAF8))
                    )
                }
            ) { padding ->
                Column(
                    Modifier.fillMaxSize().padding(padding).padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text("Your conversations, your privacy", style = MaterialTheme.typography.titleMedium, color = uchatColors.onBackground)
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("RADIO SUPPORT", style = MaterialTheme.typography.labelLarge)
                            Text("Bluetooth LE: " + if (caps.bluetoothLe) "Supported" else "Unavailable")
                            Text("Wi-Fi Direct: " + if (caps.wifiDirect) "Supported" else "Unavailable")
                            Text("Wi-Fi Aware: " + if (caps.wifiAware) "Supported" else "Unavailable")
                            Text("Wi-Fi enabled: " + caps.wifiEnabled)
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = {
                            transport.advertise(Build.MODEL.ifBlank { "UChat device" })
                        }, enabled = nearbyPermissionsGranted, modifier = Modifier.weight(1f)) { Text("Become visible") }
                        OutlinedButton(onClick = { transport.discover() }, enabled = nearbyPermissionsGranted, modifier = Modifier.weight(1f)) {
                            Icon(Icons.Default.Radar, null); Spacer(Modifier.width(4.dp)); Text("Find peers")
                        }
                    }
                    Text(status, style = MaterialTheme.typography.bodySmall)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = {
                                transport.stop()
                                val intent = Intent(this@MainActivity, so.zite.uchat.mesh.transport.BackgroundMeshService::class.java)
                                    .setAction(so.zite.uchat.mesh.transport.BackgroundMeshService.ACTION_START)
                                if (Build.VERSION.SDK_INT >= 26) startForegroundService(intent) else startService(intent)
                                status = "Background nearby mode started. Keep the ongoing UChat notification visible."
                            },
                            modifier = Modifier.weight(1f)
                        ) { Text("Enable background mode") }
                        OutlinedButton(
                            onClick = {
                                stopService(Intent(this@MainActivity, so.zite.uchat.mesh.transport.BackgroundMeshService::class.java)
                                    .setAction(so.zite.uchat.mesh.transport.BackgroundMeshService.ACTION_STOP))
                                status = "Background nearby mode stopped"
                            },
                            modifier = Modifier.weight(1f)
                        ) { Text("Stop background") }
                    }
                    Text(
                        "Background mode keeps nearby advertising and discovery active with a persistent notification. Incoming messages are decrypted and saved locally; this is an early test feature.",
                        style = MaterialTheme.typography.bodySmall
                    )
                    if (!nearbyPermissionsGranted) {
                        Text("Nearby permissions are required. Grant Bluetooth and Wi-Fi nearby access to discover phones.", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                        OutlinedButton(onClick = { requestNearbyPermissions() }) { Text("Grant permissions") }
                    }
                    if (peers.isNotEmpty()) {
                        Text("NEARBY DEVICES", style = MaterialTheme.typography.labelLarge)
                        peers.forEach { peer ->
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(peer.second, modifier = Modifier.weight(1f))
                                TextButton(onClick = {
                                    transport.requestConnection(Build.MODEL.ifBlank { "UChat device" }, peer.first)
                                }) { Text("Connect") }
                            }
                        }
                    }
                    HorizontalDivider()
                    Text("Encrypted cloud backup", style = MaterialTheme.typography.titleSmall)
                    OutlinedTextField(
                        value = backupPassword,
                        onValueChange = { backupPassword = it },
                        label = { Text("Backup password (12+ characters)") },
                        supportingText = { Text("This password encrypts the backup locally. It is never uploaded. Save it somewhere safe.") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp)
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = { backupExportLauncher.launch("uchat-backup.uchb") },
                            enabled = backupPassword.length >= 12,
                            modifier = Modifier.weight(1f)
                        ) { Text("Back up") }
                        OutlinedButton(
                            onClick = { backupRestoreLauncher.launch(arrayOf("application/octet-stream", "*/*")) },
                            enabled = backupPassword.length >= 12,
                            modifier = Modifier.weight(1f)
                        ) { Text("Restore") }
                    }
                    Text(
                        "Choose Google Drive, OneDrive, Dropbox or another Android document provider when available. The file is encrypted before leaving this phone. Restoring replaces this phone's saved conversation key and local message history.",
                        style = MaterialTheme.typography.bodySmall
                    )
                    HorizontalDivider()
                    Text("Shared conversation key", style = MaterialTheme.typography.titleSmall)
                    OutlinedTextField(
                        value = keyHex, onValueChange = {
                            keyHex = it.filter { ch -> ch in "0123456789abcdefABCDEF" }.take(64)
                            if (keyHex.length == 64 || keyHex.isEmpty()) secureStore.saveConversationKey(keyHex)
                        },
                        label = { Text("Same 64-character hex key on both phones") },
                        supportingText = { Text("Generate once, then transfer the key securely in person. Never send it in chat.") },
                        modifier = Modifier.fillMaxWidth(), singleLine = true,
                        shape = RoundedCornerShape(14.dp)
                    )
                    OutlinedButton(onClick = {
                        val bytes = ByteArray(32).also { SecureRandom().nextBytes(it) }
                        keyHex = bytes.joinToString("") { "%02x".format(it) }
                        secureStore.saveConversationKey(keyHex)
                        status = "New 256-bit key generated on this phone. Enter this exact key on the other phone using a secure out-of-band method."
                    }) { Text("Generate new 256-bit key") }
                    OutlinedTextField(
                        value = message, onValueChange = { message = it },
                        label = { Text("Message") }, modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp)
                    )
                    Button(
                        enabled = connectedEndpoint != null && keyHex.length == 64 && message.isNotBlank(),
                        onClick = {
                            try {
                                val encrypted = SharedKeyCipher.encrypt(keyHex, message.toByteArray())
                                transport.sendEncrypted(connectedEndpoint!!, encrypted)
                                recordMessage("Me: $message")
                                message = ""
                            } catch (e: Exception) { status = e.localizedMessage ?: "Encryption/send failed" }
                        },
                        modifier = Modifier.align(Alignment.End)
                    , shape = RoundedCornerShape(12.dp)) { Icon(Icons.Default.Send, null); Text("Send encrypted") }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        TextButton(onClick = {
                            localEcho.clear()
                            secureStore.saveMessages(emptyList())
                        }) { Text("Clear history") }
                        TextButton(onClick = {
                            keyHex = ""
                            secureStore.saveConversationKey("")
                            status = "Saved conversation key cleared from this device"
                        }) { Text("Forget key") }
                    }
                    Text("LOCAL ENCRYPTION CHECK", style = MaterialTheme.typography.labelLarge)
                    Button(onClick = {
                        if (message.isNotBlank()) {
                            val encrypted = localCipher.encrypt(message.toByteArray())
                            val recovered = localCipher.decrypt(encrypted).decodeToString()
                            recordMessage("Local Keystore AES-256-GCM test: $recovered")
                            message = ""
                        }
                    }) { Text("Test device encryption") }
                    LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(localEcho) { Text(it, style = MaterialTheme.typography.bodyMedium) }
                    }
                    Text(
                        "Prototype only: manual shared-key AES-GCM and Nearby transport are implemented. This is not a Signal/WhatsApp-equivalent protocol; use only for controlled testing.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }
        }

        pendingPeer?.let { pending ->
            AlertDialog(
                onDismissRequest = { transport.reject(pending.first); pendingPeer = null },
                title = { Text("Verify nearby device") },
                text = {
                    Text("Device: ${pending.second}\n\nCompare this code with the other phone. Accept only if both screens show exactly the same digits:\n\n${pending.third}")
                },
                confirmButton = {
                    TextButton(onClick = { transport.accept(pending.first); pendingPeer = null }) { Text("Codes match — accept") }
                },
                dismissButton = {
                    TextButton(onClick = { transport.reject(pending.first); pendingPeer = null }) { Text("Reject") }
                }
            )
        }
    }
}
