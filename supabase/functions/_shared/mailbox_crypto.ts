// AES-GCM via Deno's built-in Web Crypto — no external crypto dependency.
// Key is MAILBOX_ENCRYPTION_KEY (random 32 bytes, base64), set once via
// `supabase secrets set MAILBOX_ENCRYPTION_KEY=$(openssl rand -base64 32)`.

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function bytesToB64(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function b64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

async function getKey(): Promise<CryptoKey> {
  const keyB64 = Deno.env.get('MAILBOX_ENCRYPTION_KEY')
  if (!keyB64) throw new Error('MAILBOX_ENCRYPTION_KEY is not configured on this function.')
  return crypto.subtle.importKey('raw', b64ToBytes(keyB64), 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])
}

export async function encryptSecret(plaintext: string): Promise<{ ciphertext: string; iv: string }> {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext),
  )
  return { ciphertext: bytesToB64(new Uint8Array(encrypted)), iv: bytesToB64(iv) }
}

export async function decryptSecret(ciphertext: string, iv: string): Promise<string> {
  const key = await getKey()
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(iv) },
    key,
    b64ToBytes(ciphertext),
  )
  return decoder.decode(decrypted)
}
