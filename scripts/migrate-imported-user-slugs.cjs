const fs = require('node:fs')
const path = require('node:path')
const Database = require('better-sqlite3')

const root = path.resolve(__dirname, '..')
const databasePath = path.resolve(root, process.env.EYZENCORE_SQLITE || 'data/eyzencore-auth.sqlite')
const backupDir = path.resolve(root, 'backups', `before-user-slugs-${new Date().toISOString().replace(/[:.]/g, '-')}`)

const transliteration = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye',
  ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'yi', й: 'i', к: 'k', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '',
  ю: 'yu', я: 'ya', ы: 'y', э: 'e', ё: 'yo', ъ: '',
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .split('')
    .map((character) => transliteration[character] ?? character)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'user'
}

if (!fs.existsSync(databasePath)) throw new Error(`Database not found: ${databasePath}`)
fs.mkdirSync(backupDir, { recursive: true })
fs.copyFileSync(databasePath, path.join(backupDir, path.basename(databasePath)))

const db = new Database(databasePath)
db.pragma('journal_mode = WAL')
const users = db.prepare('SELECT id, email, full_name, profile_slug FROM app_users ORDER BY created_at, id').all()
const used = new Set()
const update = db.prepare('UPDATE app_users SET profile_slug = ?, updated_at = ? WHERE id = ?')
const changes = []

db.transaction(() => {
  for (const user of users) {
    const fallback = String(user.email || '').split('@')[0]
    const base = slugify(user.full_name || fallback)
    let candidate = base
    let suffix = 2
    while (used.has(candidate)) candidate = `${base.slice(0, 85)}-${suffix++}`
    used.add(candidate)
    if (candidate === user.profile_slug) continue
    update.run(candidate, new Date().toISOString(), user.id)
    changes.push({ name: user.full_name, from: user.profile_slug, to: candidate })
  }
})()

console.log(JSON.stringify({
  backup: backupDir,
  users: users.length,
  changed: changes.length,
  preview: changes.slice(0, 20),
}, null, 2))
