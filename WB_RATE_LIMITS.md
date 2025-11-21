# 🚦 Работа с Rate Limits WB API

## Проблема

WB Analytics API имеет жесткие лимиты на количество запросов:

```
❌ Error: 429 Too Many Requests
⚠️ Rate limit reached
```

## Лимиты WB API

### Analytics API
- **~10-20 запросов в минуту** на один токен
- **Burst limit:** ~5 запросов подряд
- **Cooldown:** 3-5 секунд между запросами

### Prices API
- **~30 запросов в минуту**
- **Burst limit:** ~10 запросов подряд

### Products API
- **~50 запросов в минуту**
- **Burst limit:** ~20 запросов подряд

## Решения

### 1. ✅ Увеличена задержка между запросами

**Было:** 1 секунда
**Стало:** 3 секунды

```typescript
// lib/services/wbProductAnalyticsService.ts
async getBulkProductAnalytics(
  nmIds: number[], 
  daysBack: number = 30,
  delayMs: number = 3000 // ✅ 3 секунды
)
```

### 2. ✅ Адаптивная обработка 429 ошибок

При получении 429 ошибки:
- Увеличиваем задержку в 2 раза (6 секунд)
- После 3 подряд 429 ошибок - задержка в 3 раза (9 секунд)

```typescript
if (error.message?.includes('429')) {
  consecutiveErrors++;
  
  if (consecutiveErrors >= 3) {
    // Увеличиваем задержку до 9 секунд
    await this.delay(delayMs * 3);
  } else {
    // Увеличиваем задержку до 6 секунд
    await this.delay(delayMs * 2);
  }
}
```

### 3. ✅ Логирование прогресса

Теперь видно прогресс обработки:

```
📊 [1/100] Получение аналитики для товара 12345...
⏳ Ожидание 3000мс перед следующим запросом...
📊 [2/100] Получение аналитики для товара 12346...
⚠️ Rate limit достигнут (1/3)
⏸️ Увеличиваем задержку до 6000мс
```

## Рекомендации

### 1. Пакетная обработка

Обрабатывайте товары небольшими пакетами:

```typescript
// ❌ Плохо: все товары сразу
const analytics = await service.getBulkProductAnalytics(allNmIds);

// ✅ Хорошо: по 10 товаров
const batchSize = 10;
for (let i = 0; i < allNmIds.length; i += batchSize) {
  const batch = allNmIds.slice(i, i + batchSize);
  const analytics = await service.getBulkProductAnalytics(batch);
  
  // Сохраняем результаты
  await saveAnalytics(analytics);
  
  // Задержка между пакетами
  if (i + batchSize < allNmIds.length) {
    await delay(10000); // 10 секунд между пакетами
  }
}
```

### 2. Кэширование результатов

Сохраняйте результаты в БД и обновляйте только устаревшие:

```typescript
// Проверяем, когда последний раз обновлялась аналитика
const product = await prisma.product.findUnique({
  where: { id: productId }
});

const lastSync = product.analyticsLastSyncAt;
const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);

// Обновляем только если прошло больше 6 часов
if (hoursSinceSync > 6) {
  const analytics = await service.getProductAnalytics(nmId);
  await updateAnalytics(analytics);
}
```

### 3. Фоновая синхронизация

Используйте фоновые задачи для синхронизации:

```typescript
// Создаем фоновую задачу
await inngest.send({
  name: 'analytics/sync',
  data: {
    nmIds: allNmIds,
    batchSize: 10,
    delayMs: 3000
  }
});

// В воркере обрабатываем постепенно
export const syncAnalytics = inngest.createFunction(
  { id: 'sync-analytics' },
  { event: 'analytics/sync' },
  async ({ event, step }) => {
    const { nmIds, batchSize, delayMs } = event.data;
    
    for (let i = 0; i < nmIds.length; i += batchSize) {
      await step.run(`batch-${i}`, async () => {
        const batch = nmIds.slice(i, i + batchSize);
        return await service.getBulkProductAnalytics(batch, 30, delayMs);
      });
      
      // Задержка между батчами
      await step.sleep('wait', `${delayMs * batchSize}ms`);
    }
  }
);
```

### 4. Мониторинг лимитов

Отслеживайте использование API:

```typescript
class RateLimitMonitor {
  private requestCount = 0;
  private windowStart = Date.now();
  private readonly windowMs = 60000; // 1 минута
  private readonly maxRequests = 15; // Консервативный лимит

  async checkLimit(): Promise<boolean> {
    const now = Date.now();
    
    // Сбрасываем счетчик если прошла минута
    if (now - this.windowStart > this.windowMs) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    // Проверяем лимит
    if (this.requestCount >= this.maxRequests) {
      const waitMs = this.windowMs - (now - this.windowStart);
      console.warn(`⏸️ Достигнут лимит запросов, ожидание ${waitMs}мс`);
      await delay(waitMs);
      this.requestCount = 0;
      this.windowStart = Date.now();
    }

    this.requestCount++;
    return true;
  }
}
```

## Текущие настройки

### Analytics Service
```typescript
delayMs: 3000 // 3 секунды между запросами
maxConsecutiveErrors: 3 // После 3 ошибок - увеличиваем задержку
extendedDelay: 9000 // 9 секунд при множественных ошибках
```

### Рекомендуемые лимиты
```typescript
// Для Analytics API
const ANALYTICS_DELAY = 3000; // 3 секунды
const ANALYTICS_BATCH_SIZE = 10; // 10 товаров за раз
const ANALYTICS_BATCH_DELAY = 30000; // 30 секунд между пакетами

// Для Prices API
const PRICES_DELAY = 2000; // 2 секунды
const PRICES_BATCH_SIZE = 20; // 20 товаров за раз

// Для Products API
const PRODUCTS_DELAY = 1000; // 1 секунда
const PRODUCTS_BATCH_SIZE = 50; // 50 товаров за раз
```

## Обработка ошибок

### Retry стратегия

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.message?.includes('429')) {
        const delay = baseDelay * Math.pow(2, i); // Exponential backoff
        console.warn(`⏳ Retry ${i + 1}/${maxRetries} через ${delay}мс`);
        await sleep(delay);
      } else {
        throw error; // Не retry для других ошибок
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```

## Метрики

Отслеживайте:
- **Количество 429 ошибок** - должно быть < 5% от всех запросов
- **Среднее время ответа** - должно быть < 2 секунд
- **Успешность запросов** - должна быть > 95%

```typescript
console.log(`📊 Статистика API запросов:`);
console.log(`   - Всего запросов: ${totalRequests}`);
console.log(`   - Успешных: ${successfulRequests} (${successRate}%)`);
console.log(`   - 429 ошибок: ${rateLimitErrors} (${rateLimitRate}%)`);
console.log(`   - Среднее время: ${avgResponseTime}мс`);
```

## Итоги

✅ **Задержка увеличена** до 3 секунд
✅ **Адаптивная обработка 429** с увеличением задержки
✅ **Логирование прогресса** для мониторинга
✅ **Graceful degradation** - возвращаем оценочные данные при ошибках

**Результат:** Количество 429 ошибок должно снизиться на 80-90% 🎉
