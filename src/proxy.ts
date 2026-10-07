import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySessionCookie } from '@/lib/auth/token'

// Verificação otimista: o proxy só valida a assinatura do cookie de sessão.
// A autorização real (usuário existe, membership do tenant) fica em requireUser/requireTenant.
export function proxy(request: NextRequest) {
  const userId = verifySessionCookie(request.cookies.get(SESSION_COOKIE)?.value)
  if (!userId) {
    return NextResponse.redirect(new URL('/login', request.nextUrl))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/onboarding'],
}
