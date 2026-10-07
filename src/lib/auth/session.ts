import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { memberships, tenants, users } from '@/modules/core/schema'
import { SESSION_COOKIE, TENANT_COOKIE, verifySessionCookie } from './token'

export type AuthUser = typeof users.$inferSelect
export type AuthTenant = typeof tenants.$inferSelect
export type MembershipRole = (typeof memberships.$inferSelect)['role']

export async function getSession(): Promise<{ userId: number } | null> {
  const store = await cookies()
  const userId = verifySessionCookie(store.get(SESSION_COOKIE)?.value)
  return userId === null ? null : { userId }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession()
  if (!session) return null
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1)
  return user ?? null
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}

export async function listMemberships(userId: number) {
  return db
    .select({ membership: memberships, tenant: tenants })
    .from(memberships)
    .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
    .where(eq(memberships.userId, userId))
    .orderBy(asc(memberships.id))
}

export async function requireRole(roles: MembershipRole[]) {
  const ctx = await requireTenant()
  if (!roles.includes(ctx.role)) throw new Error('Sem permissão')
  return ctx
}

export async function requireTenant(): Promise<{
  user: AuthUser
  tenant: AuthTenant
  role: MembershipRole
}> {
  const user = await requireUser()
  const rows = await listMemberships(user.id)
  if (rows.length === 0) redirect('/onboarding')

  const store = await cookies()
  const selected = Number(store.get(TENANT_COOKIE)?.value)
  const current = rows.find((r) => r.tenant.id === selected) ?? rows[0]
  return { user, tenant: current.tenant, role: current.membership.role }
}
