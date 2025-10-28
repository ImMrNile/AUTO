// src/app/api/wb/subcategories/route.ts - API для получения подкатегории по wbSubjectId

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wbSubjectId = searchParams.get('wbSubjectId');

    if (!wbSubjectId) {
      return NextResponse.json(
        { success: false, error: 'Параметр wbSubjectId обязателен' },
        { status: 400 }
      );
    }

    const wbSubjectIdNum = parseInt(wbSubjectId);
    if (isNaN(wbSubjectIdNum)) {
      return NextResponse.json(
        { success: false, error: 'wbSubjectId должен быть числом' },
        { status: 400 }
      );
    }

    console.log('🔍 Поиск подкатегории по wbSubjectId:', wbSubjectIdNum);

    // Ищем подкатегорию по wbSubjectId
    const subcategory = await prisma.wbSubcategory.findFirst({
      where: {
        wbSubjectId: wbSubjectIdNum,
        isActive: true
      }
    });

    if (!subcategory) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Подкатегория с wbSubjectId ${wbSubjectIdNum} не найдена` 
        },
        { status: 404 }
      );
    }

    console.log('✅ Найдена подкатегория:', {
      id: subcategory.id,
      name: subcategory.name,
      wbSubjectId: subcategory.wbSubjectId
    });

    return NextResponse.json({
      success: true,
      subcategory: {
        id: subcategory.id,
        wbSubjectId: subcategory.wbSubjectId,
        name: subcategory.name,
        slug: subcategory.slug,
        description: subcategory.description
      }
    });

  } catch (error: any) {
    console.error('❌ Ошибка при поиске подкатегории:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Внутренняя ошибка сервера' 
      },
      { status: 500 }
    );
  }
}
