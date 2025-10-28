# API Полной Аналитики Товара

## Описание

Новый API endpoint для получения полной аналитики товара с реальными данными из Wildberries API.

## Endpoint

```
GET /api/products/[id]/analytics
```

## Параметры

- `id` (path parameter) - ID товара в системе или nmId товара на Wildberries

## Авторизация

Требуется авторизация пользователя. API автоматически использует WB токен из кабинета, к которому привязан товар.

## Ответ

### Успешный ответ (200 OK)

```typescript
{
  success: true,
  data: {
    // Базовая информация о товаре
    product: {
      id: string;
      nmId: number | null;
      name: string;
      vendorCode: string;
      category: string;
      subcategory: string;
      status: string;
    };
    
    // Финансовая аналитика
    financial: {
      currentPrice: number;           // Текущая цена со скидкой
      originalPrice: number;           // Оригинальная цена
      costPrice: number | null;        // Себестоимость
      discount: number;                // Процент скидки
      
      // Детальный расчет прибыли с учетом всех комиссий
      profitCalculation: {
        revenue: number;               // Выручка
        wbCommission: number;          // Комиссия WB
        logistics: number;             // Логистика
        storage: number;               // Хранение
        tax: number;                   // Налог
        advertising: number;           // Реклама
        netProfit: number;             // Чистая прибыль
        profitMargin: number;          // Маржинальность (%)
      };
      
      // Комиссии WB по типам доставки
      commissions: {
        fbw: number;  // FBW (%)
        fbs: number;  // FBS (%)
        dbs: number;  // DBS (%)
        cc: number;   // CC (%)
        edbs: number; // eDBS (%)
      };
    };
    
    // Остатки и склад
    inventory: {
      total: number;        // Всего остатков
      available: number;    // Доступно для продажи
      inWarehouse: number;  // На складах
      inTransit: number;    // В пути к клиенту
      reserved: number;     // Зарезервировано
    };
    
    // Статистика продаж (реальные данные из WB Statistics API)
    sales: {
      total: number;           // Всего продаж
      last7Days: number;       // За последние 7 дней
      last30Days: number;      // За последние 30 дней
      averagePerDay: number;   // Среднее в день
      trend: 'up' | 'down' | 'stable';  // Тренд продаж
      
      // График продаж за последние 30 дней
      chart: Array<{
        date: string;    // Дата (YYYY-MM-DD)
        sales: number;   // Количество продаж
        revenue: number; // Выручка за день
      }>;
    };
    
    // Статистика заказов (реальные данные из WB Statistics API)
    orders: {
      total: number;          // Всего заказов
      last7Days: number;      // За последние 7 дней
      last30Days: number;     // За последние 30 дней
      conversionRate: number; // Конверсия заказов в продажи (%)
    };
    
    // Рейтинг и отзывы
    reviews: {
      averageRating: number;  // Средний рейтинг
      totalCount: number;     // Количество отзывов
      distribution: {         // Распределение по звездам
        5: number;
        4: number;
        3: number;
        2: number;
        1: number;
      };
    };
    
    // SEO и продвижение (данные из WB Analytics API)
    promotion: {
      // Поисковые запросы, по которым находят товар
      searchQueries: Array<{
        query: string;      // Поисковый запрос
        position: number;   // Позиция в выдаче
        frequency: number;  // Частота запроса
        cluster: string;    // Кластер запроса
      }>;
      
      // Ключевые слова категории
      categoryKeywords: Array<{
        keyword: string;      // Ключевое слово
        frequency: number;    // Частота использования
        competition: number;  // Конкуренция (0-100)
      }>;
      
      // Видимость товара
      visibility: {
        inSearch: boolean;        // Виден в поиске
        inCategory: boolean;      // Виден в категории
        averagePosition: number;  // Средняя позиция
      };
    };
    
    // Конверсия воронки продаж
    conversion: {
      viewToCart: number;     // Просмотры → Корзина (%)
      cartToOrder: number;    // Корзина → Заказ (%)
      orderToSale: number;    // Заказ → Продажа (%)
      overall: number;        // Общая конверсия (%)
    };
    
    // Метаданные
    metadata: {
      lastUpdated: string;    // Время последнего обновления
      dataSource: string;     // Источник данных
      hasRealData: boolean;   // Есть ли реальные данные из WB API
    };
  }
}
```

### Ошибки

#### 401 Unauthorized
```json
{
  "error": "Не авторизован"
}
```

#### 404 Not Found
```json
{
  "error": "Товар не найден"
}
```

#### 400 Bad Request
```json
{
  "error": "WB API токен не найден для кабинета товара"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Ошибка получения аналитики",
  "details": "Описание ошибки"
}
```

## Источники данных

API агрегирует данные из нескольких источников WB API:

1. **WB Discounts & Prices API** - актуальные цены и скидки
2. **WB Statistics API** - продажи, заказы, остатки
3. **WB Analytics API** - поисковые запросы и ключевые слова
4. **Локальная БД** - информация о товаре, категории, комиссии

## Примеры использования

### JavaScript/TypeScript

```typescript
// Получение полной аналитики товара
const response = await fetch('/api/products/123456/analytics');
const { success, data } = await response.json();

if (success) {
  console.log('Продаж за 30 дней:', data.sales.last30Days);
  console.log('Чистая прибыль:', data.financial.profitCalculation.netProfit);
  console.log('Остатков:', data.inventory.total);
  console.log('Топ запросов:', data.promotion.searchQueries.slice(0, 5));
}
```

### React Hook

```typescript
import { useEffect, useState } from 'react';

function useProductAnalytics(productId: string) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        const response = await fetch(`/api/products/${productId}/analytics`);
        const { success, data } = await response.json();
        
        if (success) {
          setAnalytics(data);
        } else {
          setError('Ошибка загрузки аналитики');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [productId]);

  return { analytics, loading, error };
}

// Использование
function ProductAnalyticsPage({ productId }) {
  const { analytics, loading, error } = useProductAnalytics(productId);

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error}</div>;

  return (
    <div>
      <h1>{analytics.product.name}</h1>
      <div>Продаж за 30 дней: {analytics.sales.last30Days}</div>
      <div>Прибыль: {analytics.financial.profitCalculation.netProfit}₽</div>
      <div>Остатков: {analytics.inventory.total} шт.</div>
    </div>
  );
}
```

## Производительность

- Время ответа: 2-5 секунд (зависит от скорости WB API)
- Кэширование: не реализовано (всегда актуальные данные)
- Ограничения: зависят от лимитов WB API

## Сервисы

API использует следующие сервисы:

1. **WbStatisticsService** - работа с WB Statistics API
   - Продажи, заказы, остатки
   - Агрегация статистики по товару

2. **WbAnalyticsService** - работа с WB Analytics API
   - Поисковые запросы
   - Ключевые слова категории

3. **WbFinancialCalculator** - расчет финансовых показателей
   - Комиссии WB
   - Логистика и хранение
   - Чистая прибыль

4. **UserWbTokenService** - управление WB токенами
   - Получение токена из кабинета
   - Валидация токена

## Требования

- Активный кабинет с WB API токеном
- Права доступа токена:
  - Content API (чтение)
  - Statistics API (чтение)
  - Analytics API (чтение) - опционально
  - Prices API (чтение)

## Примечания

- Если товар не имеет `wbNmId`, некоторые данные могут быть недоступны
- Данные о продвижении доступны только при наличии прав Analytics API
- Конверсия рассчитывается на основе средних показателей WB, если нет точных данных
- График продаж показывает последние 30 дней
