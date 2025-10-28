// src/app/api/products/user/route.ts - Получение товаров пользователя из БД

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { safePrismaOperation } from '../../../../../lib/prisma-utils';
import { AuthService } from '../../../../../lib/auth/auth-service';

/**
 * GET - Получение всех товаров пользователя из БД
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📦 Запрос товаров пользователя из БД');

    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({
        error: 'Не авторизован'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status'); // Фильтр по статусу
    const cabinetId = searchParams.get('cabinetId'); // Фильтр по кабинету

    // Строим условия запроса
    const whereClause: any = {
      userId: user.id
    };

    if (status) {
      whereClause.status = status;
    }

    if (cabinetId) {
      whereClause.productCabinets = {
        some: { cabinetId }
      };
    }

    // Получаем товары из БД
    const [products, totalCount] = await Promise.all([
      safePrismaOperation(
        () => prisma.product.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          include: {
            subcategory: {
              select: {
                id: true,
                name: true,
                slug: true,
                parentCategory: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            },
            productCabinets: {
              include: {
                cabinet: {
                  select: {
                    id: true,
                    name: true,
                    isActive: true
                  }
                }
              }
            },
            characteristics: {
              select: {
                id: true,
                name: true,
                value: true,
                confidence: true,
                isRequired: true
              }
            },
            publications: {
              select: {
                id: true,
                status: true,
                wbNmId: true,
                wbImtId: true,
                publishedAt: true
              }
            }
          }
        }),
        'получение товаров пользователя'
      ),
      safePrismaOperation(
        () => prisma.product.count({ where: whereClause }),
        'подсчет товаров'
      )
    ]);

    console.log(`✅ Получено ${products.length} товаров из ${totalCount} общих`);

    // Формируем ответ с полными данными
    const productsData = products.map(product => {
      // Парсим JSON поля
      let wbData: any = {};
      let dimensions: any = {};
      let aiCharacteristics: any = null;
      
      try {
        wbData = product.wbData ? (typeof product.wbData === 'string' ? JSON.parse(product.wbData) : product.wbData) : {};
        dimensions = product.dimensions ? (typeof product.dimensions === 'string' ? JSON.parse(product.dimensions) : product.dimensions) : {};
        aiCharacteristics = product.aiCharacteristics ? (typeof product.aiCharacteristics === 'string' ? JSON.parse(product.aiCharacteristics) : product.aiCharacteristics) : null;
      } catch (e) {
        console.warn(`⚠️ Ошибка парсинга JSON для товара ${product.id}`, e);
      }

      // Получаем изображения
      const images: string[] = [];
      if (product.originalImage) {
        images.push(product.originalImage);
      }
      // Дополнительные изображения из wbData
      if (wbData.images?.additional && Array.isArray(wbData.images.additional)) {
        images.push(...wbData.images.additional);
      }

      // Информация о публикации на WB
      const wbPublication = product.publications && product.publications.length > 0 ? product.publications[0] : null;

      return {
        // Основная информация
        id: product.id,
        name: product.name,
        generatedName: product.generatedName,
        seoDescription: product.seoDescription,
        status: product.status,
        
        // Цены
        price: product.price,
        originalPrice: wbData.originalPrice || product.price,
        discountPrice: wbData.discountPrice || product.price,
        costPrice: wbData.costPrice || null,
        
        // Изображения
        images: images,
        mainImage: product.originalImage,
        
        // Категория
        category: product.subcategory ? {
          id: product.subcategory.id,
          name: product.subcategory.name,
          parentName: product.subcategory.parentCategory?.name || ''
        } : null,
        
        // WB данные
        vendorCode: wbData.vendorCode || '',
        barcode: wbData.barcode || '',
        packageContents: wbData.packageContents || '',
        dimensions: dimensions,
        hasVariantSizes: wbData.hasVariantSizes || false,
        variantSizes: wbData.variantSizes || [],
        
        // Кабинеты
        cabinets: product.productCabinets.map(pc => ({
          id: pc.cabinet.id,
          name: pc.cabinet.name,
          isActive: pc.cabinet.isActive,
          isSelected: pc.isSelected
        })),
        
        // Характеристики
        characteristicsCount: product.characteristics?.length || 0,
        characteristicsFilled: product.characteristics?.filter(c => c.value).length || 0,
        
        // Публикация на WB
        wbPublished: !!wbPublication,
        wbNmId: wbPublication?.wbNmId || null,
        wbImtId: wbPublication?.wbImtId || null,
        publishedAt: wbPublication?.publishedAt || product.publishedAt,
        
        // Метаинформация
        referenceUrl: product.referenceUrl,
        workflowId: product.workflowId,
        processingMethod: product.processingMethod,
        errorMessage: product.errorMessage,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        
        // Дополнительные данные
        colorAnalysis: product.colorAnalysis,
        suggestedCategory: product.suggestedCategory
      };
    });

    return NextResponse.json({
      success: true,
      products: productsData,
      total: totalCount,
      limit,
      offset,
      hasMore: offset + products.length < totalCount,
      meta: {
        userId: user.id,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения товаров пользователя:', error);
    return NextResponse.json({
      error: 'Ошибка получения данных',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

