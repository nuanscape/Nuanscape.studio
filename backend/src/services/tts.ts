import { spawn } from 'node:child_process'
import { AppError } from '../lib/errors.js'
import { synthesizeHeyGen } from './heygen.js'

export type TtsProvider = 'heygen' | 'edge'

const EDGE_TIMEOUT_MS = 60_000

export function ttsProvider(): TtsProvider {
  return process.env.TTS_PROVIDER?.trim() === 'edge' ? 'edge' : 'heygen'
}

function runEdgeTts(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new AppError(504, 'TTS_PROVIDER_TIMEOUT', 'edge-tts melebihi batas waktu.'))
    }, EDGE_TIMEOUT_MS)

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(new AppError(503, 'TTS_PROVIDER_UNAVAILABLE', `edge-tts: ${error.message}`))
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) {
        resolve()
        return
      }
      reject(new AppError(502, 'TTS_PROVIDER_FAILED', `edge-tts gagal: ${stderr.trim().slice(-300)}`))
    })
  })
}

export async function synthesizeSpeech(text: string, out: string): Promise<TtsProvider | null> {
  if (ttsProvider() === 'edge') {
    const command = process.env.EDGE_TTS_BIN?.trim() || 'edge-tts'
    const voice = process.env.EDGE_TTS_VOICE?.trim() || 'id-ID-ArdiNeural'
    try {
      await runEdgeTts(command, ['--voice', voice, '--text', text, '--write-media', out])
      return 'edge'
    } catch {
      return null
    }
  }

  await synthesizeHeyGen(text, out)
  return 'heygen'
}
