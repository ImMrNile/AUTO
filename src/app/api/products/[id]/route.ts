// src/app/api/products/[id]/route.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ

import { NextRequest, NextResponse } from 'next/server';
import { prisma, safePrismaOperation } from '@/lib/prisma';
import { AuthService } from '@/lib/auth/auth-service';
import { unifiedAISystem } from '@/lib/services/unifiedAISystem';

// GET метод для получения полной информации о товаре
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`📦 Получение товара ID: ${params.id}`);

    // Проверка авторизации
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ 
        error: 'Не авторизован'
      }, { status: 401 });
    }

    // Получение товара с полной информацией
    const product = await safePrismaOperation(
      () => prisma.product.findFirst({
        where: { 
          id: params.id,
          userId: user.id // Проверка принадлежности пользователю
        },
        select: {
          id: true,
          name: true,
          price: true,
          status: true,
          originalImage: true,
          referenceUrl: true,
          dimensions: true,
          workflowId: true,
          processingMethod: true,
          generatedName: true,
          seoDescription: true,
          colorAnalysis: true,
          suggestedCategory: true,
          aiCharacteristics: true,
          wbData: true,
          errorMessage: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          subcategoryId: true,
          
          // Связанные данные
          subcategory: {
            select: {
              id: true,
              name: true,
              slug: true,
              parentCategory: {
                select: {
                  id: true,
                  name: true,
                  slug: true
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
          }
        }
      }),
      'получение товара'
    );

    if (!product) {
      return NextResponse.json({ 
        error: 'Товар не найден или у вас нет доступа к нему'
      }, { status: 404 });
    }

    // Парсинг и обработка характеристик ИИ
    let processedAiCharacteristics = null;
    let characteristicsCount = 0;
    let qualityMetrics = null;
    let analysisReport = null;
    
    if (product.aiCharacteristics) {
      try {
        let aiData;
        
        if (typeof product.aiCharacteristics === 'object') {
          aiData = product.aiCharacteristics;
        } else if (typeof product.aiCharacteristics === 'string') {
          aiData = JSON.parse(product.aiCharacteristics);
        }
        
        if (aiData) {
          processedAiCharacteristics = {
            characteristics: aiData.characteristics || [],
            confidence: aiData.confidence || 0,
            warnings: aiData.warnings || [],
            recommendations: aiData.recommendations || [],
            systemVersion: aiData.systemVersion || 'unknown',
            processedAt: aiData.processedAt
          };
          
          characteristicsCount = aiData.characteristics?.length || 0;
          qualityMetrics = aiData.qualityMetrics;
          analysisReport = aiData.analysisReport;
          
          console.log(`📊 Обработано характеристик ИИ: ${characteristicsCount}`);
        }
        
      } catch (parseError) {
        console.warn('⚠️ Ошибка парсинга характеристик ИИ:', parseError);
        processedAiCharacteristics = {
          characteristics: [],
          confidence: 0,
          warnings: ['Ошибка парсинга данных ИИ'],
          recommendations: [],
          systemVersion: 'unknown'
        };
      }
    }

    // Обработка данных WB
    let processedWbData = null;
    if (product.wbData) {
      try {
        processedWbData = typeof product.wbData === 'object' 
          ? product.wbData 
          : JSON.parse(product.wbData as string);
      } catch (wbParseError) {
        console.warn('⚠️ Ошибка парсинга WB данных:', wbParseError);
      }
    }

    // Формирование полного ответа
    const responseData = {
      success: true,
      product: {
        // Основная информация
        id: product.id,
        name: product.name,
        generatedName: product.generatedName,
        price: product.price,
        status: product.status,
        originalImage: product.originalImage,
        referenceUrl: product.referenceUrl,
        dimensions: product.dimensions,
        seoDescription: product.seoDescription,
        errorMessage: product.errorMessage,
        
        // Метаданные
        workflowId: product.workflowId,
        processingMethod: product.processingMethod,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        publishedAt: product.publishedAt,
        
        // Категория
        category: product.subcategory ? {
          id: product.subcategory.id,
          name: product.subcategory.name,
          slug: product.subcategory.slug,
          parentCategory: product.subcategory.parentCategory
        } : null,
        
        // Кабинеты
        cabinets: product.productCabinets.map(pc => ({
          id: pc.cabinet.id,
          name: pc.cabinet.name,
          isActive: pc.cabinet.isActive,
          isSelected: pc.isSelected
        })),
        
        // Данные ИИ анализа
        aiAnalysis: processedAiCharacteristics,
        characteristicsCount,
        qualityMetrics,
        analysisReport,
        
        // WB данные
        wbData: processedWbData
      },
      
      // Дополнительная информация для клиента
      meta: {
        hasAiAnalysis: !!processedAiCharacteristics,
        hasQualityMetrics: !!qualityMetrics,
        systemVersion: processedAiCharacteristics?.systemVersion || 'unknown',
        dataIntegrity: {
          aiCharacteristics: !!processedAiCharacteristics,
          wbData: !!processedWbData,
          category: !!product.subcategory,
          cabinets: product.productCabinets.length > 0
        }
      }
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Ошибка получения товара:', error);
    
    let errorMessage = 'Внутренняя ошибка сервера';
    let errorDetails = '';
    let errorCategory = 'unknown';
    
    if (error instanceof Error) {
      if (error.message.includes('P1001') || error.message.includes('database server')) {
        errorMessage = 'Временные проблемы с базой данных';
        errorCategory = 'database';
      } else if (error.message.includes('timeout') || error.message.includes('connection')) {
        errorMessage = 'Проблемы с подключением';
        errorCategory = 'network';
      } else {
        errorDetails = error.message;
        errorCategory = 'application';
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      errorCategory,
      details: errorDetails,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// PUT метод для обновления товара
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`✏️ Обновление товара ID: ${params.id}`);

    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ 
        error: 'Не авторизован'
      }, { status: 401 });
    }

    const updateData = await request.json();
    
    // Обновление товара
    const updatedProduct = await safePrismaOperation(
      () => prisma.product.update({
        where: { 
          id: params.id,
          userId: user.id // Проверка принадлежности
        },
        data: {
          ...updateData,
          updatedAt: new Date()
        }
      }),
      'обновление товара'
    );

    console.log(`✅ Товар ${params.id} обновлен`);

    return NextResponse.json({
      success: true,
      message: 'Товар успешно обновлен',
      product: updatedProduct
    });

  } catch (error) {
    console.error('❌ Ошибка обновления товара:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Ошибка обновления товара',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}