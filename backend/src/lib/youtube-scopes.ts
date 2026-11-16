export const YOUTUBE_UPLOAD_SCOPE = 'https://www.googleapis.com/auth/youtube.upload'

export function hasYouTubeUploadScope(scopes: string | null | undefined): boolean {
  return (scopes ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .includes(YOUTUBE_UPLOAD_SCOPE)
}
