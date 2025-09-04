// src/app/api/wb/characteristics/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';

export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Не авторизован'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    if (!categoryId) {
      return NextResponse.json({
        success: false,
        error: 'Не указан ID категории. Используйте /api/wb/characteristics/[categoryId]'
      }, { status: 400 });
    }

    // Перенаправляем на специфичный endpoint
    return NextResponse.redirect(new URL(`/api/wb/characteristics/${categoryId}`, request.url));

  } catch (error) {
    console.error('Ошибка в общем endpoint характеристик:', error);
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}