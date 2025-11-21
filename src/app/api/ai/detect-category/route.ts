// src/app/api/ai/detect-category/route.ts - API endpoint для определения категории товара

import { NextRequest, NextResponse } from 'next/server';
import { detectProductCategory } from '../../../../../lib/services/categoryDetectionAgent';
import sharp from 'sharp';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Максимальный размер изображения для отправки в AI (в пикселях)
const MAX_IMAGE_WIDTH = 1024;
const MAX_IMAGE_HEIGHT = 1024;
const JPEG_QUALITY = 80;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const productName = formData.get('productName') as string;
    
    if (!productName) {
      return NextResponse.json(
        { success: false, error: 'Отсутствует название товара' },
        { status: 400 }
      );
    }

    console.log('🔍 [API] Запрос на определение категории для:', productName);

    // Собираем все изображения из FormData
    const imageFiles: File[] = [];
    
    // Главное изображение
    const mainImage = formData.get('mainImage') as File;
    if (mainImage) {
      imageFiles.push(mainImage);
    }
    
    // Дополнительные изображения
    let index = 0;
    while (true) {
      const additionalImage = formData.get(`additionalImage${index}`) as File; // БЕЗ подчёркивания!
      if (!additionalImage) break;
      imageFiles.push(additionalImage);
      index++;
    }

    console.log('🖼️ [API] Получено файлов изображений:', imageFiles.length);

    if (imageFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Не загружено ни одного изображения' },
        { status: 400 }
      );
    }

    // Конвертируем файлы в base64 data URLs с сжатием
    const imageDataUrls: string[] = [];
    
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      
      console.log(`🔄 Обработка изображения ${i + 1}/${imageFiles.length}: ${file.name} (${Math.round(file.size / 1024)}KB)`);
      
      // Читаем файл как ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Сжимаем изображение с помощью sharp
      const compressedBuffer = await sharp(buffer)
        .resize(MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer();
      
      // Конвертируем в base64
      const base64 = compressedBuffer.toString('base64');
      const dataUrl = `data:image/jpeg;base64,${base64}`;
      
      imageDataUrls.push(dataUrl);
      console.log(`✅ Изображение ${i + 1} сжато: ${Math.round(file.size / 1024)}KB → ${Math.round(base64.length / 1024)}KB`);
    }

    console.log('📋 [API] Конвертировано изображений:', imageDataUrls.length);

    // Вызываем AI агента с base64 data URLs
    const result = await detectProductCategory({
      productName,
      productImages: imageDataUrls
    });

    console.log('✅ [API] Результат определения категории:', {
      success: result.success,
      category: result.detectedCategory?.name,
      confidence: result.confidence
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('❌ [API] Ошибка в /api/ai/detect-category:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Внутренняя ошибка сервера',
        detectedCategory: null,
        alternatives: [],
        confidence: 0,
        reasoning: 'Ошибка обработки запроса',
        processingTime: 0,
        cost: 0
      },
      { status: 500 }
    );
  }
}
