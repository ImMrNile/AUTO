// Принудительный вход в систему - создает новую сессию без проверок

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function POST(request: NextRequest) {
  console.log('🚀 [Force Login] === ПРИНУДИТЕЛЬНЫЙ ВХОД ===');
  
  try {
    // Подключаемся к БД
    await prisma.$connect();
    console.log('✅ [Force Login] Подключение к БД успешно');
    
    // Находим любого активного пользователя
    const user = await prisma.user.findFirst({
      where: { isActive: true },
      orderBy: { lastLoginAt: 'desc' }
    });
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Нет активных пользователей в системе'
      }, { status: 404 });
    }
    
    console.log('👤 [Force Login] Найден пользователь:', user.email);
    
    // Удаляем ВСЕ старые сессии
    console.log('🧹 [Force Login] Удаляем все старые сессии...');
    await prisma.session.deleteMany({});
    
    // Создаем новый простой токен
    const newToken = generateSimpleToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 дней
    
    // Создаем новую сессию
    console.log('🔑 [Force Login] Создаем новую сессию...');
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: newToken,
        expiresAt,
        ipAddress: request.headers.get('x-forwarded-for') || 'force-login',
        userAgent: request.headers.get('user-agent') || 'force-login-tool'
      }
    });
    
    console.log('✅ [Force Login] Сессия создана:', newToken.substring(0, 10) + '...');
    
    // Обновляем время последнего входа
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });
    
    // Создаем ответ
    const response = NextResponse.json({
      success: true,
      message: 'Принудительный вход выполнен успешно',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      session: {
        token: newToken.substring(0, 10) + '...',
        expiresAt: expiresAt.toISOString()
      }
    });
    
    // Устанавливаем cookie с новой сессией
    response.cookies.set('session_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60, // 30 дней
      path: '/',
      sameSite: 'lax'
    });
    
    console.log('✅ [Force Login] Cookie установлен, принудительный вход завершен');
    return response;
    
  } catch (error) {
    console.error('❌ [Force Login] Критическая ошибка:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Ошибка при принудительном входе',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

// Простая функция генерации токена
function generateSimpleToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function GET() {
  return NextResponse.json({
    message: 'Используйте POST запрос для принудительного входа',
    endpoint: '/api/force-login',
    method: 'POST'
  });
}
