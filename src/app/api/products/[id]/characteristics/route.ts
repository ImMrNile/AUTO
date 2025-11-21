// src/app/api/products/[id]/characteristics/route.ts - API для работы с характеристиками товара

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { AuthService } from '../../../../../../lib/auth/auth-service';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/products/[id]/characteristics
 * Получение характеристик товара с результатами AI анализа
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`📋 GET /api/products/${params.id}/characteristics`);

    // Проверяем авторизацию
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const productId = params.id;

    // Проверяем существование продукта и права доступа
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        userId: user.id
      }
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Товар не найден или нет доступа' },
        { status: 404 }
      );
    }

    // Получаем характеристики товара из базы данных
    const productCharacteristics = await (prisma as any).productCharacteristic.findMany({
      where: { productId },
      orderBy: [
        { isRequired: 'desc' },
        { name: 'asc' }
      ]
    });

    // Если нет сохраненных характеристик (товар в режиме предпросмотра), 
    // загружаем ВСЕ характеристики категории
    let allCharacteristics = productCharacteristics;
    
    if (productCharacteristics.length === 0) {
      console.log(`📋 Характеристики не найдены в БД для товара ${productId}, загружаем все характеристики категории ${product.subcategoryId}`);
      
      try {
        const categoryCharacteristics = await prisma.wbCategoryCharacteristic.findMany({
          where: { subcategoryId: product.subcategoryId || undefined },
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
        });

        // Конвертируем характеристики категории в формат productCharacteristic
        allCharacteristics = categoryCharacteristics.map((char: any) => ({
          id: char.wbCharacteristicId || char.id,
          productId: productId,
          wbCharacteristicId: char.wbCharacteristicId,
          name: char.name,
          value: null, // Пустое значение для новых характеристик
          confidence: 0,
          reasoning: '',
          type: char.type,
          isRequired: char.isRequired,
          maxLength: char.maxLength,
          minValue: char.minValue,
          maxValue: char.maxValue,
          description: char.description,
          values: (char.values || []).map((v: any) => ({
            id: v.wbValueId || v.id,
            value: v.value,
            displayName: v.displayName || v.value
          })),
          isFilled: false,
          source: 'category',
          isUserModified: false,
          validationStatus: 'empty',
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        console.log(`✅ Загружено ${allCharacteristics.length} характеристик категории для товара ${productId}`);
      } catch (error) {
        console.error('❌ Ошибка загрузки характеристик категории:', error);
      }
    }

    const result = {
      product: {
        id: product.id,
        name: product.name,
        categoryId: product.subcategoryId,
        status: product.status
      },
      characteristics: allCharacteristics,
      analysisResult: product.aiCharacteristics || null
    };

    // Формируем ответ
    const response = {
      success: true,
      data: {
        product: result.product,
        characteristics: result.characteristics,
        analysisResult: result.analysisResult,
        statistics: {
          total: result.characteristics.length,
          filled: result.characteristics.filter((c: any) => c.value !== null && c.value !== '').length,
          empty: result.characteristics.filter((c: any) => !c.value).length,
          required: result.characteristics.filter((c: any) => c.isRequired).length,
          requiredFilled: result.characteristics.filter((c: any) => c.isRequired && c.value).length,
          highConfidence: result.characteristics.filter((c: any) => c.confidence >= 0.8).length,
          mediumConfidence: result.characteristics.filter((c: any) => c.confidence >= 0.5 && c.confidence < 0.8).length,
          lowConfidence: result.characteristics.filter((c: any) => c.confidence < 0.5 && c.confidence > 0).length,
          userModified: result.characteristics.filter((c: any) => c.isUserModified).length
        }
      }
    };

    console.log(`✅ Характеристики получены: ${result.characteristics.length} записей`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Ошибка получения характеристик:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Не удалось получить характеристики товара',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/products/[id]/characteristics
 * Обновление характеристик товара
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`✏️ PUT /api/products/${params.id}/characteristics`);

    // Проверяем авторизацию
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const productId = params.id;
    const body = await request.json();

    // Валидация входных данных
    if (!body.characteristics || !Array.isArray(body.characteristics)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Отсутствует массив characteristics' },
        { status: 400 }
      );
    }

    // Проверяем существование продукта и права доступа
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        userId: user.id
      }
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Товар не найден или нет доступа' },
        { status: 404 }
      );
    }

    // Обновляем характеристики
    const updatedCharacteristics = [];
    const errors = [];

    for (const charUpdate of body.characteristics) {
      try {
        if (!charUpdate.id) {
          errors.push(`Отсутствует ID характеристики`);
          continue;
        }

        const updated = await (prisma as any).productCharacteristic.update({
          where: {
            id: charUpdate.id,
            productId: productId // Дополнительная проверка безопасности
          },
          data: {
            value: charUpdate.value !== undefined ? (charUpdate.value ? String(charUpdate.value) : null) : undefined,
            isUserModified: true,
            userModifiedAt: new Date(),
            // Обновляем confidence если пользователь изменил значение
            confidence: charUpdate.value !== undefined ? 1.0 : undefined,
            validationStatus: charUpdate.value ? 'user_modified' : 'empty',
            updatedAt: new Date()
          }
        });

        updatedCharacteristics.push(updated);

      } catch (updateError) {
        console.error(`❌ Ошибка обновления характеристики ${charUpdate.id}:`, updateError);
        errors.push(`Ошибка обновления характеристики ${charUpdate.id}: ${updateError}`);
      }
    }

    // Пересчитываем статистику продукта
    const allCharacteristics = await (prisma as any).productCharacteristic.findMany({
      where: { productId }
    });

    const filledCount = allCharacteristics.filter((c: any) => c.value !== null && c.value !== '').length;
    const fillPercentage = allCharacteristics.length > 0 ? Math.round((filledCount / allCharacteristics.length) * 100) : 0;

    // Обновляем информацию в продукте
    await prisma.product.update({
      where: { id: productId },
        data: {
        aiCharacteristics: {
          ...(product.aiCharacteristics as any || {}),
          filledCharacteristics: filledCount,
          fillPercentage: fillPercentage,
          lastUserUpdateAt: new Date().toISOString()
        },
          updatedAt: new Date()
        }
    });

    const response = {
      success: true,
      data: {
        updated: updatedCharacteristics.length,
        errors: errors.length,
        statistics: {
          total: allCharacteristics.length,
          filled: filledCount,
          fillPercentage
        }
      },
      errors: errors.length > 0 ? errors : undefined
    };

    console.log(`✅ Обновлено характеристик: ${updatedCharacteristics.length}, ошибок: ${errors.length}`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Ошибка обновления характеристик:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Не удалось обновить характеристики товара',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}