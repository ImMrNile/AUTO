import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'

/**
 * POST /api/auth/telegram-phone
 * Отправляет код подтверждения на номер телефона в Telegram
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber } = body

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Номер телефона не указан' },
        { status: 400 }
      )
    }

    console.log(`📱 Запрос авторизации по номеру телефона: ${phoneNumber}`)

    // Генерируем requestId для отслеживания
    const requestId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => ('0' + b.toString(16)).slice(-2))
      .join('')

    // Генерируем 5-значный код подтверждения
    const verificationCode = Math.floor(10000 + Math.random() * 90000).toString()

    console.log(`🔐 Сгенерирован код подтверждения: ${verificationCode}`)

    // Сохраняем запрос на проверку (временно в памяти, в production используйте Redis)
    // Для демонстрации сохраняем в переменную окружения
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 минут

    // TODO: Сохранить в Redis или БД временное хранилище
    // Пока просто возвращаем requestId и код (в production отправить в Telegram)
    
    console.log(`✅ Код отправлен на номер ${phoneNumber}`)
    console.log(`📌 RequestId: ${requestId}`)
    console.log(`⏰ Код действителен до: ${expiresAt.toISOString()}`)

    // В production здесь должна быть отправка кода в Telegram боту
    // Например, через webhook или API вызов
    // await sendCodeToTelegram(phoneNumber, verificationCode)

    return NextResponse.json({
      success: true,
      requestId,
      message: 'Код подтверждения отправлен на ваш номер в Telegram',
      // Для тестирования (удалить в production):
      testCode: verificationCode
    })
  } catch (error: any) {
    console.error('❌ Ошибка при отправке кода:', error)
    return NextResponse.json(
      { error: error?.message || 'Ошибка при отправке кода' },
      { status: 500 }
    )
  }
}
