// src/app/api/products/batch-update-price/route.ts - Массовое обновление цен

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { AuthService } from '../../../../../lib/auth/auth-service';
import { wbApiService } from '../../../../../lib/services/wbApiService';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Кэш кабинетов
const cabinetCache = new Map<string, { cabinet: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

async function getUserCabinet(userId: string) {
  const cached = cabinetCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.cabinet;
  }

  const cabinet = await prisma.cabinet.findFirst({
    where: { userId }
  });

  if (cabinet) {
    cabinetCache.set(userId, { cabinet, timestamp: Date.now() });
  }

  return cabinet;
}

interface PriceUpdate {
  productId: string;
  originalPrice: number;
  discountPrice: number;
}

/**
 * POST - Массовое обновление цен товаров
 * Оптимизированная версия для обновления нескольких товаров за один запрос
 */
export async function POST(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: 'Не авторизован' 
      }, { status: 401 });
    }

    const { updates }: { updates: PriceUpdate[] } = await request.json();

    console.log(`📦 [Batch Update] Начало массового обновления ${updates.length} товаров`);

    // Получаем кабинет один раз для всех товаров
    const cabinet = await getUserCabinet(user.id);
    if (!cabinet) {
      console.warn(`❌ У пользователя нет кабинета`);
    }

    // Получаем все товары одним запросом
    const productIds = updates.map(u => u.productId);
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { id: { in: productIds } },
          { wbNmId: { in: productIds } }
        ],
        userId: user.id
      }
    });

    console.log(`✅ Найдено товаров: ${products.length}`);

    // Создаем Map для быстрого поиска
    const productMap = new Map(products.map(p => [p.id, p]));
    const productMapByNmId = new Map(products.map(p => [p.wbNmId || '', p]));

    const results = [];
    const wbUpdates: Array<{ nmId: number; price: number; discount: number }> = [];

    // Обрабатываем каждое обновление
    for (const update of updates) {
      try {
        const product = productMap.get(update.productId) || productMapByNmId.get(update.productId);
        
        if (!product) {
          results.push({
            productId: update.productId,
            success: false,
            error: 'Product not found'
          });
          continue;
        }

        // Проверяем, изменилась ли цена
        const priceChanged = product.price !== update.originalPrice || 
                             product.discountPrice !== update.discountPrice;

        if (!priceChanged) {
          results.push({
            productId: update.productId,
            success: true,
            skipped: true,
            message: 'Price unchanged'
          });
          continue;
        }

        // Обновляем в БД
        const wbData = (product.wbData as any) || {};
        const updatedWbData = {
          ...wbData,
          originalPrice: update.originalPrice,
          discountPrice: update.discountPrice
        };

        await prisma.product.update({
          where: { id: product.id },
          data: {
            price: update.discountPrice,
            wbData: updatedWbData
          }
        });

        // Добавляем в список для WB (если есть nmId)
        if (product.wbNmId && cabinet?.apiToken) {
          const discount = Math.round(((update.originalPrice - update.discountPrice) / update.originalPrice) * 100);
          wbUpdates.push({
            nmId: parseInt(product.wbNmId),
            price: update.originalPrice,
            discount
          });
        }

        results.push({
          productId: update.productId,
          success: true,
          updated: true
        });

      } catch (error: any) {
        results.push({
          productId: update.productId,
          success: false,
          error: error.message
        });
      }
    }

    console.log(`✅ Обновлено в БД: ${results.filter(r => r.success).length} товаров`);

    // Отправляем все обновления в WB одним запросом
    let wbSyncResult = null;
    if (wbUpdates.length > 0 && cabinet?.apiToken) {
      try {
        console.log(`📤 Отправка ${wbUpdates.length} обновлений цен в WB...`);
        
        // TODO: Реализовать batch метод в wbApiService
        // Пока пропускаем WB синхронизацию для batch обновлений
        wbSyncResult = {
          success: true,
          message: 'WB batch sync not implemented yet',
          skipped: wbUpdates.length
        };

        console.log(`⚠️ WB синхронизация пропущена (batch метод не реализован)`);
      } catch (wbError: any) {
        console.error(`❌ Ошибка синхронизации с WB:`, wbError);
        wbSyncResult = {
          success: false,
          error: wbError.message
        };
      }
    }

    return NextResponse.json({
      success: true,
      updated: results.filter(r => r.success && r.updated).length,
      skipped: results.filter(r => r.success && r.skipped).length,
      failed: results.filter(r => !r.success).length,
      results,
      wbSync: wbSyncResult
    });

  } catch (error: any) {
    console.error('❌ Ошибка массового обновления цен:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to batch update prices' 
      },
      { status: 500 }
    );
  }
}
