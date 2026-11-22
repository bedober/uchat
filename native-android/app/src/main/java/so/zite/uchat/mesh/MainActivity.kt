package so.zite.uchat.mesh

import android.Manifest
import android.os.Build
import android.os.Bundle
import java.security.SecureRandom
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Radar
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import so.zite.uchat.mesh.security.MessageCipher
import so.zite.uchat.mesh.security.SharedKeyCipher
import so.zite.uchat.mesh.security.SecureLocalStore
import so.zite.uchat.mesh.transport.RadioCapabilities
import so.zite.uchat.mesh.transport.BleDiscovery
import so.zite.uchat.mesh.transport.WifiDirectDiscovery
import so.zite.uchat.mesh.transport.NearbyMeshTransport

class MainActivity : ComponentActivity() {
    private val permissions = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
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
        setContent { MeshHome() }
    }

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    private fun MeshHome() {
        val caps = remember { RadioCapabilities.inspect(this) }
        val localCipher = remember { MessageCipher() }
        val secureStore = remember { SecureLocalStore(this) }
        var status by remember { mutableStateOf("Ready. Enable Bluetooth and Wi-Fi to connect nearby.") }
        var message by remember { mutableStateOf("") }
        var keyHex by remember { mutableStateOf(secureStore.loadConversationKey()) }
        val localEcho = remember { mutableStateListOf<String>().apply { addAll(secureStore.loadMessages()) } }
        fun recordMessage(entry: String) {
            localEcho.add(entry)
            secureStore.saveMessages(localEcho.toList())
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

        MaterialTheme(colorScheme = darkColorScheme()) {
            Scaffold(topBar = {
                TopAppBar(title = { Text("UChat Mesh") }, navigationIcon = {
                    Icon(Icons.Default.Lock, null, Modifier.padding(start = 16.dp))
                })
            }) { padding ->
                Column(
                    Modifier.fillMaxSize().padding(padding).padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text("Nearby encrypted messaging", style = MaterialTheme.typography.titleMedium)
                    Card {
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
                        }, modifier = Modifier.weight(1f)) { Text("Become visible") }
                        OutlinedButton(onClick = { transport.discover() }, modifier = Modifier.weight(1f)) {
                            Icon(Icons.Default.Radar, null); Spacer(Modifier.width(4.dp)); Text("Find peers")
                        }
                    }
                    Text(status, style = MaterialTheme.typography.bodySmall)
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
                    Text("Shared conversation key", style = MaterialTheme.typography.titleSmall)
                    OutlinedTextField(
                        value = keyHex, onValueChange = {
                            keyHex = it.filter { ch -> ch in "0123456789abcdefABCDEF" }.take(64)
                            if (keyHex.length == 64 || keyHex.isEmpty()) secureStore.saveConversationKey(keyHex)
                        },
                        label = { Text("Same 64-character hex key on both phones") },
                        supportingText = { Text("Generate once, then transfer the key securely in person. Never send it in chat.") },
                        modifier = Modifier.fillMaxWidth(), singleLine = true
                    )
                    OutlinedButton(onClick = {
                        val bytes = ByteArray(32).also { SecureRandom().nextBytes(it) }
                        keyHex = bytes.joinToString("") { "%02x".format(it) }
                        secureStore.saveConversationKey(keyHex)
                        status = "New 256-bit key generated on this phone. Enter this exact key on the other phone using a secure out-of-band method."
                    }) { Text("Generate new 256-bit key") }
                    OutlinedTextField(
                        value = message, onValueChange = { message = it },
                        label = { Text("Message") }, modifier = Modifier.fillMaxWidth()
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
                    ) { Icon(Icons.Default.Send, null); Text("Send encrypted") }
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
