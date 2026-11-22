package so.zite.uchat.mesh.security

import java.nio.ByteBuffer
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/**
 * Password-encrypted portable backup container.
 *
 * Format: magic("UCHB") || version(1) || salt(16) || nonce(12) || AES-256-GCM ciphertext.
 * Argon2id v1.3 uses 64 MiB memory, 3 iterations, and one lane. The cloud receives only this opaque container.
 * The password is never stored in the container or sent to a cloud provider.
 */
object BackupCrypto {
    private val magic = byteArrayOf(0x55, 0x43, 0x48, 0x42) // UCHB
    private const val VERSION: Byte = 2
    private const val SALT_BYTES = 16
    private const val NONCE_BYTES = 12
    private const val TAG_BITS = 128
    private const val ARGON2_ITERATIONS = 3
    private const val ARGON2_MEMORY_KIB = 64 * 1024
    private const val KEY_BITS = 256
    private const val MIN_PASSWORD_CHARS = 12
    private const val MAX_BACKUP_BYTES = 50 * 1024 * 1024
    private val random = SecureRandom()

    fun encrypt(plaintext: ByteArray, password: CharArray): ByteArray {
        require(password.size >= MIN_PASSWORD_CHARS) { "Use a backup password of at least 12 characters." }
        require(plaintext.size <= MAX_BACKUP_BYTES) { "Backup is too large." }
        val salt = ByteArray(SALT_BYTES).also(random::nextBytes)
        val nonce = ByteArray(NONCE_BYTES).also(random::nextBytes)
        val header = magic + byteArrayOf(VERSION) + salt + nonce
        val key = derive(password, salt)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key, GCMParameterSpec(TAG_BITS, nonce))
        cipher.updateAAD(header)
        return header + cipher.doFinal(plaintext)
    }

    fun decrypt(container: ByteArray, password: CharArray): ByteArray {
        require(password.size >= MIN_PASSWORD_CHARS) { "Backup password must contain at least 12 characters." }
        require(container.size in (magic.size + 1 + SALT_BYTES + NONCE_BYTES + 16)..(MAX_BACKUP_BYTES + 64)) {
            "Invalid or oversized backup file."
        }
        val headerSize = magic.size + 1 + SALT_BYTES + NONCE_BYTES
        val header = container.copyOfRange(0, headerSize)
        require(header.copyOfRange(0, magic.size).contentEquals(magic)) { "This is not a UChat backup." }
        require(header[magic.size] == VERSION) { "Unsupported backup format version." }
        val saltStart = magic.size + 1
        val salt = header.copyOfRange(saltStart, saltStart + SALT_BYTES)
        val nonce = header.copyOfRange(saltStart + SALT_BYTES, headerSize)
        val key = derive(password, salt)
        return try {
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(TAG_BITS, nonce))
            cipher.updateAAD(header)
            cipher.doFinal(container.copyOfRange(headerSize, container.size))
        } catch (e: Exception) {
            throw SecurityException("Backup authentication failed. Check your password or file integrity.", e)
        }
    }

    private fun derive(password: CharArray, salt: ByteArray): SecretKeySpec {
        val parameters = Argon2Parameters.Builder(Argon2Parameters.ARGON2_id)
            .withVersion(Argon2Parameters.ARGON2_VERSION_13)
            .withIterations(ARGON2_ITERATIONS)
            .withMemoryAsKB(ARGON2_MEMORY_KIB)
            .withParallelism(1)
            .withSalt(salt)
            .build()
        val bytes = ByteArray(KEY_BITS / 8)
        try {
            Argon2BytesGenerator().apply { init(parameters) }.generateBytes(password, bytes)
            return SecretKeySpec(bytes, "AES")
        } finally {
            bytes.fill(0)
            parameters.clear()
        }
    }
}
