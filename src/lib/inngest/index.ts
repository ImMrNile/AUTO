/**
 * Inngest Workflows - Durable Functions для WB Automation
 * 
 * Этот модуль экспортирует клиент и хелперы для запуска workflows
 */

export { inngest } from './client';
export { createProductWorkflow } from './functions/createProduct';
export { syncStocksWorkflow } from './functions/syncStocks';

/**
 * Хелперы для запуска workflows
 */

/**
 * Запустить создание товара
 * 
 * @example
 * ```ts
 * import { triggerCreateProduct } from '@/lib/inngest';
 * 
 * const result = await triggerCreateProduct({
 *   productName: 'Новый товар',
 *   images: ['https://...'],
 *   category: 'Одежда',
 *   cabinetId: 'cabinet-123',
 *   userId: 'user-123',
 * });
 * 
 * console.log('Workflow ID:', result.ids[0]);
 * ```
 */
export async function triggerCreateProduct(data: {
  productName: string;
  images: string[];
  category: string;
  cabinetId: string;
  userId: string;
  taskId?: string;
}) {
  const { inngest } = await import('./client');
  
  return await inngest.send({
    name: 'product/create',
    data,
  });
}

/**
 * Запустить синхронизацию остатков
 * 
 * @example
 * ```ts
 * import { triggerSyncStocks } from '@/lib/inngest';
 * 
 * const result = await triggerSyncStocks({
 *   cabinetId: 'cabinet-123',
 *   userId: 'user-123',
 * });
 * ```
 */
export async function triggerSyncStocks(data: {
  cabinetId: string;
  userId: string;
}) {
  const { inngest } = await import('./client');
  
  return await inngest.send({
    name: 'stocks/sync',
    data,
  });
}
