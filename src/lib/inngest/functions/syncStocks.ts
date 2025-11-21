import { inngest } from '../client';
import { prisma } from '@/lib/prisma';

interface SyncStocksInput {
  cabinetId: string;
  userId: string;
}

/**
 * Durable функция для синхронизации остатков с WB
 * Может работать долго (10-30 минут) без потери прогресса
 */
export const syncStocksWorkflow = inngest.createFunction(
  {
    id: 'sync-stocks',
    name: 'Sync Stocks from Wildberries',
    retries: 5, // Больше повторов для надежности
  },
  { event: 'stocks/sync' },
  async ({ event, step }) => {
    const { cabinetId, userId } = event.data as SyncStocksInput;

    console.log(`🔄 [Workflow] Начало синхронизации остатков для кабинета: ${cabinetId}`);

    // Шаг 1: Получаем токен кабинета
    const cabinet = await step.run('get-cabinet', async () => {
      console.log('📋 [Workflow] Получение данных кабинета...');
      
      return await prisma.cabinet.findUnique({
        where: { id: cabinetId },
      });
    });

    if (!cabinet || !cabinet.apiToken) {
      throw new Error('Кабинет не найден или нет API токена');
    }

    // Шаг 2: Получаем список товаров из WB
    const wbProducts = await step.run('fetch-wb-products', async () => {
      console.log('📦 [Workflow] Загрузка товаров из WB...');
      
      // TODO: Вызов WB API для получения списка товаров
      // const response = await fetch('https://suppliers-api.wildberries.ru/content/v2/get/cards/list', {
      //   headers: { 'Authorization': cabinet.apiToken }
      // });
      
      // Заглушка
      return [
        { nmId: 123456, name: 'Товар 1', stock: 10 },
        { nmId: 789012, name: 'Товар 2', stock: 5 },
      ];
    });

    // Шаг 3: Получаем остатки из WB
    const wbStocks = await step.run('fetch-wb-stocks', async () => {
      console.log('📊 [Workflow] Загрузка остатков из WB...');
      
      // TODO: Вызов WB API для получения остатков
      // const response = await fetch('https://suppliers-api.wildberries.ru/api/v3/stocks', {
      //   headers: { 'Authorization': cabinet.apiToken }
      // });
      
      // Заглушка
      return {
        123456: { quantity: 10, warehouse: 'Москва' },
        789012: { quantity: 5, warehouse: 'СПб' },
      };
    });

    // Шаг 4: Обновляем товары в БД (батчами по 100)
    const batchSize = 100;
    const batches = [];
    
    for (let i = 0; i < wbProducts.length; i += batchSize) {
      const batch = wbProducts.slice(i, i + batchSize);
      batches.push(batch);
    }

    let updatedCount = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      const result = await step.run(`update-products-batch-${i}`, async () => {
        console.log(`💾 [Workflow] Обновление батча ${i + 1}/${batches.length}...`);
        
        const updates = await Promise.all(
          batch.map(async (wbProduct: any) => {
            const stock = wbStocks[wbProduct.nmId as keyof typeof wbStocks];
            
            // Ищем товар в БД
            const product = await prisma.product.findFirst({
              where: {
                userId,
                name: wbProduct.name,
              },
            });

            if (product) {
              // Обновляем остаток и статус синхронизации
              return await prisma.product.update({
                where: { id: product.id },
                data: {
                  stock: stock?.quantity || 0,
                  wbSyncStatus: 'SYNCED',
                  lastWbSyncAt: new Date(),
                },
              });
            }
            
            return null;
          })
        );

        return updates.filter(Boolean).length;
      });

      updatedCount += result;
    }

    // Шаг 5: Обновляем статус синхронизации кабинета
    await step.run('update-cabinet-sync-status', async () => {
      console.log('✅ [Workflow] Обновление статуса синхронизации...');
      
      // Обновляем кабинет (если есть поле для синхронизации)
      // Если поля lastSyncAt нет в схеме, можно убрать этот шаг
      return await prisma.cabinet.update({
        where: { id: cabinetId },
        data: {
          updatedAt: new Date(),
        },
      });
    });

    console.log(`✅ [Workflow] Синхронизация завершена. Обновлено товаров: ${updatedCount}`);

    return {
      success: true,
      totalProducts: wbProducts.length,
      updatedProducts: updatedCount,
    };
  }
);
