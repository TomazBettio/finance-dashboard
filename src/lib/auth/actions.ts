'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { memberships, tenants, users } from '@/modules/core/schema'
import { requireUser, type AuthUser } from './session'
import { COOKIE_OPTIONS, SESSION_COOKIE, TENANT_COOKIE, signSessionCookie } from './token'

type ActionState = { error: string } | { success: true } | null

// Login simulado: sem senha; cria o usuário no primeiro acesso.
export async function signIn(email: string, name?: string): Promise<{ error: string } | undefined> {
  const normalized = (email ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { error: 'Informe um e-mail válido' }
  }

  let user: AuthUser | undefined
  const [existing] = await db.select().from(users).where(eq(users.email, normalized)).limit(1)
  if (existing) {
    user = existing
  } else {
    const displayName = name?.trim() || normalized.split('@')[0]
    try {
      ;[user] = await db.insert(users).values({ name: displayName, email: normalized }).returning()
    } catch {
      // e-mail único: outro request pode ter criado o usuário simultaneamente
      const [retry] = await db.select().from(users).where(eq(users.email, normalized)).limit(1)
      user = retry
    }
  }
  if (!user) return { error: 'Não foi possível entrar. Tente novamente.' }

  const store = await cookies()
  store.set(SESSION_COOKIE, signSessionCookie(user.id), COOKIE_OPTIONS)
  redirect('/dashboard')
}

export async function signOut(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
  store.delete(TENANT_COOKIE)
  redirect('/login')
}

export async function switchTenant(tenantId: number): Promise<{ error: string } | undefined> {
  const user = await requireUser()
  if (!Number.isInteger(tenantId) || tenantId <= 0) return { error: 'Empresa inválida' }

  const [membership] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.userId, user.id), eq(memberships.tenantId, tenantId)))
    .limit(1)
  if (!membership) return { error: 'Você não tem acesso a esta empresa' }

  const store = await cookies()
  store.set(TENANT_COOKIE, String(tenantId), COOKIE_OPTIONS)
  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard')
}

function slugify(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
  return slug || 'empresa'
}

export async function createTenant(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser()
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'Nome da empresa é obrigatório' }
  if (name.length > 255) return { error: 'Nome muito longo' }

  const base = slugify(name)
  const tenant = await db.transaction(async (tx) => {
    for (let i = 0; i < 10; i++) {
      const slug = i === 0 ? base : `${base}-${i + 1}`
      const [created] = await tx
        .insert(tenants)
        .values({ name, slug })
        .onConflictDoNothing({ target: tenants.slug })
        .returning()
      if (!created) continue
      await tx
        .insert(memberships)
        .values({ userId: user.id, tenantId: created.id, role: 'owner' })
      return created
    }
    return null
  })
  if (!tenant) {
    return { error: 'Não foi possível gerar um identificador único. Tente outro nome.' }
  }

  const store = await cookies()
  store.set(TENANT_COOKIE, String(tenant.id), COOKIE_OPTIONS)
  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard')
}
