// API для синхронизации остатков из WB в БД
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { AuthService } from '../../../../../lib/auth/auth-service';
import { wbApiService } from '../../../../../lib/services/wbApiService';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [Sync Stocks] Начало синхронизации остатков из WB');
    
    // Авторизация
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { cabinetId } = await request.json();
    
    if (!cabinetId) {
      return NextResponse.json({ error: 'Не указан cabinetId' }, { status: 400 });
    }

    // Получаем кабинет
    const cabinet = await prisma.cabinet.findFirst({
      where: {
        id: cabinetId,
        userId: user.id,
        isActive: true
      }
    });

    if (!cabinet || !cabinet.apiToken) {
      return NextResponse.json({ error: 'Кабинет не найден или нет API токена' }, { status: 404 });
    }

    console.log(` [Sync Stocks] Загрузка остатков для кабинета: ${cabinet.name}`);

    // 1. Получаем баркоды товаров из БД
    const products = await prisma.product.findMany({
      where: {
        userId: user.id,
        wbNmId: {
          not: null // Только товары из WB
        }
      },
      select: {
        id: true,
        wbNmId: true,
        barcode: true,
        barcodes: true
      }
    });

    console.log(`📦 [Sync Stocks] Найдено ${products.length} товаров в БД`);

    // Собираем все баркоды
    const allBarcodes: string[] = [];
    for (const product of products) {
      if (product.barcodes && Array.isArray(product.barcodes)) {
        const validBarcodes = (product.barcodes as any[]).filter((b: any) => typeof b === 'string' && b) as string[];
        allBarcodes.push(...validBarcodes);
      } else if (product.barcode && typeof product.barcode === 'string') {
        allBarcodes.push(product.barcode);
      }
    }

    console.log(`📦 [Sync Stocks] Всего баркодов: ${allBarcodes.length}`);

    // 2. Загружаем остатки из WB API с таймаутом
    let stocks: any[];
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: WB API не ответил за 30 секунд')), 30000)
      );
      
      // Передаем баркоды для получения FBS остатков
      const stocksPromise = wbApiService.getStocksWithBarcodes(cabinet.apiToken, allBarcodes);
      
      stocks = await Promise.race([stocksPromise, timeoutPromise]) as any[];
      
      if (!stocks || !Array.isArray(stocks)) {
        throw new Error('Некорректный формат данных от WB API');
      }
      
      console.log(`✅ [Sync Stocks] Загружено ${stocks.length} записей остатков`);
    } catch (error) {
      console.error('❌ [Sync Stocks] Ошибка загрузки остатков:', error);
      return NextResponse.json({ 
        error: 'Ошибка загрузки остатков из WB',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      }, { status: 500 });
    }

    // Обновляем остатки в БД
    let updatedCount = 0;
    let notFoundCount = 0;

    // Группируем остатки по nmId
    const stocksByNmId = new Map<string, { fbs: number; fbw: number; dbs: number }>();
    
    for (const stock of stocks) {
      const nmId = String(stock.nmId);
      const warehouseType = stock.warehouseType || 'FBW';
      const quantity = stock.quantity || stock.quantityFull || 0;
      
      if (!stocksByNmId.has(nmId)) {
        stocksByNmId.set(nmId, { fbs: 0, fbw: 0, dbs: 0 });
      }
      
      const current = stocksByNmId.get(nmId)!;
      if (warehouseType === 'FBS') {
        current.fbs += quantity;
      } else if (warehouseType === 'DBS') {
        current.dbs += quantity;
      } else {
        current.fbw += quantity;
      }
    }
    
    console.log(`📊 [Sync Stocks] Обработано ${stocksByNmId.size} уникальных товаров`);

    // Обновляем остатки в БД
    for (const [nmId, stockData] of stocksByNmId.entries()) {
      try {
        // Ищем товар по nmId
        const product = await prisma.product.findFirst({
          where: {
            wbNmId: nmId,
            userId: user.id
          }
        });

        if (!product) {
          notFoundCount++;
          continue;
        }

        // Обновляем остатки
        const totalStock = stockData.fbs + stockData.fbw + stockData.dbs;
        await prisma.product.update({
          where: { id: product.id },
          data: {
            stock: totalStock,
            fbsStock: stockData.fbs,
            fbwStock: stockData.fbw,
            lastWbSyncAt: new Date(),
            wbSyncStatus: 'synced'
          }
        });

        updatedCount++;
      } catch (error) {
        console.error(`❌ [Sync Stocks] Ошибка обновления товара ${nmId}:`, error);
      }
    }

    console.log(`✅ [Sync Stocks] Синхронизация завершена:`);
    console.log(`   - Обновлено: ${updatedCount} товаров`);
    console.log(`   - Не найдено в БД: ${notFoundCount} товаров`);

    return NextResponse.json({
      success: true,
      message: 'Остатки успешно синхронизированы',
      stats: {
        total: stocks.length,
        updated: updatedCount,
        notFound: notFoundCount
      }
    });

  } catch (error) {
    console.error('❌ [Sync Stocks] Критическая ошибка:', error);
    return NextResponse.json({
      error: 'Ошибка синхронизации остатков',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET метод для получения статуса последней синхронизации
export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cabinetId = searchParams.get('cabinetId');

    if (!cabinetId) {
      return NextResponse.json({ error: 'Не указан cabinetId' }, { status: 400 });
    }

    // Получаем товары с информацией о последней синхронизации
    const products = await prisma.product.findMany({
      where: {
        userId: user.id,
        productCabinets: {
          some: {
            cabinetId: cabinetId
          }
        }
      },
      select: {
        id: true,
        wbNmId: true,
        stock: true,
        lastWbSyncAt: true,
        wbSyncStatus: true
      },
      orderBy: {
        lastWbSyncAt: 'desc'
      },
      take: 10
    });

    const lastSync = products[0]?.lastWbSyncAt;
    const syncedCount = products.filter(p => p.wbSyncStatus === 'synced').length;

    return NextResponse.json({
      success: true,
      data: {
        lastSyncAt: lastSync,
        totalProducts: products.length,
        syncedProducts: syncedCount,
        recentProducts: products
      }
    });

  } catch (error) {
    console.error('❌ [Sync Stocks] Ошибка получения статуса:', error);
    return NextResponse.json({
      error: 'Ошибка получения статуса синхронизации',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
