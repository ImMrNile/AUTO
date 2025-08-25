// src/app/api/products/bulk/route.ts - API МАССОВЫХ ОПЕРАЦИЙ

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { wbApiService } from '../../../../../lib/services/wbApiService';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, productIds, data } = body;

    console.log(`🔄 Массовая операция "${action}" для ${productIds?.length || 0} товаров`);

    if (!action) {
      return NextResponse.json({
        success: false,
        error: 'Не указано действие'
      }, { status: 400 });
    }

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Не указаны ID товаров'
      }, { status: 400 });
    }

    // Проверяем существование товаров
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds }
      },
      include: {
        productCabinets: {
          include: { cabinet: true }
        },
        subcategory: {
          include: { parentCategory: true }
        }
      }
    });

    if (products.length !== productIds.length) {
      return NextResponse.json({
        success: false,
        error: 'Некоторые товары не найдены'
      }, { status: 404 });
    }

    let results: any[] = [];

    switch (action) {
      case 'bulk-publish':
        // Массовая публикация товаров
        console.log('🚀 Запуск массовой публикации...');
        
        for (const product of products) {
          try {
            const result = await publishSingleProduct(product);
            results.push({
              productId: product.id,
              productName: product.name,
              success: result.success,
              message: result.message,
              taskId: result.taskId
            });
          } catch (error: any) {
            results.push({
              productId: product.id,
              productName: product.name,
              success: false,
              message: error.message
            });
          }
        }

        return NextResponse.json({
          success: true,
          message: `Обработано ${results.length} товаров`,
          results: results,
          summary: {
            total: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
          }
        });

      case 'bulk-update-status':
        // Массовое обновление статуса
        const { status, errorMessage } = data;
        
        await prisma.product.updateMany({
          where: {
            id: { in: productIds }
          },
          data: {
            status: status,
            errorMessage: errorMessage || null
          }
        });

        return NextResponse.json({
          success: true,
          message: `Статус обновлен для ${productIds.length} товаров`
        });

      case 'bulk-delete':
        // Массовое удаление товаров
        console.log('🗑️ Запуск массового удаления...');
        
        // Проверяем, что товары не опубликованы
        const publishedProducts = products.filter(p => p.status === 'PUBLISHED');
        if (publishedProducts.length > 0) {
          return NextResponse.json({
            success: false,
            error: `Нельзя удалить ${publishedProducts.length} товаров, которые уже опубликованы на Wildberries`
          }, { status: 400 });
        }

        // Удаляем связи с кабинетами
        await prisma.productCabinet.deleteMany({
          where: {
            productId: { in: productIds }
          }
        });

        // Удаляем товары
        await prisma.product.deleteMany({
          where: {
            id: { in: productIds }
          }
        });

        return NextResponse.json({
          success: true,
          message: `Удалено ${productIds.length} товаров`
        });

      case 'bulk-assign-cabinet':
        // Массовое назначение кабинета
        const { cabinetId } = data;
        
        if (!cabinetId) {
          return NextResponse.json({
            success: false,
            error: 'Не указан ID кабинета'
          }, { status: 400 });
        }

        // Проверяем существование кабинета
        const cabinet = await prisma.cabinet.findUnique({
          where: { id: cabinetId }
        });

        if (!cabinet) {
          return NextResponse.json({
            success: false,
            error: 'Кабинет не найден'
          }, { status: 404 });
        }

        // Добавляем связи с кабинетом
        for (const productId of productIds) {
          await prisma.productCabinet.upsert({
            where: {
              productId_cabinetId: {
                productId: productId,
                cabinetId: cabinetId
              }
            },
            update: { isSelected: true },
            create: {
              productId: productId,
              cabinetId: cabinetId,
              isSelected: true
            }
          });
        }

        return NextResponse.json({
          success: true,
          message: `Кабинет "${cabinet.name}" назначен для ${productIds.length} товаров`
        });

      case 'bulk-update-category':
        // Массовое обновление категории
        const { categoryId } = data;
        
        if (!categoryId) {
          return NextResponse.json({
            success: false,
            error: 'Не указан ID категории'
          }, { status: 400 });
        }

        // Проверяем существование категории
        const category = await prisma.wbSubcategory.findUnique({
          where: { id: parseInt(categoryId) },
          include: { parentCategory: true }
        });

        if (!category) {
          return NextResponse.json({
            success: false,
            error: 'Категория не найдена'
          }, { status: 404 });
        }

        await prisma.product.updateMany({
          where: {
            id: { in: productIds }
          },
          data: {
            subcategoryId: parseInt(categoryId)
          }
        });

        return NextResponse.json({
          success: true,
          message: `Категория "${category.parentCategory.name} / ${category.name}" назначена для ${productIds.length} товаров`
        });

      case 'bulk-reset-for-reprocessing':
        // Массовый сброс для повторной обработки
        await prisma.product.updateMany({
          where: {
            id: { in: productIds }
          },
          data: {
            status: 'PROCESSING',
            errorMessage: null,
            aiCharacteristics: null,
            generatedName: null,
            seoDescription: null,
            colorAnalysis: null
          }
        });

        return NextResponse.json({
          success: true,
          message: `${productIds.length} товаров сброшены для повторной обработки ИИ`
        });

      case 'bulk-export':
        // Экспорт данных товаров
        const exportData = products.map(product => {
          let aiData: any = {};
          let wbData: any = {};
          
          try {
            aiData = product.aiCharacteristics ? JSON.parse(product.aiCharacteristics) : {};
            wbData = product.wbData ? JSON.parse(product.wbData) : {};
          } catch (e) {
            console.warn('Ошибка парсинга данных при экспорте');
          }

          return {
            id: product.id,
            name: product.name,
            generatedName: product.generatedName,
            price: product.price,
            status: product.status,
            category: product.subcategory 
              ? `${product.subcategory.parentCategory.name} / ${product.subcategory.name}`
              : 'Не указана',
            wbSubjectId: product.subcategory?.wbSubjectId,
            vendorCode: wbData.userVendorCode,
            hasVariantSizes: wbData.hasVariantSizes,
            variantSizes: wbData.variantSizes,
            deliveryType: wbData.deliveryType,
            createdAt: product.createdAt,
            publishedAt: product.publishedAt,
            errorMessage: product.errorMessage,
            aiConfidence: aiData.confidence,
            characteristicsCount: aiData.characteristics?.length || 0
          };
        });

        return NextResponse.json({
          success: true,
          message: `Экспортированы данные ${products.length} товаров`,
          data: exportData
        });

      default:
        return NextResponse.json({
          success: false,
          error: `Неизвестное действие: ${action}`
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ Ошибка массовой операции:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка выполнения массовой операции',
      details: error.message
    }, { status: 500 });
  }
}

