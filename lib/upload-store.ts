import path from 'node:path'

export const UPLOAD_URL_PREFIX = '/api/uploads'

export function getUploadsRoot() {
  const configured = process.env.EYZENCORE_UPLOADS_DIR || process.env.UPLOADS_DIR
  if (configured) return path.resolve(configured)
  return path.join(process.cwd(), 'public', 'uploads')
}

export function buildUploadUrl(kind: string, subdir: string, filename: string) {
  return `${UPLOAD_URL_PREFIX}/${kind}/${subdir}/${filename}`
}

export function resolveUploadPath(parts: string[]) {
  const root = getUploadsRoot()
  const normalizedParts = parts
    .map((part) => String(part || '').trim())
    .filter(Boolean)

  if (!normalizedParts.length || normalizedParts.some((part) => part === '..' || part.includes('/') || part.includes('\\'))) {
    return null
  }

  const filePath = path.resolve(root, ...normalizedParts)
  const relative = path.relative(root, filePath)
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null
  return filePath
}
