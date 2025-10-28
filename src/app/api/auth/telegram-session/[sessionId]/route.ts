import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../../lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Ищем сессию в Redis или БД
    // Для простоты используем временное хранилище в памяти
    // В production используйте Redis
    
    // Проверяем есть ли запись о сессии
    const telegramSession = await (prisma as any).telegramSession.findUnique({
      where: { sessionId }
    }).catch(() => null)

    if (!telegramSession) {
      return NextResponse.json({
        authenticated: false,
        message: 'Session not found or not authenticated yet'
      })
    }

    // Проверяем не истекла ли сессия (5 минут)
    const expiresAt = new Date(telegramSession.expiresAt)
    if (new Date() > expiresAt) {
      // Удаляем истекшую сессию
      await (prisma as any).telegramSession.delete({
        where: { sessionId }
      }).catch(() => null)

      return NextResponse.json({
        authenticated: false,
        message: 'Session expired'
      })
    }

    // Если сессия аутентифицирована, возвращаем успех
    if (telegramSession.authenticated) {
      // Создаем обычную сессию пользователя
      const user = await prisma.user.findUnique({
        where: { id: telegramSession.userId }
      })

      if (!user) {
        return NextResponse.json({
          authenticated: false,
          message: 'User not found'
        })
      }

      // Создаем session token
      const token = Array.from(crypto.getRandomValues(new Uint8Array(48)))
        .map(b => ('0' + b.toString(16)).slice(-2))
        .join('')
      
      const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      
      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt: sessionExpiresAt
        }
      })

      // Удаляем telegram session
      await (prisma as any).telegramSession.delete({
        where: { sessionId }
      }).catch(() => null)

      const response = NextResponse.json({
        authenticated: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      })

      response.cookies.set('session_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60,
        path: '/'
      })

      return response
    }

    return NextResponse.json({
      authenticated: false,
      message: 'Waiting for authentication'
    })
  } catch (e: any) {
    console.error('Error checking telegram session:', e)
    return NextResponse.json(
      { error: e?.message || 'Server error' },
      { status: 500 }
    )
  }
}
