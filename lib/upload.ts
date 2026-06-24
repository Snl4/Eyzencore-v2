// Client-side helper for uploading files via /api/uploads.
// Returns the public URL of the saved file or throws with a user-friendly message.

export type UploadKind = 'news' | 'forum' | 'avatar' | 'banner' | 'misc' | 'animilair'

export type UploadedFile = {
  url: string
  kind: 'image' | 'video' | 'file'
  mime: string
  size: number
  name: string
}

export async function uploadFile(file: File, kind: UploadKind = 'news'): Promise<UploadedFile> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('kind', kind)

  const response = await fetch('/api/uploads', {
    method: 'POST',
    body: formData,
  })

  let payload: Record<string, unknown> = {}
  try {
    payload = (await response.json()) as Record<string, unknown>
  } catch {
    payload = {}
  }

  if (!response.ok || typeof payload.url !== 'string') {
    const message = typeof payload.error === 'string' ? payload.error : 'Не вдалося завантажити файл'
    throw new Error(message)
  }

  return {
    url: String(payload.url),
    kind: payload.kind === 'video' ? 'video' : payload.kind === 'file' ? 'file' : 'image',
    mime: typeof payload.mime === 'string' ? payload.mime : '',
    size: typeof payload.size === 'number' ? payload.size : 0,
    name: typeof payload.name === 'string' ? payload.name : file.name,
  }
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
