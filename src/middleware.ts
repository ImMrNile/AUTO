import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  // Публичные пути - не требуют авторизации
  const publicPaths = ['/auth/login', '/auth/register', '/auth/telegram-desktop', '/auth/callback']
  
  // Проверяем наличие session_token cookie (старая система)
  const sessionToken = request.cookies.get('session_token')?.value
  
  // Проверяем Supabase Auth (новая система)
  let supabaseUser = null
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )
    
    const { data: { user } } = await supabase.auth.getUser()
    supabaseUser = user
  } catch (error) {
    console.log('🔒 Middleware: Ошибка проверки Supabase:', error)
  }
  
  const isAuthenticated = !!sessionToken || !!supabaseUser
  
  console.log(`🔒 Middleware: path=${path}, sessionToken=${!!sessionToken}, supabaseUser=${!!supabaseUser}`)
  
  // Если это публичный путь - пропускаем
  if (publicPaths.some(p => path === p || path.startsWith(p + '/'))) {
    // Если пользователь авторизован и пытается открыть страницу входа
    if (isAuthenticated && (path === '/auth/login' || path === '/auth/register')) {
      console.log('🔒 Middleware: Авторизованный пользователь пытается открыть страницу входа, редирект на главную')
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }
  
  // Если пользователь не авторизован и пытается получить доступ к защищенному маршруту
  if (!isAuthenticated) {
    console.log('🔒 Middleware: Нет авторизации, редирект на логин для пути:', path)
    return NextResponse.redirect(new URL('/auth/login', request.url))
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