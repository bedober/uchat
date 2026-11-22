/// Production E2EE must be provided by a reviewed Signal Protocol implementation.
/// This interface deliberately fails closed until the native/FFI Signal adapter,
/// identity verification, pre-key lifecycle and interoperability tests are added.
abstract interface class EncryptionAdapter {
  Future<bool> get isReady;
  Future<List<int>> encrypt({
    required String conversationId,
    required List<int> plaintext,
  });
  Future<List<int>> decrypt({
    required String conversationId,
    required List<int> ciphertext,
  });
}

class SignalProtocolNotConfigured implements EncryptionAdapter {
  @override
  Future<bool> get isReady async => false;

  @override
  Future<List<int>> encrypt({
    required String conversationId,
    required List<int> plaintext,
  }) {
    throw StateError('Signal Protocol is not configured. Message sending is disabled.');
  }

  @override
  Future<List<int>> decrypt({
    required String conversationId,
    required List<int> ciphertext,
  }) {
    throw StateError('Signal Protocol is not configured. Message decryption is disabled.');
  }
}
