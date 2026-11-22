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
