package so.zite.uchat.mesh.security

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.nio.ByteBuffer
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Device-local AES-256-GCM encryption for data at rest. */
class MessageCipher {
 private val alias = "uchat_mesh_local_aes256_v1"
 private fun key(): SecretKey {
  val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
  (store.getKey(alias, null) as? SecretKey)?.let { return it }
  val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
  generator.init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
   .setKeySize(256).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
   .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setRandomizedEncryptionRequired(true).build())
  return generator.generateKey()
 }
 fun encrypt(plain: ByteArray, aad: ByteArray = byteArrayOf()): ByteArray {
  val cipher = Cipher.getInstance("AES/GCM/NoPadding")
  cipher.init(Cipher.ENCRYPT_MODE, key()); cipher.updateAAD(aad)
  val encrypted = cipher.doFinal(plain)
  return ByteBuffer.allocate(1 + cipher.iv.size + encrypted.size).put(cipher.iv.size.toByte()).put(cipher.iv).put(encrypted).array()
 }
 fun decrypt(packet: ByteArray, aad: ByteArray = byteArrayOf()): ByteArray {
  require(packet.isNotEmpty()) { "Empty encrypted packet" }
  val input = ByteBuffer.wrap(packet)
  val nonceSize = input.get().toInt() and 0xff
  require(nonceSize == 12 && input.remaining() > nonceSize) { "Invalid AES-GCM packet" }
  val nonce = ByteArray(nonceSize).also(input::get)
  val ciphertext = ByteArray(input.remaining()).also(input::get)
  val cipher = Cipher.getInstance("AES/GCM/NoPadding")
  cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, nonce)); cipher.updateAAD(aad)
  return cipher.doFinal(ciphertext)
 }
}