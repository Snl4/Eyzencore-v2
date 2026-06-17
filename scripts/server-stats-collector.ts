import { listServers } from '@/lib/auth-db'

const DEFAULT_INTERVAL_MS = 60_000
const intervalMs = Math.max(
  15_000,
  Number(process.env.STATS_COLLECTOR_INTERVAL_MS || DEFAULT_INTERVAL_MS)
)
const baseUrl = (
  process.env.STATS_COLLECTOR_BASE_URL ||
  process.env.MAINTENANCE_INTERNAL_ORIGIN ||
  `http://127.0.0.1:${process.env.PORT || '3001'}`
).replace(/\/+$/, '')

let running = false

async function collectOnce() {
  if (running) return
  running = true
  try {
    const servers = await listServers()
    const activeServers = servers.filter((server) => server.addr)
    let saved = 0
    for (const server of activeServers) {
      try {
        const response = await fetch(`${baseUrl}/api/servers/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            addr: server.addr,
            core: server.core || 'java',
            platform: server.platform || 'minecraft',
            serverId: server.seed,
            allowExisting: true,
          }),
          cache: 'no-store',
        })
        if (response.ok) saved += 1
      } catch (error) {
        console.warn(`[stats] failed to collect server ${server.seed}:`, error)
      }
    }
    console.log(`[stats] collected ${saved}/${activeServers.length} servers at ${new Date().toISOString()}`)
  } catch (error) {
    console.error('[stats] collector cycle failed:', error)
  } finally {
    running = false
  }
}

void collectOnce()
setInterval(() => {
  void collectOnce()
}, intervalMs)