// GET - получение статистики товаров
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cabinetId = searchParams.get('cabinetId');

    let whereClause: any = {};
    
    if (cabinetId) {
      whereClause.productCabinets = {
        some: { cabinetId }
      };
    }

    // Базовая статистика
    const [
      totalProducts,
      processingCount,
      readyCount,
      publishedCount,
      errorCount,
      recentProducts
    ] = await Promise.all([
      prisma.product.count({ where: whereClause }),
      prisma.product.count({ where: { ...whereClause, status: 'PROCESSING' } }),
      prisma.product.count({ where: { ...whereClause, status: 'READY' } }),
      prisma.product.count({ where: { ...whereClause, status: 'PUBLISHED' } }),
      prisma.product.count({ where: { ...whereClause, status: 'ERROR' } }),
      prisma.product.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          subcategory: { include: { parentCategory: true } }
        }
      })
    ]);

    // Статистика по категориям
    const categoryStats = await prisma.product.groupBy({
      by: ['subcategoryId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    });

    // Получаем названия категорий
    const categoryIds = categoryStats.map(stat => stat.subcategoryId).filter((id): id is number => id !== null);
    const categories = await prisma.wbSubcategory.findMany({
      where: { id: { in: categoryIds } },
      include: { parentCategory: true }
    });

    const categoryStatsWithNames = categoryStats.map(stat => {
      const category = categories.find(c => c.id === stat.subcategoryId);
      return {
        categoryId: stat.subcategoryId,
        categoryName: category 
          ? `${category.parentCategory.name} / ${category.name}`
          : 'Не указана',
        count: stat._count.id
      };
    });

    // Статистика по размерам
    const productsWithSizes = await prisma.product.findMany({
      where: whereClause,
      select: { wbData: true }
    });

    let sizesStats = {
      withSizes: 0,
      withoutSizes: 0,
      totalSizes: 0
    };

    productsWithSizes.forEach(product => {
      try {
        const wbData = product.wbData ? JSON.parse(product.wbData) : {};
        if (wbData.hasVariantSizes && Array.isArray(wbData.variantSizes)) {
          sizesStats.withSizes++;
          sizesStats.totalSizes += wbData.variantSizes.length;
        } else {
          sizesStats.withoutSizes++;
        }
      } catch (e) {
        sizesStats.withoutSizes++;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          total: totalProducts,
          processing: processingCount,
          ready: readyCount,
          published: publishedCount,
          error: errorCount
        },
        categoryStats: categoryStatsWithNames,
        sizesStats,
        recentProducts: recentProducts.map(product => ({
          id: product.id,
          name: product.name,
          status: product.status,
          createdAt: product.createdAt,
          category: product.subcategory 
            ? `${product.subcategory.parentCategory?.name || 'Неизвестно'} / ${product.subcategory.name}`
            : 'Не указана'
        }))
      }
    });

  } catch (error: any) {
    console.error('❌ Ошибка получения статистики товаров:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка получения статистики',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * Функция для публикации одного товара
 */
async function publishSingleProduct(product: any) {
  try {
    // Проверяем статус
    if (product.status !== 'READY' && product.status !== 'ERROR') {
      throw new Error(`Товар "${product.name}" не готов к публикации (статус: ${product.status})`);
    }

    // Получаем активный кабинет
    const cabinet = product.productCabinets.find((pc: any) => 
      pc.cabinet.isActive && pc.cabinet.apiToken && pc.isSelected
    );

    if (!cabinet) {
      throw new Error(`Для товара "${product.name}" не найден активный кабинет с токеном`);
    }

    // Парсим данные ИИ
    let aiData: any = {};
    try {
      aiData = product.aiCharacteristics ? JSON.parse(product.aiCharacteristics) : {};
    } catch (e) {
      throw new Error(`Ошибка парсинга ИИ данных для товара "${product.name}"`);
    }

    if (!aiData.wbCardData) {
      throw new Error(`Отсутствуют подготовленные данные WB для товара "${product.name}"`);
    }

    // Обновляем статус на "Публикуется"
    await prisma.product.update({
      where: { id: product.id },
      data: { status: 'PUBLISHING' }
    });

    // Отправляем на WB
    const publishResult = await wbApiService.createProductCard(
      aiData.wbCardData, 
      cabinet.cabinet.apiToken
    );

    if (publishResult.success) {
      // Обновляем статус на "Опубликован"
      let currentWbData: any = {};
      try {
        currentWbData = product.wbData ? JSON.parse(product.wbData) : {};
      } catch (e) {
        console.warn('Ошибка парсинга wbData при обновлении после публикации');
      }

      await prisma.product.update({
        where: { id: product.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          wbData: JSON.stringify({
            ...currentWbData,
            publishResult: publishResult.data,
            taskId: publishResult.taskId,
            publishedAt: new Date().toISOString()
          }),
          errorMessage: null
        }
      });

      return {
        success: true,
        message: `Товар "${product.name}" успешно опубликован`,
        taskId: publishResult.taskId
      };
    } else {
      throw new Error(publishResult.error || 'Неизвестная ошибка WB API');
    }

  } catch (error: any) {
    // Обновляем статус на ошибку
    await prisma.product.update({
      where: { id: product.id },
      data: {
        status: 'ERROR',
        errorMessage: error.message
      }
    });

    return {
      success: false,
      message: error.message
    };
  }
}