import { readFileSync } from 'node:fs'
import pg from 'pg'

export function createPool(databaseUrl: string, caPath?: string) {
  const url = new URL(databaseUrl)
  if (!['postgresql:', 'postgres:'].includes(url.protocol) || !url.hostname ||
      !url.username || !url.password || url.pathname.length < 2) {
    throw new Error('Invalid PostgreSQL connection settings')
  }

  // pg allows URI parameters to override TLS options. Keep TLS policy here.
  url.search = ''
  return new pg.Pool({
    connectionString: url.href,
    ssl: { rejectUnauthorized: true, ...(caPath ? { ca: readFileSync(caPath, 'utf8') } : {}) },
    max: 5,
    connectionTimeoutMillis: 5000,
    query_timeout: 5000,
    idleTimeoutMillis: 10000,
  })
}
