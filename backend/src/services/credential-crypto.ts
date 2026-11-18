import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/*
 * 홈택스 비밀번호 · 주민번호 조각 암호화 — AES-256-GCM.
 * 키는 서버 환경변수 HOMETAX_CRED_KEY(32바이트 base64). DB 에는 암호문만, 화면에는 아무것도 내려가지 않는다.
 * 키가 다르면 복호화가 실패한다 — 다른 사람 PC 에서는 같은 키를 써야 저장된 계정을 쓸 수 있다.
 */
export class CredentialKeyMissing extends Error {}

function key(raw = process.env.HOMETAX_CRED_KEY) {
  const buffer = raw ? Buffer.from(raw, 'base64') : Buffer.alloc(0)
  if (buffer.length !== 32) throw new CredentialKeyMissing('HOMETAX_CRED_KEY must be 32 bytes (base64)')
  return buffer
}

export function encryptSecret(plain: string, raw?: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(raw), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), data].map(part => part.toString('base64')).join('.')
}

export function decryptSecret(sealed: string, raw?: string) {
  const [iv, tag, data] = sealed.split('.').map(part => Buffer.from(part, 'base64'))
  if (!iv || !tag || !data) throw new Error('Malformed secret')
  const decipher = createDecipheriv('aes-256-gcm', key(raw), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
