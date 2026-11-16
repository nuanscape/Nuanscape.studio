import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { AppError } from './errors.js'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const KEY_BYTES = 32

export interface EncryptedSecret {
  ciphertext: string
  iv: string
  tag: string
  version: number
}

function encryptionKey(): Buffer {
  const raw = process.env.PROVIDER_ENCRYPTION_KEY?.trim()
  if (!raw) {
    throw new AppError(
      503,
      'ENCRYPTION_NOT_CONFIGURED',
      'PROVIDER_ENCRYPTION_KEY belum diatur di backend.',
    )
  }

  const key = Buffer.from(raw, 'base64')
  if (key.length !== KEY_BYTES) {
    throw new AppError(
      503,
      'ENCRYPTION_INVALID_KEY',
      `PROVIDER_ENCRYPTION_KEY harus berupa base64 dari ${KEY_BYTES} byte.`,
    )
  }
  return key
}

function keyVersion(): number {
  const parsed = Number(process.env.PROVIDER_ENCRYPTION_KEY_VERSION ?? 1)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

export function encryptSecret(plaintext: string, aad: string): EncryptedSecret {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv)
  cipher.setAAD(Buffer.from(aad, 'utf8'))
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    version: keyVersion(),
  }
}

export function decryptSecret(secret: EncryptedSecret, aad: string): string {
  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      encryptionKey(),
      Buffer.from(secret.iv, 'base64'),
    )
    decipher.setAAD(Buffer.from(aad, 'utf8'))
    decipher.setAuthTag(Buffer.from(secret.tag, 'base64'))
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(secret.ciphertext, 'base64')),
      decipher.final(),
    ])
    return plaintext.toString('utf8')
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError(
      500,
      'DECRYPTION_FAILED',
      'API key tersimpan tidak dapat didekripsi. Periksa PROVIDER_ENCRYPTION_KEY.',
    )
  }
}

export function secretFingerprint(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex')
}

export function maskSecret(secret: string): string {
  const trimmed = secret.trim()
  if (trimmed.length <= 8) return '••••••••'
  const prefixLength = trimmed.includes('-') ? Math.min(6, trimmed.indexOf('-') + 1) : 3
  return `${trimmed.slice(0, prefixLength)}••••••••${trimmed.slice(-4)}`
}
