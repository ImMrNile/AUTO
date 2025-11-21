# WB API: Установка цен и скидок - Быстрая справка

## ✅ Правильный способ

### Endpoint
```
POST https://discounts-prices-api.wildberries.ru/api/v2/upload/task
```

### Request
```json
{
  "data": [{
    "nmID": 308590302,
    "price": 7999,    // Оригинальная цена (без скидки)
    "discount": 50    // Процент скидки (0-99)
  }]
}
```

### Headers
```
Authorization: eyJhbGc...
Content-Type: application/json
```

### Response
```json
{
  "data": {
    "id": 12345,
    "alreadyExists": false
  },
  "error": false,
  "errorText": ""
}
```

## 📊 Проверка статуса

После установки цены проверьте статус через:
```
GET https://discounts-prices-api.wildberries.ru/api/v2/history/tasks
```

**Статусы:**
- `3` - ✅ Обработано, цены обновлены
- `4` - ❌ Отменено
- `5` - ⚠️ Обработано с ошибками в некоторых товарах
- `6` - ❌ Все товары с ошибками

## 💡 Важные моменты

1. **price** = оригинальная цена (БЕЗ скидки)
2. **discount** = процент скидки (0-99)
3. Финальная цена = `price * (1 - discount/100)`
4. Можно отправить до **1000 товаров** за раз
5. Если новая цена в 3+ раза меньше предыдущей → карантин цен

## ❌ Частые ошибки

### Ошибка 401 (unauthorized)
- **Причина:** Использовался тестовый API `devapi-digital.wildberries.ru`
- **Решение:** Использовать production API `discounts-prices-api.wildberries.ru`

### Ошибка 404 (path not found)
- **Причина:** Неправильный endpoint (например `/api/v3/offers/{id}`)
- **Решение:** Использовать `/api/v2/upload/task`

### Ошибка 400 (bad request)
- **Причина:** Неправильный формат body
- **Решение:** Использовать `{ data: [{ nmID, price, discount }] }`

## 📚 Документация

- **Официальная документация:** https://dev.wildberries.ru/en/openapi/work-with-products
- **Раздел:** Product Management → Prices and Discounts
- **Метод:** Set Prices and Discounts

## 🔧 TypeScript пример

```typescript
async function setPrice(nmId: number, originalPrice: number, discountPrice: number) {
  const discountPercent = Math.round(((originalPrice - discountPrice) / originalPrice) * 100);
  
  const response = await fetch('https://discounts-prices-api.wildberries.ru/api/v2/upload/task', {
    method: 'POST',
    headers: {
      'Authorization': apiToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data: [{
        nmID: nmId,
        price: originalPrice,
        discount: discountPercent
      }]
    })
  });
  
  const result = await response.json();
  
  if (result.error) {
    throw new Error(result.errorText);
  }
  
  // Проверить статус через /api/v2/history/tasks
  return result.data.id;
}
```

## 🎯 Примеры

### Пример 1: Установка скидки 50%
```json
{
  "data": [{
    "nmID": 308590302,
    "price": 7999,
    "discount": 50
  }]
}
```
Результат: Финальная цена = 7999 * (1 - 50/100) = **3999.50₽**

### Пример 2: Без скидки
```json
{
  "data": [{
    "nmID": 308590302,
    "price": 7999,
    "discount": 0
  }]
}
```
Результат: Финальная цена = **7999₽**

### Пример 3: Несколько товаров
```json
{
  "data": [
    { "nmID": 308590302, "price": 7999, "discount": 50 },
    { "nmID": 442463690, "price": 5000, "discount": 30 },
    { "nmID": 308574411, "price": 3000, "discount": 20 }
  ]
}
```

## ⚠️ Карантин цен

Если новая цена **в 3+ раза меньше** предыдущей:
- Цена попадет в карантин
- Не обновится автоматически
- Нужно подтвердить в личном кабинете: https://seller.wildberries.ru/discount-and-prices/quarantine
- Или изменить цену через API повторно
