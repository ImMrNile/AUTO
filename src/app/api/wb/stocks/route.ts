import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { safePrismaOperation } from '../../../../../lib/prisma-utils';
import { AuthService } from '../../../../../lib/auth/auth-service';
import { WB_API_CONFIG } from '../../../../../lib/config/wbApiConfig';

/**
 * GET /api/wb/stocks - Получение остатков со складов WB
 * POST /api/wb/stocks - Обновление остатков FBS
 */

export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cabinetId = searchParams.get('cabinetId');
    const cabinet = await getActiveCabinet(user.id, cabinetId || undefined);
    console.log(`📦 Работаем с кабинетом: ${cabinet?.name || 'не найден'} (ID: ${cabinet?.id || 'N/A'})`);
    if (!cabinet || !cabinet.apiToken) {
      return NextResponse.json({
        error: 'Не найден активный кабинет с API токеном'
      }, { status: 400 });
    }

    // Получаем список складов
    const warehousesResponse = await fetch(
      `${WB_API_CONFIG.BASE_URLS.MARKETPLACE}/api/v3/warehouses`,
      {
        method: 'GET',
        headers: {
          'Authorization': cabinet.apiToken,
          'Accept': 'application/json'
        }
      }
    );

    if (!warehousesResponse.ok) {
      throw new Error('Ошибка получения списка складов');
    }

    const warehouses = await warehousesResponse.json();
    console.log(`📦 Получено складов: ${warehouses.length}`);
    warehouses.forEach((w: any) => {
      // Согласно документации WB API:
      // deliveryType: 1 = FBS, 2 = FBW
      const warehouseType = w.deliveryType === 1 ? 'FBS' : 'FBW';
      console.log(`  - ${w.name} (ID: ${w.id}): deliveryType=${w.deliveryType} → тип=${warehouseType}`);
    });

    // Получаем остатки со всех складов
    const allStocks: any[] = [];
    
    for (const warehouse of warehouses) {
      try {
        const stocksResponse = await fetch(
          `${WB_API_CONFIG.BASE_URLS.MARKETPLACE}/api/v3/stocks/${warehouse.id}`,
          {
            method: 'POST',
            headers: {
              'Authorization': cabinet.apiToken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ skus: [] })
          }
        );

        if (stocksResponse.ok) {
          const stocksData = await stocksResponse.json();
          if (stocksData.stocks && Array.isArray(stocksData.stocks)) {
            // Согласно документации WB API:
            // deliveryType: 1 = FBS, 2 = FBW
            const warehouseType = warehouse.deliveryType === 1 ? 'FBS' : 'FBW';
            console.log(`📦 Склад "${warehouse.name}" (${warehouseType}): ${stocksData.stocks.length} остатков`);
            
            // Добавляем информацию о складе к каждому остатку
            const stocksWithWarehouse = stocksData.stocks.map((stock: any) => ({
              ...stock,
              warehouseId: warehouse.id,
              warehouseName: warehouse.name,
              warehouseType: warehouseType
            }));
            allStocks.push(...stocksWithWarehouse);
          } else {
            console.log(`📦 Склад "${warehouse.name}": нет остатков или неверный формат`);
          }
        } else {
          console.warn(`⚠️ Ошибка API для склада ${warehouse.name}: ${stocksResponse.status}`);
        }
      } catch (error) {
        console.warn(`⚠️ Ошибка получения остатков со склада ${warehouse.name}:`, error);
      }
    }

    // Группируем остатки по товарам
    const stocksByProduct = new Map();
    console.log(`📦 Группировка ${allStocks.length} остатков по товарам...`);
    
    allStocks.forEach(stock => {
      const nmId = stock.nmId;
      if (!stocksByProduct.has(nmId)) {
        stocksByProduct.set(nmId, {
          nmId,
          vendorCode: stock.vendorCode,
          warehouses: [],
          totalStock: 0,
          totalReserved: 0,
          fbsStock: 0,
          fbwStock: 0
        });
      }
      
      const productStock = stocksByProduct.get(nmId);
      productStock.warehouses.push({
        warehouseId: stock.warehouseId,
        warehouseName: stock.warehouseName,
        warehouseType: stock.warehouseType,
        stock: stock.amount || 0,
        reserved: stock.reservedAmount || 0
      });
      
      productStock.totalStock += stock.amount || 0;
      productStock.totalReserved += stock.reservedAmount || 0;
      
      if (stock.warehouseType === 'FBS') {
        productStock.fbsStock += stock.amount || 0;
      } else {
        productStock.fbwStock += stock.amount || 0;
      }
    });
    
    // Логируем итоговую статистику
    const totalFBS = Array.from(stocksByProduct.values()).reduce((sum, p: any) => sum + p.fbsStock, 0);
    const totalFBW = Array.from(stocksByProduct.values()).reduce((sum, p: any) => sum + p.fbwStock, 0);
    console.log(`📊 Итоговые остатки: FBS=${totalFBS} шт, FBW=${totalFBW} шт, всего=${totalFBS + totalFBW} шт`);

    // Сохраняем остатки в БД
    const stocksArray = Array.from(stocksByProduct.values());
    console.log(`📦 Сохранение остатков в БД для ${stocksArray.length} товаров...`);
    
    for (const stockData of stocksArray) {
      try {
        await prisma.product.updateMany({
          where: {
            wbNmId: stockData.nmId.toString(),
            userId: user.id
          },
          data: {
            stock: stockData.totalStock,
            reserved: stockData.totalReserved,
            lastWbSyncAt: new Date(),
            wbSyncStatus: 'SUCCESS'
          }
        });
      } catch (error) {
        console.warn(`⚠️ Ошибка сохранения остатков для товара ${stockData.nmId}:`, error);
      }
    }
    
    console.log(`✅ Остатки сохранены в БД`);

    return NextResponse.json({
      success: true,
      warehouses,
      stocks: stocksArray
    });

  } catch (error) {
    console.error('❌ Ошибка получения остатков:', error);
    return NextResponse.json({
      error: 'Ошибка получения остатков',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { warehouseId, sku, amount } = await request.json();

    if (!warehouseId || !sku || amount === undefined) {
      return NextResponse.json({
        error: 'Не указаны обязательные параметры'
      }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const cabinetId = searchParams.get('cabinetId');
    const cabinet = await getActiveCabinet(user.id, cabinetId || undefined);
    console.log(`📦 Работаем с кабинетом: ${cabinet?.name || 'не найден'} (ID: ${cabinet?.id || 'N/A'})`);
    if (!cabinet || !cabinet.apiToken) {
      return NextResponse.json({
        error: 'Не найден активный кабинет с API токеном'
      }, { status: 400 });
    }

    // Обновляем остатки через API WB
    const response = await fetch(
      `${WB_API_CONFIG.BASE_URLS.MARKETPLACE}/api/v3/stocks/${warehouseId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': cabinet.apiToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          stocks: [{
            sku,
            amount
          }]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Ошибка обновления остатков');
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Остатки успешно обновлены',
      result
    });

  } catch (error) {
    console.error('❌ Ошибка обновления остатков:', error);
    return NextResponse.json({
      error: 'Ошибка обновления остатков',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

async function getActiveCabinet(userId: string, cabinetId?: string) {
  // Если указан конкретный cabinetId, ищем его
  if (cabinetId) {
    const cabinet = await safePrismaOperation(
      () => prisma.cabinet.findUnique({
        where: {
          id: cabinetId,
          userId: userId,
          apiToken: { not: null }
        }
      }),
      'получение указанного кабинета'
    );
    return cabinet;
  }
  
  // Иначе ищем активный кабинет
  const cabinets = await safePrismaOperation(
    () => prisma.cabinet.findMany({
      where: {
        userId: userId,
        isActive: true,
        apiToken: { not: null }
      }
    }),
    'получение активного кабинета'
  );

  return cabinets && cabinets.length > 0 ? cabinets[0] : null;
}
