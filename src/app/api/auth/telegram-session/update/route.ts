import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../../lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, userId, userData } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    console.log(`🔐 Обновление Telegram сессии: ${sessionId}`)

    // Ищем или создаем пользователя
    let user = await prisma.user.findUnique({
      where: { supabaseId: userId }
    })

    if (!user) {
      console.log(`👤 Создание нового пользователя: ${userId}`)
      user = await prisma.user.create({
        data: {
          supabaseId: userId,
          email: `${userData.username || userData.id}@telegram.local`,
          name: [userData.first_name, userData.last_name]
            .filter(Boolean)
            .join(' ') || userData.username || `tg-${userData.id}`,
          avatarUrl: userData.photo_url,
          role: 'USER',
          isActive: true,
          lastLoginAt: new Date()
        }
      })
    } else {
      console.log(`✅ Обновление пользователя: ${user.id}`)
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      })
    }

    // Обновляем сессию
    const session = await (prisma as any).telegramSession.update({
      where: { sessionId },
      data: {
        userId: user.id,
        authenticated: true
      }
    })

    console.log(`✅ Сессия ${sessionId} аутентифицирована для пользователя ${user.id}`)

    return NextResponse.json({ 
      success: true, 
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    })
  } catch (e: any) {
    console.error('❌ Ошибка при обновлении Telegram сессии:', e)
    return NextResponse.json(
      { error: e?.message || 'Server error' },
      { status: 500 }
    )
  }
}
