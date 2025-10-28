# Корректные финансовые расчеты для Wildberries

## Обзор

Этот документ описывает правильные формулы расчета финансовых показателей на основе реальных данных из WB API.

## Ключевые поля из WB Statistics API

### Цены из API продаж (`/api/v1/supplier/sales`)

```typescript
interface WbSale {
  // Цены
  totalPrice: number;        // Начальная цена товара (до всех скидок)
  discountPercent: number;   // Скидка продавца (%)
  spp: number;               // Скидка WB (Согласованная скидка покупателя, %)
  finishedPrice: number;     // Цена со скидкой ПРОДАВЦА (база для расчета комиссии WB)
  priceWithDisc: number;     // Цена с учетом скидки WB (то что заплатил покупатель)
  forPay: number;            // К переводу продавцу (после вычета всех расходов WB)
  
  // Дополнительные поля
  promoCodeDiscount: number; // Скидка по промокоду
}
```

### Важные различия

1. **`finishedPrice`** - Цена со скидкой продавца
   - Это база для расчета комиссии WB
   - От этой цены считаются все проценты комиссий

2. **`priceWithDisc`** - Цена для покупателя
   - Это то, что реально заплатил покупатель
   - Включает скидку WB (SPP)
   - Это ВЫРУЧКА продавца

3. **`forPay`** - К переводу продавцу
   - Это то, что получит продавец от WB
   - Уже вычтены: комиссия, логистика, хранение, приемка

## Формулы расчета

### 1. Выручка (Revenue)

```typescript
// ПРАВИЛЬНО: Используем priceWithDisc
const totalRevenue = sales.reduce((sum, sale) => 
  sum + (sale.priceWithDisc || sale.finishedPrice || 0), 0
);
```

**Почему `priceWithDisc`?**
- Это реальная сумма, которую заплатил покупатель
- Это выручка бизнеса

### 2. Скидка WB (SPP)

```typescript
// Скидка WB = Цена покупателя - База комиссии
const wbDiscount = sale.priceWithDisc - sale.finishedPrice;
```

**Важно:** Скидку WB оплачивает Wildberries, а НЕ продавец!

### 3. Комиссия WB

```typescript
// Комиссия рассчитывается от finishedPrice
const commission = sale.finishedPrice * (commissionRate / 100);
```

**Ставки комиссии** зависят от категории и типа доставки:
- FBW (Fulfillment by Wildberries): 5-20%
- FBS (Fulfillment by Seller): 5-15%
- DBS (Delivery by Seller): 3-10%

### 4. Расходы WB (Логистика + Хранение + Приемка)

```typescript
// РЕАЛЬНЫЕ расходы WB из API
const wbExpenses = sale.finishedPrice - sale.forPay - commission;

// Примерное распределение:
const logistics = wbExpenses * 0.80;  // ~80% - логистика
const storage = wbExpenses * 0.15;    // ~15% - хранение
const acceptance = wbExpenses * 0.05; // ~5% - приемка
```

**Альтернативный расчет** (если нет `forPay`):
```typescript
// Логистика: ~14-15% от finishedPrice
const logistics = sale.finishedPrice * 0.1467;

// Хранение (для FBW): ~1.79% от finishedPrice за месяц
const storage = sale.finishedPrice * 0.0179 * (storageDays / 30);

// Приемка (для FBW): ~0.22% от finishedPrice
const acceptance = sale.finishedPrice * 0.0022;
```

### 5. Чистая прибыль

```typescript
// ПРАВИЛЬНЫЙ расчет
const totalProfit = totalForPay - totalCost;

// Где:
// totalForPay = sum(sale.forPay) - сумма к переводу от WB
// totalCost = себестоимость товаров (из БД)
```

**Формула в развернутом виде:**
```
Чистая прибыль = К переводу - Себестоимость
```

**НЕ правильно:**
```typescript
// ❌ НЕПРАВИЛЬНО
const profit = revenue - wbExpenses - cost;
```

### 6. Маржинальность (Profit Margin)

```typescript
// Маржа рассчитывается относительно ВЫРУЧКИ (priceWithDisc)
const profitMargin = (totalProfit / totalRevenue) * 100;
```

## Полный пример расчета

