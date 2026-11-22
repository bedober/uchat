package com.uchat.mesh.security

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class BackupCryptoTest {
    @Test fun backupRoundTripsWithCorrectPassword() {
        val source = "private UChat backup".toByteArray()
        val encrypted = BackupCrypto.encrypt(source, "a-long-unique-backup-passphrase".toCharArray())
        assertArrayEquals(source, BackupCrypto.decrypt(encrypted, "a-long-unique-backup-passphrase".toCharArray()))
    }

    @Test fun wrongPasswordIsRejected() {
        val encrypted = BackupCrypto.encrypt(byteArrayOf(1, 2, 3), "correct-horse-battery-staple".toCharArray())
        assertThrows(SecurityException::class.java) {
            BackupCrypto.decrypt(encrypted, "incorrect-password".toCharArray())
        }
    }

    @Test fun tamperingIsRejected() {
        val encrypted = BackupCrypto.encrypt(byteArrayOf(1, 2, 3), "correct-horse-battery-staple".toCharArray())
        encrypted[encrypted.lastIndex] = (encrypted.last().toInt() xor 1).toByte()
        assertThrows(SecurityException::class.java) {
            BackupCrypto.decrypt(encrypted, "correct-horse-battery-staple".toCharArray())
        }
    }

    @Test fun shortPasswordIsRejected() {
        assertThrows(IllegalArgumentException::class.java) {
            BackupCrypto.encrypt(byteArrayOf(1), "short".toCharArray())
        }
    }
}
