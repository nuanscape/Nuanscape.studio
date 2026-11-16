import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const SCRYPT_N = 16_384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LENGTH = 64
const SALT_LENGTH = 16

function derive(
  password: string,
  salt: string,
  keyLength: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error)
      else resolve(derivedKey)
    })
  })
}

/** Format: scrypt$N$r$p$saltHex$hashHex */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString('hex')
  const derived = await derive(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derived.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false

  const [, rawN, rawR, rawP, salt, hashHex] = parts
  const n = Number(rawN)
  const r = Number(rawR)
  const p = Number(rawP)
  if (!n || !r || !p || !salt || !hashHex) return false
  if (n !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P) return false

  const expected = Buffer.from(hashHex, 'hex')
  if (expected.length !== KEY_LENGTH) return false

  const derived = await derive(password, salt, expected.length, { N: n, r, p })
  return timingSafeEqual(derived, expected)
}
