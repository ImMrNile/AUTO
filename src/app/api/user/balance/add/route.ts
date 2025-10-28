import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '../../../../../../lib/auth/auth-service'
import { prisma } from '../../../../../../lib/prisma'

/**
 * POST /api/user/balance/add
 * Пополняет баланс пользователя
 */
export async function POST(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const body = await request.json()
    const { amount } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Сумма должна быть больше 0' },
        { status: 400 }
      )
    }

    console.log(`💰 Пополнение баланса для пользователя ${user.id} на сумму: ₽${amount}`)

    // Обновляем баланс
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        balance: {
          increment: amount
        }
      },
      select: { balance: true }
    })

    console.log(`✅ Баланс пополнен. Новый баланс: ₽${updatedUser.balance}`)

    return NextResponse.json({
      success: true,
      balance: updatedUser.balance,
      message: `Баланс пополнен на ₽${amount}`
    })
  } catch (error: any) {
    console.error('❌ Ошибка при пополнении баланса:', error)
    return NextResponse.json(
      { error: error?.message || 'Ошибка при пополнении баланса' },
      { status: 500 }
    )
  }
}
