const IPV4_PATTERN = /^\d{1,3}(\.\d{1,3}){3}$/

export function isIpv4Host(value: string): boolean {
  return IPV4_PATTERN.test(value.trim())
}

export function extractServerHost(addr: string): string {
  const raw = String(addr || '').trim()
  if (!raw) return ''
  return raw.includes(':') ? raw.split(':')[0].trim() : raw
}

export function normalizeDnsHostname(value: string): string | null {
  const host = String(value || '').trim().toLowerCase().replace(/\.$/, '')
  if (!host || host.length > 253) return null
  if (isIpv4Host(host)) return null
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(host)) return null
  return host
}

export function resolveDnsVerificationHostname(input: {
  serverAddr: string
  requestedHostname?: string
}): { hostname: string } | { error: string } {
  const requested = String(input.requestedHostname || '').trim()
  if (requested) {
    const normalized = normalizeDnsHostname(requested)
    if (!normalized) {
      return { error: 'Вкажіть коректне доменне імʼя для DNS TXT (наприклад play.example.com).' }
    }
    return { hostname: normalized }
  }
  const addrHost = extractServerHost(input.serverAddr)
  if (!addrHost || isIpv4Host(addrHost)) {
    return {
      error: 'Для DNS TXT вкажіть домен, на якому ви додали TXT-запис (наприклад play.example.com).',
    }
  }
  const normalized = normalizeDnsHostname(addrHost)
  if (!normalized) {
    return { error: 'Адреса сервера не є коректним доменом для DNS TXT верифікації.' }
  }
  return { hostname: normalized }
}
