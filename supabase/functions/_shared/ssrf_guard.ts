// Blocks an Edge Function (which accepts a user-supplied SMTP host:port)
// from being used to reach internal/private network addresses — a classic
// SSRF surface, since we open the outbound connection server-side.

function ipToInt(ip: string): number | null {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

function inCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split('/')
  const bits = Number(bitsStr)
  const ipInt = ipToInt(ip)
  const rangeInt = ipToInt(range)
  if (ipInt === null || rangeInt === null) return false
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0
  return (ipInt & mask) === (rangeInt & mask)
}

const BLOCKED_V4_RANGES = [
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '169.254.0.0/16',
  '127.0.0.0/8',
  '0.0.0.0/8',
  '100.64.0.0/10',
]

export async function assertPublicHost(hostname: string): Promise<void> {
  let records: string[]
  try {
    const [a, aaaa] = await Promise.all([
      Deno.resolveDns(hostname, 'A').catch(() => []),
      Deno.resolveDns(hostname, 'AAAA').catch(() => []),
    ])
    records = [...a, ...aaaa]
  } catch {
    throw new Error(`Could not resolve "${hostname}".`)
  }

  if (records.length === 0) throw new Error(`Could not resolve "${hostname}".`)

  for (const ip of records) {
    const lower = ip.toLowerCase()
    if (lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) {
      throw new Error(`"${hostname}" resolves to a private address and can't be used.`)
    }
    if (ip.includes('.') && BLOCKED_V4_RANGES.some((cidr) => inCidr(ip, cidr))) {
      throw new Error(`"${hostname}" resolves to a private address and can't be used.`)
    }
  }
}
