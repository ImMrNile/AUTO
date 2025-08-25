// src/app/api/products/[id]/infographic/route.ts - ИСПРАВЛЕНО для null mainProductImage

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { infographicAgentSystem } from '../../../../../../lib/services/infographicAgentSystem';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;
    console.log(`🎨 Запуск создания инфографики для товара: ${productId}`);

    // Логируем все заголовки для отладки
    const headers = Object.fromEntries(request.headers.entries());
    console.log('📋 Заголовки запроса:', {
      'content-type': headers['content-type'],
      'content-length': headers['content-length']
    });

    // Получаем FormData
    let formData: FormData;
    try {
      console.log('📥 Попытка получения FormData...');
      formData = await request.formData();
      console.log('✅ FormData успешно получена');
    } catch (formDataError) {
      console.error('❌ Ошибка получения FormData:', formDataError);
      
      return NextResponse.json({
        success: false,
        error: 'Не удалось прочитать данные запроса как FormData',
        details: formDataError instanceof Error ? formDataError.message : 'Неизвестная ошибка'
      }, { status: 400 });
    }
    
    // Логируем содержимое FormData
    console.log('📊 Содержимое FormData:');
    const formDataEntries = Array.from(formData.entries());
    for (const [key, value] of formDataEntries) {
      if (value instanceof File) {
        console.log(`- ${key}: File(name="${value.name}", size=${value.size}, type="${value.type}")`);
      } else {
        console.log(`- ${key}: "${value}"`);
      }
    }
    
    // Извлекаем данные
    const competitorUrls = (formData.get('competitorUrls') as string) || '';
    const brandColors = (formData.get('brandColors') as string) || '#2563eb,#ffffff,#f3f4f6';
    const additionalImagesCount = parseInt((formData.get('additionalImagesCount') as string) || '0');
    
    console.log('📊 Извлеченные параметры:', {
      competitorUrlsLength: competitorUrls.length,
      brandColors,
      additionalImagesCount
    });
    
    // Собираем файлы
    const additionalImages: File[] = [];
    for (let i = 0; i < additionalImagesCount; i++) {
      const file = formData.get(`additionalImage${i}`);
      if (file instanceof File && file.size > 0) {
        additionalImages.push(file);
        console.log(`📸 Файл ${i}: ${file.name} (${file.size} bytes)`);
      }
    }
    
    console.log(`📸 Всего файлов получено: ${additionalImages.length}`);
    
    // Валидация
    if (additionalImages.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Не получено ни одного файла изображения',
        details: `Ожидалось ${additionalImagesCount} файлов, получено 0`
      }, { status: 400 });
    }

    // Получаем товар
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        subcategory: {
          include: {
            parentCategory: true
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json({
        success: false,
        error: 'Товар не найден'
      }, { status: 404 });
    }

    if (product.status !== 'READY') {
      return NextResponse.json({
        success: false,
        error: `Товар должен быть готов (READY), текущий статус: ${product.status}`
      }, { status: 400 });
    }

    // ИСПРАВЛЕНО: Проверяем наличие основного изображения
    if (!product.originalImage) {
      return NextResponse.json({
        success: false,
        error: 'У товара отсутствует основное изображение. Сначала загрузите основное фото товара.'
      }, { status: 400 });
    }

    // Парсим данные ИИ
    let aiData: any = {};
    try {
      aiData = product.aiCharacteristics ? JSON.parse(product.aiCharacteristics) : {};
    } catch (e) {
      console.error('❌ Ошибка парсинга aiCharacteristics:', e);
      aiData = {};
    }

    // Конвертируем файлы в base64
    const additionalProductImages: string[] = [];
    for (const file of additionalImages) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const dataUrl = `data:${file.type};base64,${base64}`;
        additionalProductImages.push(dataUrl);
        console.log(`🔄 Конвертирован ${file.name} в base64`);
      } catch (error) {
        console.error(`❌ Ошибка конвертации ${file.name}:`, error);
        return NextResponse.json({
          success: false,
          error: `Ошибка обработки файла ${file.name}`
        }, { status: 400 });
      }
    }

    // ИСПРАВЛЕНО: Подготавливаем данные для агентной системы с проверкой null
    const infographicInput = {
      productId: product.id,
      productName: product.generatedName || product.name,
      productCharacteristics: aiData.characteristics || [],
      seoDescription: product.seoDescription || 'Качественный товар',
      competitiveAdvantages: aiData.advantages || ['Высокое качество'],
      mainProductImage: product.originalImage, // Уже проверили выше, что не null
      additionalProductImages: additionalProductImages,
      competitorUrls: competitorUrls.split('\n').filter(url => url.trim()),
      brandColors: brandColors.split(',').map(c => c.trim()),
      categoryInfo: {
        name: product.subcategory?.name || 'Товары',
        parentName: product.subcategory?.parentCategory?.name || 'Общие'
      }
    };

    console.log('🚀 Запускаем агентную систему...');

    // Обновляем статус
    await prisma.product.update({
      where: { id: productId },
      data: { status: 'CREATING_INFOGRAPHICS' }
    });

    // Запускаем агентную систему
    const result = await infographicAgentSystem.generateProductInfographics(infographicInput);

    if (!result.success) {
      console.error('❌ Агентная система failed:', result.error);
      
      await prisma.product.update({
        where: { id: productId },
        data: { status: 'READY' }
      });

      return NextResponse.json({
        success: false,
        error: result.error || 'Ошибка создания инфографики'
      }, { status: 500 });
    }

    // Сохраняем результаты
    const wbData = product.wbData ? JSON.parse(product.wbData) : {};
    const updatedWbData = {
      ...wbData,
      infographics: {
        createdAt: new Date().toISOString(),
        totalCount: result.infographics.length,
        processingTime: result.processingTime,
        qualityScore: result.qualityScore,
        images: result.infographics
      }
    };

    await prisma.product.update({
      where: { id: productId },
      data: {
        status: 'READY',
        wbData: JSON.stringify(updatedWbData)
      }
    });

    console.log('🎉 Инфографика создана успешно!');

    return NextResponse.json({
      success: true,
      message: 'Инфографика создана успешно',
      data: {
        productId: product.id,
        infographics: result.infographics,
        stats: {
          totalImages: result.infographics.length,
          processingTime: result.processingTime,
          qualityScore: result.qualityScore,
          inputImages: {
            productPhotos: 1 + additionalProductImages.length,
            competitorReferences: infographicInput.competitorUrls.length
          }
        },
        agentLogs: result.agentLogs
      }
    });

  } catch (error: any) {
    console.error('❌ Критическая ошибка:', error);
    
    try {
      await prisma.product.update({
        where: { id: params.id },
        data: { status: 'READY' }
      });
    } catch (updateError) {
      console.error('❌ Ошибка возврата статуса:', updateError);
    }

    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      details: error.message
    }, { status: 500 });
  }
}

// GET метод остается без изменений
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return NextResponse.json({
        success: false,
        error: 'Товар не найден'
      }, { status: 404 });
    }

    let wbData: any = {};
    try {
      wbData = product.wbData ? JSON.parse(product.wbData) : {};
    } catch (e) {
      wbData = {};
    }

    const infographics = wbData.infographics;

    if (!infographics) {
      return NextResponse.json({
        success: true,
        hasInfographics: false,
        message: 'Инфографика еще не создана'
      });
    }

    return NextResponse.json({
      success: true,
      hasInfographics: true,
      data: {
        productId: product.id,
        productName: product.generatedName || product.name,
        infographics: infographics.images || [],
        stats: {
          totalCount: infographics.totalCount || 0,
          processingTime: infographics.processingTime || 0,
          qualityScore: infographics.qualityScore || 0,
          createdAt: infographics.createdAt
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Ошибка GET:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка получения данных'
    }, { status: 500 });
  }
}