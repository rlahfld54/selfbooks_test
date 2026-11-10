import { buildApp } from './app.js'
import { loadConfig } from './config/env.js'
import { createPool } from './db/pool.js'

async function main() {
  const config = loadConfig()
  if (!config.development) throw new Error('Development mode required')
  if (!config.databaseUrl) throw new Error('Database configuration required')
  const pool = createPool(config.databaseUrl, config.caPath)
  const app = buildApp({
    frontendOrigin: config.frontendOrigin,
    pool,
    ...(config.fixtures ? { fixtures: config.fixtures } : {}),
  })
  try {
    for (const url of ['/api/health/db', '/api/clients', '/api/tax-offices']) {
      const response = await app.inject({
        url,
        remoteAddress: '127.0.0.1',
        headers: { host: 'localhost:' + config.port, origin: config.frontendOrigin },
      })
      const body = response.json()
      // Never print connection strings, database errors, identifiers or records.
      console.log(JSON.stringify({
        endpoint: url,
        status: response.statusCode,
        ...(Array.isArray(body.data) ? { count: body.data.length } : {}),
        ...(response.statusCode !== 200 ? { code: body.error?.code } : {}),
      }))
      if (response.statusCode !== 200) process.exitCode = 1
    }
  } finally {
    await app.close()
  }
}

main().catch(() => {
  console.error('Database check failed. Check server environment, certificate and connectivity.')
  process.exitCode = 1
})
