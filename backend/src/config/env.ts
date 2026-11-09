import { loadEnvFile } from 'node:process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const projectRoot = fileURLToPath(new URL('../../../', import.meta.url))
export const uuidPattern = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'

function fixtureScope() {
  const officeId = process.env.DEV_FIXTURE_OFFICE_ID
  const clientIds = process.env.DEV_FIXTURE_CLIENT_IDS?.split(',').map((id) => id.trim())
  if (!officeId && !clientIds) return undefined
  const uuid = new RegExp(uuidPattern)
  if (!officeId || !uuid.test(officeId) || !clientIds?.length ||
      !clientIds.every((id) => uuid.test(id))) {
    throw new Error('Invalid development fixture IDs')
  }
  return { officeId, clientIds }
}

export function loadConfig() {
  try {
    loadEnvFile(resolve(projectRoot, '.env'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }

  const port = Number(process.env.BACKEND_PORT ?? 4000)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Invalid BACKEND_PORT')
  }

  const caPath = process.env.DB_SSL_CA_PATH
  return {
    port,
    development: process.env.NODE_ENV !== 'production' &&
      process.argv.includes('--local-development'),
    databaseUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
    caPath: caPath ? resolve(projectRoot, caPath) : undefined,
    frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
    fixtures: fixtureScope(),
  }
}
