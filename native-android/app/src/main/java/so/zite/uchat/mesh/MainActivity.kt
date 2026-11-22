package so.zite.uchat.mesh

import android.Manifest
import android.os.Build
import android.os.Bundle
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
import so.zite.uchat.mesh.transport.RadioCapabilities
import so.zite.uchat.mesh.transport.BleDiscovery
import so.zite.uchat.mesh.transport.WifiDirectDiscovery

class MainActivity : ComponentActivity() {
 private val permissions = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { }
 override fun onCreate(savedInstanceState: Bundle?) {
  super.onCreate(savedInstanceState)
  val needed = buildList {
   if (Build.VERSION.SDK_INT >= 31) add(Manifest.permission.BLUETOOTH_SCAN)
   if (Build.VERSION.SDK_INT >= 31) add(Manifest.permission.BLUETOOTH_CONNECT)
   if (Build.VERSION.SDK_INT >= 33) add(Manifest.permission.NEARBY_WIFI_DEVICES)
   if (Build.VERSION.SDK_INT <= 32) add(Manifest.permission.ACCESS_FINE_LOCATION)
  }.toTypedArray()
  permissions.launch(needed)
  setContent { MeshHome() }
 }
 @OptIn(ExperimentalMaterial3Api::class)
 @Composable private fun MeshHome() {
  val caps = remember { RadioCapabilities.inspect(this) }
  val cipher = remember { MessageCipher() }
  val ble = remember { BleDiscovery(this) }
  val wifi = remember { WifiDirectDiscovery(this) }
  var status by remember { mutableStateOf("Ready to discover nearby UChat Mesh devices") }
  var message by remember { mutableStateOf("") }
  var localEcho by remember { mutableStateOf<List<String>>(emptyList()) }
  MaterialTheme(colorScheme = darkColorScheme()) {
   Scaffold(topBar = { TopAppBar(title = { Text("UChat Mesh") }, navigationIcon = { Icon(Icons.Default.Lock, null, Modifier.padding(start = 16.dp)) }) }) { padding ->
    Column(Modifier.fillMaxSize().padding(padding).padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
     Text("Private messaging across available radios", style = MaterialTheme.typography.titleMedium)
     Card { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
      Text("RADIO AVAILABILITY", style = MaterialTheme.typography.labelLarge)
      Text("Bluetooth LE: " + if (caps.bluetoothLe) "Supported" else "Unavailable")
      Text("Wi-Fi Direct: " + if (caps.wifiDirect) "Supported" else "Unavailable")
      Text("Wi-Fi Aware: " + if (caps.wifiAware) "Supported" else "Unavailable")
      Text("Wi-Fi enabled: " + caps.wifiEnabled)
     } }
     Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
      Button(onClick = {
       status = "Starting Bluetooth discovery…"
       val started = ble.start { peer -> status = "Nearby BLE device: " + peer }
       if (!started) status = "Bluetooth scan unavailable. Check permissions and device support."
      }, modifier = Modifier.weight(1f)) {
       Icon(Icons.Default.Radar, null); Spacer(Modifier.width(6.dp)); Text("Find devices")
      }
      OutlinedButton(onClick = { wifi.discover { _, text -> status = text } }, modifier = Modifier.weight(1f)) { Text("Wi-Fi Direct") }
     }
     Text(status, style = MaterialTheme.typography.bodySmall)
     HorizontalDivider()
     Text("Encrypted local test", style = MaterialTheme.typography.titleSmall)
     OutlinedTextField(value = message, onValueChange = { message = it }, label = { Text("Write a message") }, modifier = Modifier.fillMaxWidth())
     Button(onClick = {
      if (message.isNotBlank()) {
       val encrypted = cipher.encrypt(message.toByteArray())
       val recovered = cipher.decrypt(encrypted).decodeToString()
       localEcho = localEcho + "Local AES-256-GCM round-trip: " + recovered
       message = ""
      }
     }, modifier = Modifier.align(Alignment.End)) { Icon(Icons.Default.Send, null); Text("Test encryption") }
     LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) { items(localEcho) { Text(it) } }
     Text("Prototype: radio discovery and local encryption are implemented. Peer-to-peer encrypted transport, ratcheting sessions and background relay are not production-ready.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
    }
   }
  }
 }
}