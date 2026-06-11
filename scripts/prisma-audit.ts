import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const sourceRoots = ['app', 'components', 'discord-bot', 'lib', 'scripts']
const ignoredDirectories = new Set(['generated', 'node_modules', '.next'])
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])

const forbiddenPatterns = [
  { label: 'node:sqlite', pattern: /(?:from\s+['"]node:sqlite['"]|require\(['"]node:sqlite['"]\))/ },
  { label: 'sqlite3 package', pattern: /(?:from\s+['"]sqlite3['"]|require\(['"]sqlite3['"]\))/ },
  {
    label: 'direct better-sqlite3 usage',
    pattern: /(?:from\s+['"]better-sqlite3['"]|require\(['"]better-sqlite3['"]\))/,
  },
]

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : collectFiles(fullPath)
    }
    return sourceExtensions.has(path.extname(entry.name)) ? [fullPath] : []
  }))
  return files.flat()
}

async function main(): Promise<void> {
  const files = (await Promise.all(sourceRoots.map((directory) => collectFiles(path.join(root, directory))))).flat()
  const violations: string[] = []

  for (const file of files) {
    if (file === path.join(root, 'lib', 'prisma.ts')) continue
    const content = await readFile(file, 'utf8')
    for (const forbidden of forbiddenPatterns) {
      if (forbidden.pattern.test(content)) {
        violations.push(`${path.relative(root, file)}: ${forbidden.label}`)
      }
    }
  }

  if (violations.length > 0) {
    throw new Error(`Database access must go through Prisma:\n${violations.join('\n')}`)
  }

  console.log(`Prisma audit passed for ${files.length} source files`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
