package com.uchat.mesh.transport

import android.content.Context
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.ConnectionInfo
import com.google.android.gms.nearby.connection.ConnectionLifecycleCallback
import com.google.android.gms.nearby.connection.ConnectionResolution
import com.google.android.gms.nearby.connection.ConnectionsClient
import com.google.android.gms.nearby.connection.DiscoveredEndpointInfo
import com.google.android.gms.nearby.connection.EndpointDiscoveryCallback
import com.google.android.gms.nearby.connection.Payload
import com.google.android.gms.nearby.connection.PayloadCallback
import com.google.android.gms.nearby.connection.PayloadTransferUpdate
import com.google.android.gms.nearby.connection.Strategy

/**
 * Nearby Connections transport. Google Play services selects Bluetooth/Wi-Fi radios.
 * Incoming peers are NOT accepted automatically: the UI must display and verify
 * authenticationDigits, then call accept() or reject().
 *
 * Payload bytes are application-owned. Callers must encrypt them before send().
 */
class NearbyMeshTransport(
    context: Context,
    private val listener: Listener
) {
    interface Listener {
        fun onStatus(message: String)
        fun onPeerFound(endpointId: String, name: String)
        fun onPeerLost(endpointId: String)
        fun onVerificationRequired(endpointId: String, name: String, authenticationDigits: String)
        fun onConnected(endpointId: String)
        fun onDisconnected(endpointId: String)
        fun onBytesReceived(endpointId: String, bytes: ByteArray)
        fun onFailure(message: String)
    }

    private val client: ConnectionsClient = Nearby.getConnectionsClient(context.applicationContext)
    private val serviceId = context.packageName + ".uchat-mesh"
    private val strategy = Strategy.P2P_CLUSTER
    private val connected = linkedSetOf<String>()

    private val payloadCallback = object : PayloadCallback() {
        override fun onPayloadReceived(endpointId: String, payload: Payload) {
            if (payload.type == Payload.Type.BYTES) {
                payload.asBytes()?.let { listener.onBytesReceived(endpointId, it) }
            }
        }

        override fun onPayloadTransferUpdate(endpointId: String, update: PayloadTransferUpdate) = Unit
    }

    private val lifecycle = object : ConnectionLifecycleCallback() {
        override fun onConnectionInitiated(endpointId: String, info: ConnectionInfo) {
            listener.onVerificationRequired(endpointId, info.endpointName, info.authenticationDigits)
        }

        override fun onConnectionResult(endpointId: String, result: ConnectionResolution) {
            if (result.status.isSuccess) {
                connected.add(endpointId)
                listener.onConnected(endpointId)
            } else {
                listener.onFailure("Connection rejected or failed: ${result.status.statusCode}")
            }
        }

        override fun onDisconnected(endpointId: String) {
            connected.remove(endpointId)
            listener.onDisconnected(endpointId)
        }
    }

    private val discovery = object : EndpointDiscoveryCallback() {
        override fun onEndpointFound(endpointId: String, info: DiscoveredEndpointInfo) {
            listener.onPeerFound(endpointId, info.endpointName)
        }

        override fun onEndpointLost(endpointId: String) {
            listener.onPeerLost(endpointId)
        }
    }

    fun advertise(deviceName: String) {
        client.startAdvertising(
            deviceName.take(32), serviceId, lifecycle,
            com.google.android.gms.nearby.connection.AdvertisingOptions.Builder()
                .setStrategy(strategy).build()
        ).addOnSuccessListener { listener.onStatus("Visible to nearby UChat devices") }
            .addOnFailureListener { listener.onFailure("Advertising failed: ${it.localizedMessage}") }
    }

    fun requestConnection(deviceName: String, endpointId: String) {
        client.requestConnection(deviceName.take(32), endpointId, lifecycle)
            .addOnFailureListener { listener.onFailure("Connection request failed: ${it.localizedMessage}") }
    }

    fun discover() {
        client.startDiscovery(
            serviceId, discovery,
            com.google.android.gms.nearby.connection.DiscoveryOptions.Builder()
                .setStrategy(strategy).build()
        ).addOnSuccessListener { listener.onStatus("Searching nearby UChat devices") }
            .addOnFailureListener { listener.onFailure("Discovery failed: ${it.localizedMessage}") }
    }

    /** Call only after the user has compared the same authentication digits on both devices. */
    fun accept(endpointId: String) {
        client.acceptConnection(endpointId, payloadCallback)
            .addOnFailureListener { listener.onFailure("Could not accept peer: ${it.localizedMessage}") }
    }

    fun reject(endpointId: String) {
        client.rejectConnection(endpointId)
            .addOnFailureListener { listener.onFailure("Could not reject peer: ${it.localizedMessage}") }
    }

    /** Sends an already-encrypted byte payload to a connected peer. */
    fun sendEncrypted(endpointId: String, ciphertext: ByteArray) {
        require(endpointId in connected) { "Peer is not connected" }
        require(ciphertext.isNotEmpty() && ciphertext.size <= 32 * 1024) { "Payload must be 1..32768 bytes" }
        client.sendPayload(endpointId, Payload.fromBytes(ciphertext))
            .addOnFailureListener { listener.onFailure("Send failed: ${it.localizedMessage}") }
    }

    fun stop() {
        client.stopAdvertising()
        client.stopDiscovery()
        client.stopAllEndpoints()
        connected.clear()
    }
}
