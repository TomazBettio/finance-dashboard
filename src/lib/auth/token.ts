import { createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'ds_session'
export const TENANT_COOKIE = 'ds_tenant'

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_TTL_SECONDS,
}

const DEV_SECRET = 'dev-only-insecure-secret'
let warned = false

function getSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET não definido em produção')
  }
  if (!warned) {
    console.warn('[auth] AUTH_SECRET não definido — usando segredo inseguro de desenvolvimento (login simulado)')
    warned = true
  }
  return DEV_SECRET
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

export function signSessionCookie(userId: number): string {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  const payload = `${userId}.${expiresAt}`
  return `${payload}.${sign(payload)}`
}

export function verifySessionCookie(value: string | undefined | null): number | null {
  if (!value) return null
  const sep = value.lastIndexOf('.')
  if (sep <= 0) return null
  const payload = value.slice(0, sep)
  const signature = value.slice(sep + 1)
  const expected = sign(payload)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  const [idPart, expPart, ...rest] = payload.split('.')
  if (rest.length > 0) return null
  const userId = Number(idPart)
  const expiresAt = Number(expPart)
  if (!Number.isInteger(userId) || userId <= 0) return null
  if (!Number.isInteger(expiresAt) || expiresAt * 1000 <= Date.now()) return null
  return userId
}
