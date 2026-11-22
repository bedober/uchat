package com.uchat.mesh.security

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

class SharedKeyCipherTest {
    private val key = "0123456789abcdef".repeat(4)

    @Test fun roundTripRestoresPlaintext() {
        val plain = "UChat encrypted message".toByteArray()
        assertArrayEquals(plain, SharedKeyCipher.decrypt(key, SharedKeyCipher.encrypt(key, plain)))
    }

    @Test fun eachEncryptionUsesFreshNonce() {
        val plain = "same message".toByteArray()
        val first = SharedKeyCipher.encrypt(key, plain)
        val second = SharedKeyCipher.encrypt(key, plain)
        assertNotEquals(first.toList(), second.toList())
    }

    @Test(expected = javax.crypto.AEADBadTagException::class)
    fun wrongKeyCannotDecrypt() {
        val packet = SharedKeyCipher.encrypt(key, "secret".toByteArray())
        SharedKeyCipher.decrypt("fedcba9876543210".repeat(4), packet)
    }

    @Test(expected = javax.crypto.AEADBadTagException::class)
    fun tamperedCiphertextIsRejected() {
        val packet = SharedKeyCipher.encrypt(key, "secret".toByteArray())
        packet[packet.lastIndex] = (packet.last().toInt() xor 1).toByte()
        SharedKeyCipher.decrypt(key, packet)
    }
}
