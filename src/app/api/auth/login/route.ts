import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { AuthService } from '../../../../../lib/auth/auth-service';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 [API Login] Начало обработки запроса...');
    
    // Обеспечиваем подключение к БД
    console.log('🔐 [API Login] Подключение к БД...');
    try {
      await prisma.$connect();
      console.log('✅ [API Login] Prisma connected successfully');
    } catch (connectError) {
      console.error('❌ [API Login] Failed to connect to database:', connectError);
      return NextResponse.json({
        success: false,
        error: 'Не удается подключиться к базе данных'
      }, { status: 503 });
    }
    
    const body = await request.json();
    console.log('🔐 [API Login] Тело запроса получено:', { email: body.email, hasPassword: !!body.password });
    
    const { email, password } = body;

    console.log('🔐 [API Login] Попытка авторизации:', { email, password: password ? '***' : 'undefined' });

    if (!email || !password) {
      console.log('❌ [API Login] Отсутствуют email или пароль');
      return NextResponse.json({
        success: false,
        error: 'Email и пароль обязательны'
      }, { status: 400 });
    }

    console.log('🔐 [API Login] Поиск пользователя в БД...');
    
    // Ищем пользователя по email
    const user = await prisma.user.findFirst({
      where: { 
        email: email.toLowerCase().trim(),
        isActive: true
      }
    });

    console.log('🔐 [API Login] Результат поиска пользователя:', user ? { id: user.id, email: user.email } : 'не найден');

    if (!user) {
      console.log('❌ [API Login] Пользователь не найден:', email);
      return NextResponse.json({
        success: false,
        error: 'Пользователь не найден'
      }, { status: 401 });
    }

    // Проверяем пароль (в реальном приложении здесь должна быть хешированная проверка)
    // Для тестирования используем простую проверку
    if (password !== '919014095@Man') {
      console.log('❌ [API Login] Неверный пароль для пользователя:', email);
      return NextResponse.json({
        success: false,
        error: 'Неверный пароль'
      }, { status: 401 });
    }

    console.log('✅ [API Login] Пользователь найден:', { id: user.id, email: user.email, role: user.role });

    console.log('🔐 [API Login] Удаление старых сессий...');
    
    // Удаляем старые сессии этого пользователя
    await prisma.session.deleteMany({
      where: { userId: user.id }
    });

    console.log('🔐 [API Login] Создание новой сессии...');
    
    // Создаем новую сессию
    const sessionToken = await AuthService.createSession(
      user.id,
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined
    );

    console.log('✅ [API Login] Сессия создана:', sessionToken.substring(0, 10) + '...');

    console.log('🔐 [API Login] Обновление времени последнего входа...');
    
    // Обновляем время последнего входа
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    console.log('🔐 [API Login] Создание ответа...');
    
    // Создаем ответ с cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive
      },
      message: 'Авторизация успешна'
    });

    // Устанавливаем cookie с сессией
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 дней
      path: '/'
    });

    console.log('✅ [API Login] Ответ готов, cookie установлен');
    return response;

  } catch (error) {
    console.error('❌ [API Login] Критическая ошибка:', error);
    console.error('❌ [API Login] Stack trace:', error instanceof Error ? error.stack : 'Нет stack trace');
    
    return NextResponse.json({
      success: false,
      error: 'Ошибка сервера при авторизации',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
