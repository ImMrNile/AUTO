# 📊 Получение ВСЕХ исторических данных товара

## 🎯 Новый API endpoint для полного анализа

Создан новый endpoint который получает данные за **все доступные периоды**:

```
GET /api/products/{id}/historical-data
```

---

## 📅 Какие периоды получаем

API автоматически получает данные за:

1. **Последние 7 дней** - текущая неделя
2. **Последние 30 дней** - текущий месяц
3. **Последние 60 дней** - 2 месяца
4. **Последние 90 дней** - 3 месяца (квартал)
5. **Последние 180 дней** - полгода
6. **Последние 365 дней** - год (максимум WB API)

---

## 🚀 Как использовать

### 1. Через браузер:
```
http://localhost:3000/api/products/cmh0gghd5002bunv4jxmcdfue/historical-data
```

### 2. Через fetch в коде:
```typescript
const response = await fetch(
  `/api/products/${productId}/historical-data`
);
const data = await response.json();

// Данные за год
console.log(data.periods.last365Days);

// Данные за месяц
console.log(data.periods.last30Days);
```

---

## 📊 Структура ответа

```json
{
  "success": true,
  "productId": "cmh0gghd5002bunv4jxmcdfue",
  "nmId": "493805274",
  "periods": {
    "last7Days": {
      "period": 7,
      "startDate": "2025-10-29",
      "endDate": "2025-11-05",
      "data": {
        "products": [{
          "product": {...},
          "statistic": {
            "selected": {
              "openCount": 100,
              "cartCount": 10,
              "orderCount": 5,
              "buyoutCount": 3,
              "conversions": {...}
            },
            "past": {...},
            "comparison": {...}
          }
        }]
      }
    },
    "last30Days": {...},
    "last60Days": {...},
    "last90Days": {...},
    "last180Days": {...},
    "last365Days": {
      "period": 365,
      "startDate": "2024-11-05",
      "endDate": "2025-11-05",
      "data": {
        "products": [{
          "statistic": {
            "selected": {
              "openCount": 5000,    // Всего просмотров за год
              "cartCount": 500,     // Всего в корзину
              "orderCount": 100,    // Всего заказов
              "buyoutCount": 80,    // Всего выкупов
              "orderSum": 300000,   // Сумма заказов
              "buyoutSum": 240000,  // Сумма выкупов
              "conversions": {
                "addToCartPercent": 10,
                "cartToOrderPercent": 20,
                "buyoutPercent": 80
              }
            }
          }
        }]
      }
    }
  },
  "errors": {
    "last7Days": null,
    "last30Days": null,
    "last60Days": null,
    "last90Days": null,
    "last180Days": null,
    "last365Days": null
  }
}
```

---

## 📈 Что можно анализировать

### 1. Динамика продаж по периодам
```typescript
const last7 = data.periods.last7Days.data.products[0].statistic.selected;
const last30 = data.periods.last30Days.data.products[0].statistic.selected;
const last365 = data.periods.last365Days.data.products[0].statistic.selected;

console.log('Заказов за неделю:', last7.orderCount);
console.log('Заказов за месяц:', last30.orderCount);
console.log('Заказов за год:', last365.orderCount);
```

### 2. Тренды конверсии
```typescript
const conversions = {
  week: data.periods.last7Days.data.products[0].statistic.selected.conversions,
  month: data.periods.last30Days.data.products[0].statistic.selected.conversions,
  year: data.periods.last365Days.data.products[0].statistic.selected.conversions
};

console.log('Конверсия в корзину:');
console.log('Неделя:', conversions.week.addToCartPercent + '%');
console.log('Месяц:', conversions.month.addToCartPercent + '%');
console.log('Год:', conversions.year.addToCartPercent + '%');
```

### 3. Сезонность
```typescript
// Сравнение разных периодов
const q1 = data.periods.last90Days;  // Последний квартал
const halfYear = data.periods.last180Days;  // Полгода
const year = data.periods.last365Days;  // Год

// Можно увидеть сезонные колебания
```

