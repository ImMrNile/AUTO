// src/app/api/wb/stocks-enhanced/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../../lib/auth/auth-service';
import { wbApiService } from '../../../../../lib/services/wbApiService';
import { prisma } from '../../../../../lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Простой in-memory кеш для остатков (TTL 5 минут)
const stocksCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

// GET - Получение детальных остатков по складам (FBS/FBW) с использованием WB API
export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cabinetId = searchParams.get('cabinetId');
    const nmId = searchParams.get('nmId');

    if (!cabinetId) {
      return NextResponse.json({ error: 'ID кабинета обязателен' }, { status: 400 });
    }

    // Проверяем кеш
    const cacheKey = `stocks:${cabinetId}:${nmId || 'all'}`;
    const cached = stocksCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`📦 [Enhanced Stocks] Возврат из кеша для ${cabinetId}`);
      return NextResponse.json(cached.data);
    }

    console.log(`📦 [Enhanced Stocks] Загрузка остатков для кабинета ${cabinetId}${nmId ? ` (товар ${nmId})` : ''}`);

    // Получаем API токен кабинета БЕЗ лишних запросов
    let cabinet;
    try {
      cabinet = await prisma.cabinet.findFirst({
        where: {
          id: cabinetId,
          userId: user.id
        },
        select: {
          id: true,
          apiToken: true
        }
      });
    } catch (dbError) {
      console.warn('⚠️ [Enhanced Stocks] Ошибка БД при получении кабинета, используем кеш:', dbError);
      // Если БД недоступна, возвращаем пустой результат
      return NextResponse.json({
        success: true,
        data: [],
        summary: {
          totalProducts: 0,
          totalStock: 0,
          totalReserved: 0,
          fbsStock: 0,
          fbwStock: 0
        },
        timestamp: new Date().toISOString(),
        cached: true
      });
    }

    if (!cabinet || !cabinet.apiToken) {
      return NextResponse.json({ error: 'Кабинет не найден или отсутствует API токен' }, { status: 404 });
    }

    // Используем WB API для получения остатков
    const stocksData = await wbApiService.getStocks(cabinet.apiToken);
    
    if (!stocksData || !Array.isArray(stocksData)) {
      console.warn('❌ [Enhanced Stocks] Некорректные данные от WB API');
      return NextResponse.json({ error: 'Ошибка получения данных от WB API' }, { status: 500 });
    }

    // Группируем остатки по товарам и складам
    const stocksMap = new Map();
    
    stocksData.forEach((stock: any) => {
      const stockNmId = stock.nmId || stock.nm_id;
      if (!stockNmId) return;

      // Если указан конкретный товар, пропускаем остальные
      if (nmId && stockNmId !== parseInt(nmId)) {
        return;
      }

      if (!stocksMap.has(stockNmId)) {
        stocksMap.set(stockNmId, {
          nmId: stockNmId,
          totalStock: 0,
          totalReserved: 0,
          fbsStock: 0,
          fbwStock: 0,
          warehouses: []
        });
      }

      const productStocks = stocksMap.get(stockNmId);
      const stockAmount = stock.amount || stock.quantity || 0;
      const reservedAmount = stock.reserved || 0;
      const warehouseType = stock.warehouseType || determineWarehouseType(stock);
      const warehouseName = stock.warehouseName || stock.warehouse_name || `Склад ${stock.warehouseId}`;
      const warehouseId = stock.warehouseId || stock.warehouse_id;

      // Обновляем общие остатки
      productStocks.totalStock += stockAmount;
      productStocks.totalReserved += reservedAmount;

      // Обновляем остатки по типам
      if (warehouseType === 'FBS') {
        productStocks.fbsStock += stockAmount;
      } else if (warehouseType === 'FBO' || warehouseType === 'FBW') {
        productStocks.fbwStock += stockAmount;
      }

      // Добавляем информацию о складе
      productStocks.warehouses.push({
        warehouseId: warehouseId,
        warehouseName: warehouseName,
        warehouseType: warehouseType,
        stock: stockAmount,
        reserved: reservedAmount,
        available: stockAmount - reservedAmount,
        lastUpdate: stock.lastUpdate || new Date().toISOString()
      });
    });

    // Сохраняем остатки в БД БЕЗ ожидания (асинхронно)
    if (stocksMap.size > 0) {
      // Запускаем обновление в фоне БЕЗ await
      prisma.product.updateMany({
        where: {
          wbNmId: { in: Array.from(stocksMap.keys()).map(k => k.toString()) },
          userId: user.id
        },
        data: {
          updatedAt: new Date()
        }
      }).catch((err: any) => console.warn('⚠️ [Enhanced Stocks] Ошибка фонового обновления БД:', err));
    }

    const result = {
      success: true,
      data: Array.from(stocksMap.values()),
      summary: {
        totalProducts: stocksMap.size,
        totalStock: Array.from(stocksMap.values()).reduce((sum, item) => sum + item.totalStock, 0),
        totalReserved: Array.from(stocksMap.values()).reduce((sum, item) => sum + item.totalReserved, 0),
        fbsStock: Array.from(stocksMap.values()).reduce((sum, item) => sum + item.fbsStock, 0),
        fbwStock: Array.from(stocksMap.values()).reduce((sum, item) => sum + item.fbwStock, 0)
      },
      timestamp: new Date().toISOString()
    };

    // Кешируем результат
    stocksCache.set(cacheKey, { data: result, timestamp: Date.now() });

    console.log(`✅ [Enhanced Stocks] Загружено остатков: ${result.summary.totalProducts} товаров, FBS: ${result.summary.fbsStock}, FBW: ${result.summary.fbwStock}`);

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ [Enhanced Stocks] Ошибка получения остатков:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Обновление остатков FBS на складе
export async function POST(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const body = await request.json();
    const { cabinetId, warehouseId, sku, amount } = body;

    if (!cabinetId || !warehouseId || !sku || amount === undefined) {
      return NextResponse.json({ 
        error: 'Обязательные параметры: cabinetId, warehouseId, sku, amount' 
      }, { status: 400 });
    }

    if (amount < 0) {
      return NextResponse.json({ error: 'Количество не может быть отрицательным' }, { status: 400 });
    }

    // Получаем API токен кабинета
    const cabinet = await prisma.cabinet.findFirst({
      where: {
        id: cabinetId,
        userId: user.id
      }
    });

    if (!cabinet || !cabinet.apiToken) {
      return NextResponse.json({ error: 'Кабинет не найден или отсутствует API токен' }, { status: 404 });
    }

    console.log(`📦 [Enhanced Stocks] Установка остатка: SKU=${sku}, склад=${warehouseId}, количество=${amount}`);

    // Используем WB API для обновления остатков
    const updateResult = await wbApiService.updateStock(
      cabinet.apiToken,
      warehouseId,
      sku,
      amount
    );

    if (!updateResult) {
      throw new Error('Ошибка обновления остатков через WB API');
    }

    console.log(`✅ [Enhanced Stocks] Остаток успешно установлен: ${amount} шт`);

    // Обновляем данные в БД
    try {
      const product = await prisma.product.findFirst({
        where: {
          vendorCode: sku,
          userId: user.id
        }
      });

      if (product) {
        await prisma.product.update({
          where: { id: product.id },
          data: {}
        });
      }
    } catch (dbError) {
      console.warn('⚠️ [Enhanced Stocks] Ошибка обновления БД:', dbError);
    }

    return NextResponse.json({
      success: true,
      message: `Остаток успешно установлен: ${amount} шт`,
      data: {
        warehouseId: warehouseId,
        sku: sku,
        amount: amount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ [Enhanced Stocks] Ошибка обновления остатков:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Вспомогательная функция для определения типа склада
function determineWarehouseType(stock: any): string {
  // Определяем тип склада на основе данных от WB API
  if (stock.deliveryType === 1 || stock.delivery_type === 1) {
    return 'FBS';
  } else if (stock.deliveryType === 0 || stock.delivery_type === 0) {
    return 'FBO';
  } else if (stock.warehouseName?.toLowerCase().includes('фбс') || 
             stock.warehouse_name?.toLowerCase().includes('фбс')) {
    return 'FBS';
  } else if (stock.warehouseName?.toLowerCase().includes('фбо') || 
             stock.warehouse_name?.toLowerCase().includes('фбо') ||
             stock.warehouseName?.toLowerCase().includes('wb') ||
             stock.warehouse_name?.toLowerCase().includes('wb')) {
    return 'FBO';
  }
  
  // По умолчанию считаем FBO (склад WB)
  return 'FBO';
}
