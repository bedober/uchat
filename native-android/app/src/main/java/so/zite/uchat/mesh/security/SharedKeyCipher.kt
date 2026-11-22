package com.uchat.mesh.security

import java.nio.ByteBuffer
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * Optional manually shared 256-bit conversation key.
 * Both participants must independently enter the same 64-character hex key.
 * Never transmit the key through the chat transport.
 */
object SharedKeyCipher {
    private fun key(hex: String): ByteArray {
        require(hex.length == 64 && hex.all { it in "0123456789abcdefABCDEF" }) {
            "Enter a 64-character hexadecimal key (32 bytes)"
        }
        return ByteArray(32) { i -> hex.substring(i * 2, i * 2 + 2).toInt(16).toByte() }
    }

    fun encrypt(keyHex: String, plaintext: ByteArray): ByteArray {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(key(keyHex), "AES"))
        val ciphertext = cipher.doFinal(plaintext)
        return ByteBuffer.allocate(1 + cipher.iv.size + ciphertext.size)
            .put(cipher.iv.size.toByte()).put(cipher.iv).put(ciphertext).array()
    }

    fun decrypt(keyHex: String, packet: ByteArray): ByteArray {
        require(packet.size >= 1 + 12 + 16) { "Invalid encrypted message" }
        val input = ByteBuffer.wrap(packet)
        val nonceLength = input.get().toInt() and 0xff
        require(nonceLength == 12 && input.remaining() > nonceLength + 15) { "Invalid AES-GCM packet" }
        val nonce = ByteArray(nonceLength).also(input::get)
        val ciphertext = ByteArray(input.remaining()).also(input::get)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(key(keyHex), "AES"), GCMParameterSpec(128, nonce))
        return cipher.doFinal(ciphertext)
    }
}