### 4. Общая статистика за год
```typescript
const yearData = data.periods.last365Days.data.products[0].statistic.selected;

const totalStats = {
  просмотров: yearData.openCount,
  вКорзину: yearData.cartCount,
  заказов: yearData.orderCount,
  выкупов: yearData.buyoutCount,
  суммаЗаказов: yearData.orderSum,
  суммаВыкупов: yearData.buyoutSum,
  среднийЧек: yearData.avgPrice,
  конверсияВКорзину: yearData.conversions.addToCartPercent,
  конверсияВЗаказ: yearData.conversions.cartToOrderPercent,
  процентВыкупа: yearData.conversions.buyoutPercent
};

console.log('Статистика за год:', totalStats);
```

---

## 🔍 Пример анализа вашего товара

Для товара **493805274** (Молочное платье):

### Текущая ситуация (30 дней):
```
Просмотров: 810
В корзину: 26 (3%)
Заказов: 4 (15% из корзины)
Выкупов: 1 (33%)
Сумма: 15,636₽
```

### Прошлый период (30 дней назад):
```
Просмотров: 4,713
В корзину: 228 (5%)
Заказов: 42 (18% из корзины)
Выкупов: 26 (65%)
Сумма: 148,334₽
```

### С историческими данными вы увидите:
- 📊 Когда начались продажи
- 📈 Пиковые периоды продаж
- 📉 Когда начался спад
- 🎯 Лучшие показатели конверсии
- 💰 Общий доход за год
- 📅 Сезонность спроса

---

## 💡 Как использовать для AI анализа

### 1. Получите все данные:
```typescript
const historicalData = await fetch(
  `/api/products/${productId}/historical-data`
).then(r => r.json());
```

### 2. Отправьте AI для анализа:
```typescript
const aiAnalysis = await fetch('/api/ai/analyze-product', {
  method: 'POST',
  body: JSON.stringify({
    productId: productId,
    historicalData: historicalData,
    question: 'Проанализируй динамику продаж и дай рекомендации'
  })
});
```

### 3. AI сможет:
- ✅ Увидеть полную картину продаж
- ✅ Найти причины спада
- ✅ Определить лучшие периоды
- ✅ Дать точные рекомендации
- ✅ Спрогнозировать будущее

---

## 🧪 Тестирование

### 1. Перезапустите сервер:
```bash
npm run dev
```

### 2. Откройте в браузере:
```
http://localhost:3000/api/products/cmh0gghd5002bunv4jxmcdfue/historical-data
```

### 3. Вы увидите JSON со всеми данными за все периоды

---

## 📋 Что делать с данными

### Вариант 1: Сохранить в БД
```typescript
// Сохраняем исторические данные для быстрого доступа
await prisma.productAnalytics.create({
  data: {
    productId: productId,
    period: '365days',
    data: historicalData,
    createdAt: new Date()
  }
});
```

### Вариант 2: Показать в UI
```typescript
// Создать графики динамики
<LineChart data={[
  { period: '7d', orders: last7Days.orderCount },
  { period: '30d', orders: last30Days.orderCount },
  { period: '90d', orders: last90Days.orderCount },
  { period: '365d', orders: last365Days.orderCount }
]} />
```

### Вариант 3: Экспорт в Excel
```typescript
// Экспортировать для анализа в Excel
const exportData = periods.map(p => ({
  Период: p.period + ' дней',
  Просмотры: p.data.openCount,
  Заказы: p.data.orderCount,
  Выкупы: p.data.buyoutCount,
  Сумма: p.data.orderSum
}));
```

---

## ⚠️ Важные моменты

### 1. Лимиты WB API
```
Максимальный период: 365 дней
Данные обновляются: раз в сутки
Задержка данных: 1-2 дня
```

### 2. Производительность
```
Запрос всех периодов: ~10-15 секунд
Рекомендуем: кэшировать результаты
Обновлять: раз в сутки
```

### 3. Кэширование
```typescript
// Сохраняем результат на 24 часа
const cacheKey = `historical_${productId}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const data = await fetchHistoricalData();
await redis.set(cacheKey, JSON.stringify(data), 'EX', 86400);
```

---

## 🚀 Готово!

Теперь у вас есть:
- ✅ API для получения всех исторических данных
- ✅ Данные за 6 разных периодов (7, 30, 60, 90, 180, 365 дней)
- ✅ Полная статистика для AI анализа
- ✅ Возможность видеть тренды и динамику

**Используйте эти данные для глубокого анализа и принятия решений!** 📊
