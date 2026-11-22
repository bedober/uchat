package so.zite.uchat.mesh.security

import android.content.Context
import android.util.Base64
import org.json.JSONArray
import java.io.File

/**
 * App-private encrypted storage for the prototype's conversation key and message transcript.
 * The wrapping AES key is generated and held by Android Keystore via MessageCipher.
 */
class SecureLocalStore(context: Context) {
    private val directory = File(context.filesDir, "uchat-secure").apply { mkdirs() }
    private val cipher = MessageCipher()
    private val keyFile = File(directory, "conversation-key.bin")
    private val messagesFile = File(directory, "messages.bin")

    @Synchronized
    fun saveConversationKey(hex: String) {
        if (hex.isEmpty()) {
            keyFile.delete()
            return
        }
        require(hex.length == 64 && hex.all { it in "0123456789abcdefABCDEF" }) {
            "Conversation key must be 64 hexadecimal characters"
        }
        keyFile.writeBytes(cipher.encrypt(hex.toByteArray(Charsets.UTF_8), "conversation-key-v1".toByteArray()))
    }

    @Synchronized
    fun loadConversationKey(): String {
        if (!keyFile.exists()) return ""
        return try {
            cipher.decrypt(keyFile.readBytes(), "conversation-key-v1".toByteArray()).toString(Charsets.UTF_8)
        } catch (_: Exception) {
            keyFile.delete()
            ""
        }
    }

    @Synchronized
    fun saveMessages(messages: List<String>) {
        val json = JSONArray()
        messages.takeLast(500).forEach { json.put(it) }
        messagesFile.writeBytes(cipher.encrypt(json.toString().toByteArray(Charsets.UTF_8), "chat-history-v1".toByteArray()))
    }

    /** Plaintext snapshot exists only in memory before being encrypted by BackupCrypto. */
    @Synchronized
    fun exportPortableBackup(): ByteArray {
        val root = org.json.JSONObject()
            .put("schema", 1)
            .put("conversationKey", loadConversationKey())
            .put("messages", JSONArray().also { array -> loadMessages().forEach(array::put) })
        return root.toString().toByteArray(Charsets.UTF_8)
    }

    /** Validate the complete backup before changing the local encrypted store. */
    @Synchronized
    fun restorePortableBackup(payload: ByteArray) {
        require(payload.size <= 50 * 1024 * 1024) { "Backup is too large." }
        val root = org.json.JSONObject(payload.toString(Charsets.UTF_8))
        require(root.optInt("schema", -1) == 1) { "Unsupported UChat backup schema." }
        val restoredKey = root.optString("conversationKey", "")
        require(restoredKey.isEmpty() || (restoredKey.length == 64 && restoredKey.all { it in "0123456789abcdefABCDEF" })) {
            "Backup contains an invalid conversation key."
        }
        val array = root.optJSONArray("messages") ?: JSONArray()
        require(array.length() <= 500) { "Backup contains too many messages." }
        val restoredMessages = (0 until array.length()).map { array.getString(it) }
        // Re-encrypt restored values using this device's non-exportable Android Keystore key.
        saveConversationKey(restoredKey)
        saveMessages(restoredMessages)
    }

    @Synchronized
    fun loadMessages(): List<String> {
        if (!messagesFile.exists()) return emptyList()
        return try {
            val clear = cipher.decrypt(messagesFile.readBytes(), "chat-history-v1".toByteArray()).toString(Charsets.UTF_8)
            val json = JSONArray(clear)
            (0 until json.length()).map { json.getString(it) }
        } catch (_: Exception) {
            messagesFile.delete()
            emptyList()
        }
    }
}
