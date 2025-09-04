import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  // Защищенные маршруты
  const protectedPaths = ['/', '/products', '/cabinets', '/analytics']
  const authPaths = ['/auth/login', '/auth/register']
  
  // Проверяем наличие session_token cookie
  const hasSession = request.cookies.has('session_token')
  
  // Если пользователь не авторизован и пытается получить доступ к защищенному маршруту
  if (!hasSession && protectedPaths.some(p => path === p || path.startsWith(p + '/'))) {
    console.log('🔒 Middleware: Перенаправление на логин для пути:', path)
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Если пользователь авторизован и пытается получить доступ к странице авторизации
  if (hasSession && authPaths.includes(path)) {
    console.log('🔒 Middleware: Перенаправление на главную для авторизованного пользователя')
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes that don't need protection
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}