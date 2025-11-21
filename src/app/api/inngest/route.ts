import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { createProductWorkflow } from '@/lib/inngest/functions/createProduct';
import { syncStocksWorkflow } from '@/lib/inngest/functions/syncStocks';
import { syncAnalytics } from '@/lib/inngest/functions/syncAnalytics';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Inngest API endpoint
 * 
 * Этот endpoint обрабатывает все durable функции (workflows)
 * Inngest автоматически управляет:
 * - Сохранением состояния между шагами
 * - Автоматическими retry при ошибках
 * - Логированием и мониторингом
 * 
 * Доступ к UI: https://app.inngest.com
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    createProductWorkflow,
    syncStocksWorkflow,
    syncAnalytics, // Фоновая синхронизация аналитики
  ],
});
