package com.uchat.mesh.security

import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.PublicKey
import javax.crypto.KeyAgreement
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/** X25519 ephemeral agreement and HKDF-SHA256 derivation primitive. */
object MeshKeyAgreement {
 fun newEphemeralKeyPair(): KeyPair = KeyPairGenerator.getInstance("X25519").generateKeyPair()
 fun deriveSessionKey(localPrivate: java.security.PrivateKey, remotePublic: PublicKey, salt: ByteArray): ByteArray {
  val agreement = KeyAgreement.getInstance("X25519")
  agreement.init(localPrivate); agreement.doPhase(remotePublic, true)
  return hkdf(agreement.generateSecret(), salt, "UChatMesh-v1".toByteArray(), 32)
 }
 private fun hkdf(ikm: ByteArray, salt: ByteArray, info: ByteArray, length: Int): ByteArray {
  val mac = Mac.getInstance("HmacSHA256")
  mac.init(SecretKeySpec(if (salt.isEmpty()) ByteArray(32) else salt, "HmacSHA256"))
  val prk = mac.doFinal(ikm)
  val out = ByteArray(length); var previous = byteArrayOf(); var offset = 0; var counter = 1
  while (offset < length) {
   mac.init(SecretKeySpec(prk, "HmacSHA256")); mac.update(previous); mac.update(info); mac.update(counter.toByte())
   previous = mac.doFinal()
   val count = minOf(previous.size, length - offset)
   System.arraycopy(previous, 0, out, offset, count); offset += count; counter++
  }
  return out
 }
}