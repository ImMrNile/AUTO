import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '../../../../lib/prisma';

export async function POST(request: Request) {
  try {
    console.log('🔐 [API Logout] Начало процесса выхода...');
    
    // Получаем cookie с сессией
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    
    if (sessionToken) {
      console.log('🔐 [API Logout] Найдена сессия, удаляем...');
      
      // Удаляем сессию из базы данных
      await prisma.session.deleteMany({
        where: { token: sessionToken }
      });
      
      console.log('✅ [API Logout] Сессия удалена из БД');
    }
    
    // Создаем ответ с удалением cookie
    const response = NextResponse.redirect(new URL('/auth/login', request.url));
    
    // Удаляем cookie сессии
    response.cookies.set('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Немедленное удаление
      path: '/'
    });
    
    console.log('✅ [API Logout] Выход завершен, cookie удален');
    return response;
    
  } catch (error) {
    console.error('❌ [API Logout] Ошибка при выходе:', error);
    
    // Даже при ошибке перенаправляем на страницу входа
    const response = NextResponse.redirect(new URL('/auth/login', request.url));
    
    // Пытаемся удалить cookie
    response.cookies.set('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });
    
    return response;
  }
}