```typescript
// Данные продажи из WB API
const sale = {
  priceWithDisc: 1547,    // Что заплатил покупатель
  finishedPrice: 1145,    // База для комиссии
  forPay: 1284.01,        // К переводу продавцу
  spp: 26                 // Скидка WB 26%
};

// 1. Выручка
const revenue = sale.priceWithDisc; // 1547₽

// 2. Скидка WB (оплачивает WB, не продавец)
const wbDiscount = sale.priceWithDisc - sale.finishedPrice; // 402₽

// 3. Комиссия WB (15% от finishedPrice)
const commission = sale.finishedPrice * 0.15; // 171.75₽

// 4. Расходы WB (логистика + хранение + приемка)
const wbExpenses = sale.finishedPrice - sale.forPay - commission;
// 1145 - 1284.01 - 171.75 = -310.76₽
// Отрицательное значение означает, что forPay уже включает вычет комиссии

// Правильный расчет:
const wbExpenses = sale.finishedPrice - sale.forPay; // 1145 - 1284.01 = -139.01₽
// Это означает что forPay > finishedPrice, что возможно при возвратах или корректировках

// 5. К переводу продавцу
const toTransfer = sale.forPay; // 1284.01₽

// 6. Себестоимость (из БД)
const costPrice = 500; // Пример

// 7. Чистая прибыль
const profit = toTransfer - costPrice; // 1284.01 - 500 = 784.01₽

// 8. Маржа
const margin = (profit / revenue) * 100; // (784.01 / 1547) * 100 = 50.7%
```

## Структура расходов

### Расходы Wildberries (вычитаются из finishedPrice)

1. **Комиссия WB** - 5-20% (зависит от категории)
2. **Логистика** - ~14-15% (доставка до клиента)
3. **Хранение** - ~1.79% в месяц (для FBW)
4. **Приемка** - ~0.22% (для FBW)

**Итого расходы WB:** ~20-35% от finishedPrice

### Расходы продавца (вычитаются из forPay)

1. **Себестоимость товара** - указывается в БД
2. **Налоги** - 6% (УСН) от forPay (платятся отдельно)
3. **Реклама** - по факту (из рекламного кабинета WB)
4. **Прочие расходы** - упаковка, брак, возвраты и т.д.

## Важные замечания

### ❌ Частые ошибки

1. **Использование finishedPrice как выручки**
   ```typescript
   // ❌ НЕПРАВИЛЬНО
   const revenue = sale.finishedPrice;
   ```
   
2. **Вычитание скидки WB из прибыли**
   ```typescript
   // ❌ НЕПРАВИЛЬНО
   const profit = revenue - wbDiscount - wbExpenses - cost;
   ```
   Скидку WB оплачивает Wildberries!

3. **Включение налогов в расчет прибыли**
   ```typescript
   // ❌ НЕПРАВИЛЬНО
   const profit = forPay - cost - taxes;
   ```
   Налоги платятся отдельно, не из forPay

### ✅ Правильный подход

```typescript
// Выручка - что заплатил покупатель
const revenue = sale.priceWithDisc;

// К переводу - что получит продавец от WB
const toTransfer = sale.forPay;

// Чистая прибыль - к переводу минус себестоимость
const profit = toTransfer - costPrice;

// Маржа - прибыль относительно выручки
const margin = (profit / revenue) * 100;
```

## Проверка расчетов

### Баланс должен сойтись:

```typescript
// Проверка 1: Цены
priceWithDisc >= finishedPrice // Скидка WB не может быть отрицательной

// Проверка 2: Расходы WB
const calculatedForPay = finishedPrice - commission - logistics - storage - acceptance;
// Должно быть близко к sale.forPay

// Проверка 3: Прибыль
const totalIncome = sum(sales.map(s => s.forPay));
const totalExpenses = sum(sales.map(s => getCostPrice(s)));
const profit = totalIncome - totalExpenses;
// Прибыль должна быть положительной для успешного бизнеса
```

## API Endpoints

### Получение данных для расчетов

1. **Продажи** - `/api/v1/supplier/sales`
   - Содержит: priceWithDisc, finishedPrice, forPay
   - Используется для: расчета выручки и прибыли

2. **Заказы** - `/api/v1/supplier/orders`
   - Содержит: информацию о заказах
   - Используется для: анализа конверсии

3. **Остатки** - `/api/v1/supplier/stocks`
   - Содержит: количество товаров на складах
   - Используется для: управления запасами

4. **Цены** - `/api/v2/list/goods/filter`
   - Содержит: актуальные цены и скидки
   - Используется для: прогнозирования

## Заключение

Ключевые принципы корректных расчетов:

1. **Выручка** = `priceWithDisc` (что заплатил покупатель)
2. **К переводу** = `forPay` (что получит продавец от WB)
3. **Прибыль** = `forPay - себестоимость`
4. **Маржа** = `(прибыль / выручка) * 100%`
5. **Скидка WB** оплачивается Wildberries, не продавцом
6. **Налоги** платятся отдельно, не из forPay

Эти формулы обеспечивают точные и реалистичные финансовые показатели для продавцов на Wildberries.
