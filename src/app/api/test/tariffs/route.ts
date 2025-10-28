// src/app/api/test/tariffs/route.ts - Тестовый endpoint для получения KTR

import { NextRequest, NextResponse } from 'next/server';
import { WbTariffService } from '@/lib/services/wbTariffService';

/**
 * GET /api/test/tariffs?warehouse=Белая%20дача&token=YOUR_TOKEN
 * 
 * Получить KTR конкретного склада
 * 
 * Query параметры:
 * - warehouse: название склада (например "Белая дача", "Коледино")
 * - token: API токен продавца WB
 * - all: если true, вернуть все склады
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const warehouse = searchParams.get('warehouse');
    const apiToken = searchParams.get('token');
    const getAll = searchParams.get('all') === 'true';

    if (!apiToken) {
      return NextResponse.json(
        {
          error: 'API token required',
          message: 'Передайте параметр ?token=YOUR_WB_API_TOKEN'
        },
        { status: 400 }
      );
    }

    console.log(`\n📊 [Test Tariffs] Запрос получения тарифов`);
    console.log(`   Warehouse: ${warehouse || 'all'}`);
    console.log(`   Token: ${apiToken.substring(0, 10)}...`);

    if (getAll) {
      // Получить все склады
      console.log(`\n📦 Получаем все склады...`);
      
      const tariffs = await WbTariffService.getBoxTariffs(apiToken);
      
      if (!tariffs) {
        return NextResponse.json(
          {
            error: 'Failed to fetch tariffs',
            message: 'Не удалось получить тарифы от WB API'
          },
          { status: 500 }
        );
      }

      // Форматируем ответ
      const warehouses = tariffs.warehouseList.map(w => ({
        name: w.warehouseName,
        region: w.geoName,
        ktr_fbs: (w.boxDeliveryCoefExpr / 100).toFixed(2),
        ktr_marketplace: (w.boxDeliveryMarketplaceCoefExpr / 100).toFixed(2),
        delivery_base: w.boxDeliveryBase,
        delivery_liter: w.boxDeliveryLiter,
        storage_base: w.boxStorageBase,
        storage_liter: w.boxStorageLiter
      }));

      return NextResponse.json({
        success: true,
        data: {
          valid_until: tariffs.dtTillMax,
          next_update: tariffs.dtNextBox,
          warehouses: warehouses,
          total: warehouses.length
        }
      });
    }

    if (!warehouse) {
      return NextResponse.json(
        {
          error: 'Warehouse name required',
          message: 'Передайте параметр ?warehouse=Белая%20дача или ?all=true'
        },
        { status: 400 }
      );
    }

    // Получить конкретный склад
    console.log(`\n📦 Получаем KTR для склада "${warehouse}"...`);
    
    const ktr = await WbTariffService.getWarehouseKtr(apiToken, warehouse, false);

    if (ktr === null) {
      return NextResponse.json(
        {
          error: 'Warehouse not found',
          message: `Склад "${warehouse}" не найден. Используйте ?all=true чтобы увидеть доступные склады`
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        warehouse: warehouse,
        ktr: ktr,
        ktr_formatted: ktr.toFixed(2),
        
        // Примеры расчета логистики
        examples: {
          note: 'Примеры расчета логистики с этим KTR',
          '0.5l': {
            base_tariff: '29₽/л',
            with_ktr: `${(29 * 0.5 * ktr).toFixed(2)}₽`
          },
          '3l': {
            base_tariff: '74₽ (46 + 28)',
            with_ktr: `${(74 * ktr).toFixed(2)}₽`
          },
          '7l': {
            base_tariff: '130₽ (46 + 84)',
            with_ktr: `${(130 * ktr).toFixed(2)}₽`
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ [Test Tariffs] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
