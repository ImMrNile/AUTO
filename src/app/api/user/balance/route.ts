import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '../../../../../lib/auth/auth-service'
import { prisma } from '../../../../../lib/prisma'

/**
 * GET /api/user/balance
 * Получает текущий баланс пользователя
 */
export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    console.log(`💰 Получение баланса для пользователя: ${user.id}`)

    // Получаем баланс из профиля пользователя
    // Если поля нет, создаем его
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { balance: true }
    })

    const balance = (userProfile as any)?.balance || 0

    console.log(`✅ Баланс пользователя: ₽${balance}`)

    return NextResponse.json({
      success: true,
      balance
    })
  } catch (error: any) {
    console.error('❌ Ошибка при получении баланса:', error)
    return NextResponse.json(
      { error: error?.message || 'Ошибка при получении баланса' },
      { status: 500 }
    )
  }
}
