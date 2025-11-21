import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../../lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/telegram-phone/verify
 * Проверяет код подтверждения и авторизует пользователя
 * Синхронизирует данные между Telegram Mini App и веб-приложением
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { requestId, code } = body

    if (!requestId || !code) {
      return NextResponse.json(
        { error: 'RequestId и код не указаны' },
        { status: 400 }
      )
    }

    console.log(`🔐 Проверка кода подтверждения для requestId: ${requestId}`)

    // TODO: Получить данные из Redis/БД временного хранилища
    // Пока это заглушка - в production нужно проверить код

    // Для демонстрации: если код = 12345, авторизуем пользователя
    if (code !== '12345') {
      console.error('❌ Неверный код подтверждения')
      return NextResponse.json(
        { error: 'Неверный код подтверждения' },
        { status: 401 }
      )
    }

    // Получаем номер телефона из requestId (в production из Redis)
    // Для демонстрации используем тестовый номер
    const phoneNumber = '+79991234567'

    console.log(`📱 Поиск пользователя по номеру телефона: ${phoneNumber}`)

    // Ищем пользователя по номеру телефона
    // Номер телефона хранится в supabaseId как "telegram:phone:+79991234567"
    let user = await prisma.user.findFirst({
      where: {
        supabaseId: {
          startsWith: 'telegram:phone:'
        }
      }
    })

    // Если пользователя нет, создаем его
    if (!user) {
      console.log(`👤 Создание нового пользователя для номера: ${phoneNumber}`)
      user = await prisma.user.create({
        data: {
          supabaseId: `telegram:phone:${phoneNumber}`,
          email: `${phoneNumber.replace(/\D/g, '')}@telegram.local`,
          name: `Telegram User ${phoneNumber}`,
          role: 'USER',
          isActive: true,
          lastLoginAt: new Date()
        }
      })
      console.log(`✅ Пользователь создан: ${user.id}`)
    } else {
      console.log(`✅ Пользователь найден: ${user.id}`)
      // Обновляем время последнего входа
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      })
    }

    // Создаем session token
    const token = Array.from(crypto.getRandomValues(new Uint8Array(48)))
      .map(b => ('0' + b.toString(16)).slice(-2))
      .join('')

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 дней

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt
      }
    })

    console.log(`🔑 Session token создан для пользователя: ${user.id}`)

    // Получаем все данные пользователя (товары, кабинеты и т.д.)
    const userWithData = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            price: true,
            stock: true,
            status: true,
            updatedAt: true
          },
          take: 10 // Последние 10 товаров
        },
        cabinets: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    console.log(`📊 Синхронизация данных пользователя:`)
    console.log(`   - Товаров: ${userWithData?.products?.length || 0}`)
    console.log(`   - Кабинетов: ${userWithData?.cabinets?.length || 0}`)

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        supabaseId: user.supabaseId
      },
      // Синхронизированные данные
      syncData: {
        products: userWithData?.products || [],
        cabinets: userWithData?.cabinets || [],
        lastSync: new Date().toISOString()
      }
    })

    // Устанавливаем session cookie
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60,
      path: '/'
    })

    console.log(`✅ Авторизация успешна. Пользователь: ${user.id}`)

    return response
  } catch (error: any) {
    console.error('❌ Ошибка при проверке кода:', error)
    return NextResponse.json(
      { error: error?.message || 'Ошибка при проверке кода' },
      { status: 500 }
    )
  }
}
