const DB_NAME = 'uchat-device-vault';
const STORE_NAME = 'vault';
const KEY_ID = 'preferences-key';
const DATA_ID = 'preferences-data';

function openVault(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open encrypted device storage'));
  });
}

async function getOrCreateKey(db: IDBDatabase): Promise<CryptoKey> {
  const existing = await new Promise<CryptoKey | undefined>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(KEY_ID);
    request.onsuccess = () => resolve(request.result as CryptoKey | undefined);
    request.onerror = () => reject(request.error);
  });
  if (existing) return existing;

  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(key, KEY_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Could not store device encryption key'));
  });
  return key;
}

export async function readEncryptedPreferences<T>(): Promise<T | null> {
  if (!('indexedDB' in window) || !('crypto' in window) || !crypto.subtle) {
    throw new Error('This browser does not support encrypted local storage.');
  }
  const db = await openVault();
  try {
    const record = await new Promise<{ iv: ArrayBuffer; ciphertext: ArrayBuffer } | undefined>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(DATA_ID);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (!record) return null;
    const key = await getOrCreateKey(db);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: record.iv }, key, record.ciphertext);
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } finally {
    db.close();
  }
}

export async function writeEncryptedPreferences(value: unknown): Promise<void> {
  if (!('indexedDB' in window) || !('crypto' in window) || !crypto.subtle) {
    throw new Error('This browser does not support encrypted local storage.');
  }
  const db = await openVault();
  try {
    const key = await getOrCreateKey(db);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode(JSON.stringify(value));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ iv: iv.buffer, ciphertext }, DATA_ID);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Could not save encrypted preferences'));
    });
  } finally {
    db.close();
  }
}
