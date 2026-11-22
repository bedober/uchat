package so.zite.uchat.mesh.transport

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import so.zite.uchat.mesh.MainActivity
import so.zite.uchat.mesh.R
import so.zite.uchat.mesh.security.SecureLocalStore
import so.zite.uchat.mesh.security.SharedKeyCipher
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.*

/**
 * User-started foreground presence service. It advertises and discovers UChat peers
 * through Nearby Connections while the UI is backgrounded. Payloads are expected
 * to be application-encrypted; received ciphertext is authenticated/decrypted before
 * being written to the app-private encrypted transcript.
 *
 * This prototype accepts the Nearby transport handshake automatically. It does NOT
 * treat transport acceptance as user identity verification; AES-GCM authentication
 * with the pre-shared conversation key is still required for message contents.
 */
class BackgroundMeshService : Service() {
    companion object {
        const val ACTION_START = "so.zite.uchat.mesh.action.START_BACKGROUND"
        const val ACTION_STOP = "so.zite.uchat.mesh.action.STOP_BACKGROUND"
        private const val CHANNEL_ID = "uchat_mesh_presence"
        private const val NOTIFICATION_ID = 4201
        private const val SERVICE_ID_SUFFIX = ".uchat-mesh"
    }

    private val client by lazy { Nearby.getConnectionsClient(this) }
    private val connected = linkedSetOf<String>()
    private val store by lazy { SecureLocalStore(this) }

    private val payloadCallback = object : PayloadCallback() {
        override fun onPayloadReceived(endpointId: String, payload: Payload) {
            if (payload.type != Payload.Type.BYTES) return
            val bytes = payload.asBytes() ?: return
            try {
                val key = store.loadConversationKey()
                val clear = SharedKeyCipher.decrypt(key, bytes).decodeToString()
                val history = store.loadMessages().toMutableList()
                history.add("Nearby: $clear")
                store.saveMessages(history)
                updateNotification("Encrypted message received from a nearby device")
            } catch (_: Exception) {
                // Never store or display unauthenticated plaintext.
                updateNotification("Nearby device sent data that could not be authenticated")
            }
        }
        override fun onPayloadTransferUpdate(endpointId: String, update: PayloadTransferUpdate) = Unit
    }

    private val lifecycle = object : ConnectionLifecycleCallback() {
        override fun onConnectionInitiated(endpointId: String, info: ConnectionInfo) {
            // The transport handshake is accepted so an already-keyed peer can deliver.
            // Message authenticity/confidentiality is enforced separately by AES-GCM.
            client.acceptConnection(endpointId, payloadCallback)
        }
        override fun onConnectionResult(endpointId: String, result: ConnectionResolution) {
            if (result.status.isSuccess) {
                connected.add(endpointId)
                updateNotification("Connected to ${connected.size} nearby UChat device(s)")
            } else {
                updateNotification("Nearby connection was not established")
            }
        }
        override fun onDisconnected(endpointId: String) {
            connected.remove(endpointId)
            updateNotification("Searching for nearby UChat devices")
        }
    }

    private val discovery = object : EndpointDiscoveryCallback() {
        override fun onEndpointFound(endpointId: String, info: DiscoveredEndpointInfo) {
            client.requestConnection("UChat Android", endpointId, lifecycle)
        }
        override fun onEndpointLost(endpointId: String) = Unit
    }

    override fun onCreate() {
        super.onCreate()
        createChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopNearby()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_START, null -> {
                startForeground(NOTIFICATION_ID, notification("Starting nearby discovery"))
                startNearby()
            }
        }
        return START_STICKY
    }

    private fun startNearby() {
        val name = Build.MODEL?.take(32)?.ifBlank { "UChat Android" } ?: "UChat Android"
        val serviceId = packageName + SERVICE_ID_SUFFIX
        client.startAdvertising(name, serviceId, lifecycle,
            AdvertisingOptions.Builder().setStrategy(Strategy.P2P_CLUSTER).build())
            .addOnFailureListener { updateNotification("Advertising unavailable: ${it.localizedMessage}") }
        client.startDiscovery(serviceId, discovery,
            DiscoveryOptions.Builder().setStrategy(Strategy.P2P_CLUSTER).build())
            .addOnFailureListener { updateNotification("Discovery unavailable: ${it.localizedMessage}") }
        updateNotification("Searching nearby — internet is not required")
    }

    private fun stopNearby() {
        client.stopAdvertising()
        client.stopDiscovery()
        client.stopAllEndpoints()
        connected.clear()
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            val channel = NotificationChannel(CHANNEL_ID, "UChat nearby connection",
                NotificationManager.IMPORTANCE_LOW).apply {
                description = "Shows when UChat is available for nearby offline messaging"
                setShowBadge(false)
            }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    private fun notification(message: String): Notification {
        val openApp = PendingIntent.getActivity(this, 0,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_notify_chat)
            .setContentTitle("UChat nearby mode")
            .setContentText(message)
            .setContentIntent(openApp)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    private fun updateNotification(message: String) {
        getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, notification(message))
    }

    override fun onDestroy() {
        stopNearby()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
