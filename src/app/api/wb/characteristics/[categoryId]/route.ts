// src/app/api/wb/characteristics/[categoryId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { safePrismaOperation } from '../../../../../../lib/prisma-utils';
import { AuthService } from '../../../../../../lib/auth/auth-service';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { categoryId: string } }
) {
  try {
    console.log(`📋 Загрузка характеристик категории: ${params.categoryId}`);

    // Проверка авторизации
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Не авторизован'
      }, { status: 401 });
    }

    const categoryId = parseInt(params.categoryId);
    if (isNaN(categoryId)) {
      return NextResponse.json({
        success: false,
        error: 'Неверный ID категории'
      }, { status: 400 });
    }

    // ИСПРАВЛЕНИЕ: Улучшенная загрузка категории с ВСЕМИ характеристиками
    console.log(`🔍 [Characteristics API] Поиск категории по ID: ${categoryId}`);
    
    const category = await safePrismaOperation(
      () => prisma.wbSubcategory.findUnique({
        where: { id: categoryId },
        include: {
          parentCategory: true,
          characteristics: {
            include: {
              values: {
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' }
              }
            },
            orderBy: [
              { isRequired: 'desc' },
              { sortOrder: 'asc' },
              { name: 'asc' }
            ]
          }
        }
      }),
      'загрузка категории с характеристиками'
    );
    
    // Если не найдена по ID, пробуем по wbSubjectId
    let fallbackCategory = null;
    if (!category) {
      console.log(`⚠️ [Characteristics API] Категория не найдена по ID ${categoryId}, пробуем по wbSubjectId...`);
      fallbackCategory = await safePrismaOperation(
        () => prisma.wbSubcategory.findFirst({
          where: { wbSubjectId: categoryId },
          include: {
            parentCategory: true,
            characteristics: {
              include: {
                values: {
                  where: { isActive: true },
                  orderBy: { sortOrder: 'asc' }
                }
              },
              orderBy: [
                { isRequired: 'desc' },
                { sortOrder: 'asc' },
                { name: 'asc' }
              ]
            }
          }
        }),
        'загрузка категории по wbSubjectId'
      );
    }
    
    const finalCategory = category || fallbackCategory;

    if (!finalCategory) {
      return NextResponse.json({
        success: false,
        error: 'Категория не найдена'
      }, { status: 404 });
    }

    // Обработка характеристик
    const processedCharacteristics = finalCategory.characteristics.map((char: any) => ({
      id: char.wbCharacteristicId || char.id,
      wbCharacteristicId: char.wbCharacteristicId,
      name: char.name,
      type: char.type,
      isRequired: char.isRequired,
      maxLength: char.maxLength,
      minValue: char.minValue,
      maxValue: char.maxValue,
      description: char.description,
      sortOrder: char.sortOrder,
      values: char.values.map((val: any) => ({
        id: val.wbValueId || val.id,
        wbValueId: val.wbValueId,
        value: val.value,
        displayName: val.displayName || val.value,
        sortOrder: val.sortOrder
      }))
    }));

    // Фильтрация для ИИ (исключаем габариты, цвет, защищенные)
    const EXCLUDED_FOR_AI = new Set([
      89008, 90630, 90607, 90608, 90652, 90653, 11002, 90654, 90655, // Габариты
      14177449, // Цвет
      14177441, // Комплектация
      14177472, 14177473, 14177474 // НДС/декларации
    ]);

    const aiCharacteristics = processedCharacteristics.filter(char => 
      !EXCLUDED_FOR_AI.has(char.id) && !EXCLUDED_FOR_AI.has(char.wbCharacteristicId || 0)
    );

    console.log(`✅ Загружено характеристик: ${processedCharacteristics.length} общих, ${aiCharacteristics.length} для ИИ`);
    console.log(`📋 [Characteristics API] Исходные характеристики из БД: ${finalCategory.characteristics.length}`);
    console.log(`📋 [Characteristics API] Первые 5 характеристик:`, finalCategory.characteristics.slice(0, 5).map(c => ({
      id: c.id,
      wbCharacteristicId: c.wbCharacteristicId,
      name: c.name,
      type: c.type,
      isRequired: c.isRequired
    })));

    return NextResponse.json({
      success: true,
      category: {
        id: finalCategory.id,
        name: finalCategory.name,
        slug: finalCategory.slug,
        wbSubjectId: finalCategory.wbSubjectId,
        parentCategory: finalCategory.parentCategory ? {
          id: finalCategory.parentCategory.id,
          name: finalCategory.parentCategory.name,
          slug: finalCategory.parentCategory.slug
        } : null
      },
      characteristics: processedCharacteristics,
      aiCharacteristics: aiCharacteristics,
      stats: {
        total: processedCharacteristics.length,
        forAI: aiCharacteristics.length,
        required: processedCharacteristics.filter(c => c.isRequired).length,
        withValues: processedCharacteristics.filter(c => c.values.length > 0).length
      }
    });

  } catch (error) {
    console.error('❌ Ошибка загрузки характеристик категории:', error);
    
    let errorMessage = 'Внутренняя ошибка сервера';
    let errorDetails = '';
    
    if (error instanceof Error) {
      if (error.message.includes('P1001') || error.message.includes('database')) {
        errorMessage = 'Временные проблемы с базой данных';
      } else {
        errorDetails = error.message;
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: errorDetails
    }, { status: 500 });
  }
}