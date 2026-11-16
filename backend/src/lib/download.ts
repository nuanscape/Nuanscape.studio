import { writeFile } from 'node:fs/promises'
import { AppError } from './errors.js'

export async function downloadToFile(
  url: string,
  out: string,
  timeoutMs: number,
  label: string,
): Promise<Buffer> {
  let response: Response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
  } catch (error) {
    throw new AppError(
      504,
      'MEDIA_DOWNLOAD_TIMEOUT',
      `${label} tidak dapat diunduh: ${error instanceof Error ? error.message : 'timeout'}`,
    )
  }

  if (!response.ok) {
    throw new AppError(
      502,
      'MEDIA_DOWNLOAD_FAILED',
      `${label} gagal diunduh (HTTP ${response.status}).`,
    )
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length === 0) {
    throw new AppError(502, 'MEDIA_DOWNLOAD_EMPTY', `${label} kosong.`)
  }
  await writeFile(out, buffer)
  return buffer
}
