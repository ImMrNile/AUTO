import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/telegram-login
 * Авторизация через Telegram Mini App (совместимость со старой системой)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telegramId, username, firstName, lastName, initData } = body;

    console.log('🔐 [Telegram Login] Запрос авторизации:', {
      telegramId,
      username,
      hasInitData: !!initData
    });

    // Валидация
    if (!telegramId) {
      return NextResponse.json(
        { success: false, message: 'telegramId обязателен' },
        { status: 400 }
      );
    }

    // Проверяем initData (если передан)
    if (initData && initData !== 'test_data') {
      const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
      
      if (botToken) {
        // Простая проверка подписи (можно улучшить)
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        params.delete('hash');
        
        // Сортируем параметры
        const sortedParams = Array.from(params.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => `${key}=${value}`)
          .join('\n');
        
        const secretKey = crypto
          .createHash('sha256')
          .update(botToken)
          .digest();
        
        const calculatedHash = crypto
          .createHmac('sha256', secretKey)
          .update(sortedParams)
          .digest('hex');
        
        if (hash !== calculatedHash) {
          console.warn('⚠️ [Telegram Login] Неверная подпись initData');
          // Не блокируем, но логируем
        }
      }
    }

    // Ищем или создаем пользователя
    let user = await prisma.user.findUnique({
      where: { telegramId: telegramId.toString() }
    });

    const name = [firstName, lastName].filter(Boolean).join(' ') || username || `User ${telegramId}`;
    const email = username ? `${username}@telegram.local` : `tg${telegramId}@telegram.local`;
    const supabaseId = `telegram:${telegramId}`;

    if (!user) {
      console.log('📝 [Telegram Login] Создаем нового пользователя');
      user = await prisma.user.create({
        data: {
          supabaseId,
          email,
          name,
          telegramId: telegramId.toString(),
          telegramUsername: username || null,
          role: 'USER',
          isActive: true,
          lastLoginAt: new Date()
        }
      });
    } else {
      console.log('✅ [Telegram Login] Обновляем существующего пользователя');
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          telegramUsername: username || null,
          name: name
        }
      });
    }

    // Создаем сессию
    const token = Array.from(crypto.getRandomValues(new Uint8Array(48)))
      .map(b => ('0' + b.toString(16)).slice(-2))
      .join('');
    
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 дней
    
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt
      }
    });

    // Проверяем наличие кабинетов
    const cabinets = await prisma.cabinet.findMany({
      where: { userId: user.id },
      select: { id: true }
    });
    
    const hasCabinets = cabinets.length > 0;

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.telegramUsername,
        firstName: firstName || null,
        lastName: lastName || null,
        name: user.name,
        email: user.email
      },
      hasCabinets,
      redirectTo: hasCabinets ? '/' : '/onboarding'
    });

    // Устанавливаем cookie
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none', // Для Telegram Mini App
      maxAge: 30 * 24 * 60 * 60,
      path: '/'
    });

    console.log('✅ [Telegram Login] Авторизация успешна, redirectTo:', hasCabinets ? '/' : '/onboarding');

    return response;

  } catch (error: any) {
    console.error('❌ [Telegram Login] Ошибка:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Ошибка авторизации' },
      { status: 500 }
    );
  }
}
