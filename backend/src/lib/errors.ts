export class AppError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly details?: unknown

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    if (details !== undefined) this.details = details
  }
}

export function badRequest(code: string, message: string, details?: unknown): AppError {
  return new AppError(400, code, message, details)
}

export function unauthorized(message = 'Sesi tidak valid atau sudah berakhir.'): AppError {
  return new AppError(401, 'UNAUTHORIZED', message)
}

export function forbidden(message = 'Akses ditolak.'): AppError {
  return new AppError(403, 'FORBIDDEN', message)
}

export function notFound(message = 'Data tidak ditemukan.'): AppError {
  return new AppError(404, 'NOT_FOUND', message)
}

export function conflict(code: string, message: string): AppError {
  return new AppError(409, code, message)
}
