import { buildApp } from './app.js'
import { loadConfig } from './config/env.js'
import { createPool } from './db/pool.js'
import { createAuthenticator } from './services/auth.js'
import { createPasswordLogin } from './services/password-login.js'

async function main() {
  const config = loadConfig()
  if (!config.development) throw new Error('Development mode required')

  const pool = config.databaseUrl ? createPool(config.databaseUrl, config.caPath) : undefined
  const authenticate = pool && config.fixtures && config.supabaseUrl && config.supabasePublishableKey
    ? createAuthenticator(pool, config.fixtures.officeId, config.supabaseUrl, config.supabasePublishableKey) : undefined
  const passwordLogin = pool && authenticate && config.supabaseUrl && config.supabasePublishableKey
    ? createPasswordLogin(pool, config.supabaseUrl, config.supabasePublishableKey, authenticate) : undefined
  const app = buildApp({
    ...(passwordLogin ? { passwordLogin } : {}),
    frontendOrigin: config.frontendOrigin,
    ...(pool ? { pool } : {}),
    ...(config.fixtures ? { fixtures: config.fixtures } : {}),
    logger: true,
    salesDevelopment: config.development,
    ...(authenticate
      ? { authenticate } : {}),
  })
  try {
    await app.listen({ host: '127.0.0.1', port: config.port })
  } catch (error) {
    await app.close()
    throw error
  }

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void app.close().catch(() => { process.exitCode = 1 })
    })
  }
}

main().catch((error: NodeJS.ErrnoException) => {
  console.error('Backend startup failed', error.code ?? error.name)
  process.exitCode = 1
})
