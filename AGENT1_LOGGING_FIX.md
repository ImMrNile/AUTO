# Исправление: Отсутствие логирования ответа Agent 1

## Проблема

Agent 1 **успешно отвечает** (видно в OpenAI Dashboard), но система **не логирует его ответ** в консоль.

### Симптомы

**Последний лог:**
```
📤 [1763182341127-afwls3j6e] Отправка запроса к OpenAI Responses API в 2025-11-15T05:04:27.144Z...
```

**Отсутствующие логи:**
```
❌ ✅ Получен ответ от OpenAI Responses API
❌ 🔄 Извлечен текст из message content
❌ ✅ Agent 1 вернул результат
❌ ✅ АГЕНТ 1 ЗАВЕРШЕН
```

**Но в OpenAI Dashboard видно:**
```json
{
  "характеристики": {
    "бренд": "JNTRD",
    "модель": "J-10172",
    ...
  }
}
```

## Причина

Возможные причины:
1. **Таймаут** - Agent 1 не успевает ответить за 6 минут
2. **Ошибка парсинга** - ответ приходит в неожиданном формате
3. **Promise.race** - завершается с ошибкой
4. **Недостаточно логов** - не видно где именно происходит сбой

## Решение

Добавлено **подробное логирование** на каждом этапе обработки ответа Agent 1.

### 1. Логирование таймаута

**Было:**
```typescript
console.log(`📤 [${callId}] Отправка запроса к OpenAI Responses API...`);
const response = await Promise.race([responsePromise, timeoutPromise]);
console.log(`✅ [${callId}] Получен ответ...`);
```

**Стало:**
```typescript
console.log(`📤 [${callId}] Отправка запроса к OpenAI Responses API в ${new Date().toISOString()}...`);
console.log(`⏱️ [${callId}] Таймаут Agent 1: ${QUALITY_REQUIREMENTS.AGENT1_TIMEOUT}ms (${QUALITY_REQUIREMENTS.AGENT1_TIMEOUT / 1000 / 60} минут)`);

const responsePromise = this.openai.responses.create({...});
console.log(`⏳ [${callId}] Promise создан, ожидаем ответ...`);

const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => {
    console.log(`⏰ [${callId}] ТАЙМАУТ! Agent 1 не ответил за ${QUALITY_REQUIREMENTS.AGENT1_TIMEOUT}ms`);
    reject(new Error(`Agent 1 timeout after ${QUALITY_REQUIREMENTS.AGENT1_TIMEOUT}ms`));
  }, QUALITY_REQUIREMENTS.AGENT1_TIMEOUT)
);

console.log(`🏁 [${callId}] Запускаем Promise.race...`);
const response = await Promise.race([responsePromise, timeoutPromise]);

console.log(`✅ [${callId}] Получен ответ от OpenAI Responses API в ${new Date().toISOString()}`);
console.log(`🔍 [${callId}] Тип ответа: ${typeof response}, ключи:`, Object.keys(response || {}));
```

### 2. Логирование извлечения результата

**Было:**
```typescript
let result = (response as any).output || (response as any).content;
if (!result) throw new Error('Пустой ответ от Агента 1');
```

**Стало:**
```typescript
console.log(`🔍 [${callId}] Извлекаем результат из ответа...`);
console.log(`🔍 [${callId}] response.output:`, typeof (response as any).output);
console.log(`🔍 [${callId}] response.content:`, typeof (response as any).content);

let result = (response as any).output || (response as any).content;

console.log(`🔍 [${callId}] Результат извлечен, тип: ${typeof result}, isArray: ${Array.isArray(result)}`);

if (!result) {
  console.error(`❌ [${callId}] Пустой ответ от Агента 1!`);
  console.error(`❌ [${callId}] Полный response:`, JSON.stringify(response).substring(0, 1000));
  throw new Error('Пустой ответ от Агента 1 (Prompt API)');
}
```

### 3. Логирование парсинга массива

**Было:**
```typescript
if (Array.isArray(result)) {
  const messageItem = result.find((item: any) => item.type === 'message');
  if (messageItem && messageItem.content && messageItem.content[0]) {
    const textContent = messageItem.content.find((c: any) => c.type === 'output_text' || c.text);
    if (textContent && textContent.text) {
      result = textContent.text;
      console.log('🔄 Извлечен текст из message content');
    }
  }
}
```

**Стало:**
```typescript
if (Array.isArray(result)) {
  console.log(`📋 [${callId}] Результат - массив, длина: ${result.length}`);
  console.log(`📋 [${callId}] Типы элементов:`, result.map((item: any) => item.type));
  
  const messageItem = result.find((item: any) => item.type === 'message');
  if (messageItem && messageItem.content && messageItem.content[0]) {
    console.log(`📋 [${callId}] Найден message item, content length: ${messageItem.content.length}`);
    
    const textContent = messageItem.content.find((c: any) => c.type === 'output_text' || c.text);
    if (textContent && textContent.text) {
      result = textContent.text;
      console.log('🔄 Извлечен текст из message content');
      console.log(`📝 [${callId}] Длина текста: ${result.length} символов`);
    } else {
      console.warn(`⚠️ [${callId}] Текстовый контент не найден в message.content`);
      console.log(`🔍 [${callId}] message.content:`, JSON.stringify(messageItem.content).substring(0, 500));
    }
  } else {
    console.warn(`⚠️ [${callId}] Message item не найден в массиве результатов`);
  }
} else {
  console.log(`📝 [${callId}] Результат - не массив, используем как есть`);
}
```

## Ожидаемые логи после исправления

### Успешный сценарий

```
📤 [1763182341127-afwls3j6e] Отправка запроса к OpenAI Responses API в 2025-11-15T05:04:27.144Z...
⏱️ [1763182341127-afwls3j6e] Таймаут Agent 1: 360000ms (6 минут)
⏳ [1763182341127-afwls3j6e] Promise создан, ожидаем ответ...
🏁 [1763182341127-afwls3j6e] Запускаем Promise.race...
✅ [1763182341127-afwls3j6e] Получен ответ от OpenAI Responses API в 2025-11-15T05:09:45.234Z
🔍 [1763182341127-afwls3j6e] Тип ответа: object, ключи: ['output', 'usage', 'id']
🔍 [1763182341127-afwls3j6e] Извлекаем результат из ответа...
🔍 [1763182341127-afwls3j6e] response.output: object
🔍 [1763182341127-afwls3j6e] response.content: undefined
🔍 [1763182341127-afwls3j6e] Результат извлечен, тип: object, isArray: true
📋 [1763182341127-afwls3j6e] Результат - массив, длина: 2
📋 [1763182341127-afwls3j6e] Типы элементов: ['message', 'reasoning']
📋 [1763182341127-afwls3j6e] Найден message item, content length: 1
🔄 Извлечен текст из message content
📝 [1763182341127-afwls3j6e] Длина текста: 2600 символов
✅ Agent 1 вернул результат (string, длина: 2600)
📝 Agent 1 результат (первые 500 символов): {
  "характеристики": {
    "бренд": "JNTRD",
    "модель": "J-10172",
    ...
  }
}
✅ Найден JSON в ответе Agent 1
✅ АГЕНТ 1 [1763182341127-afwls3j6e] ЗАВЕРШЕН: 318091ms, 30163 токенов, попытка 1/3
```

### Сценарий с таймаутом

```
📤 [1763182341127-afwls3j6e] Отправка запроса к OpenAI Responses API в 2025-11-15T05:04:27.144Z...
⏱️ [1763182341127-afwls3j6e] Таймаут Agent 1: 360000ms (6 минут)
⏳ [1763182341127-afwls3j6e] Promise создан, ожидаем ответ...
🏁 [1763182341127-afwls3j6e] Запускаем Promise.race...
⏰ [1763182341127-afwls3j6e] ТАЙМАУТ! Agent 1 не ответил за 360000ms
❌ АГЕНТ 1 [1763182341127-afwls3j6e] Попытка 1/3 ОШИБКА: Error: Agent 1 timeout after 360000ms
❌ [1763182341127-afwls3j6e] Error name: Error
❌ [1763182341127-afwls3j6e] Error message: Agent 1 timeout after 360000ms
⏳ Ожидание 2000ms перед повторной попыткой Agent 1...
```

### Сценарий с пустым ответом

```
✅ [1763182341127-afwls3j6e] Получен ответ от OpenAI Responses API
🔍 [1763182341127-afwls3j6e] Тип ответа: object, ключи: ['id', 'usage']
🔍 [1763182341127-afwls3j6e] Извлекаем результат из ответа...
🔍 [1763182341127-afwls3j6e] response.output: undefined
🔍 [1763182341127-afwls3j6e] response.content: undefined
🔍 [1763182341127-afwls3j6e] Результат извлечен, тип: undefined, isArray: false
❌ [1763182341127-afwls3j6e] Пустой ответ от Агента 1!
❌ [1763182341127-afwls3j6e] Полный response: {"id":"resp_123","usage":{"total_tokens":100}}
❌ АГЕНТ 1 [1763182341127-afwls3j6e] Попытка 1/3 ОШИБКА: Error: Пустой ответ от Агента 1 (Prompt API)
```

## Файлы изменены

**`lib/services/unifiedAISystem.ts`:**
1. Строки 286-310: Добавлено логирование таймаута и Promise.race
2. Строки 313-325: Добавлено логирование извлечения результата
3. Строки 329-352: Добавлено логирование парсинга массива

## Тестирование

1. Создайте новый товар с 3 изображениями
2. Запустите обработку
3. Смотрите логи в консоли сервера
4. Теперь вы увидите **каждый шаг** обработки ответа Agent 1

## Диагностика проблем

### Если видите "ТАЙМАУТ!"
- Agent 1 не успевает ответить за 6 минут
- Увеличьте `AGENT1_TIMEOUT` до 10 минут (600000ms)

### Если видите "Пустой ответ"
- OpenAI API вернул ответ без `output` или `content`
- Проверьте формат запроса к API

### Если видите "Текстовый контент не найден"
- Ответ пришел в неожиданном формате
- Проверьте структуру `message.content`

### Если видите "Message item не найден"
- Ответ не содержит элемент с `type: 'message'`
- Проверьте типы элементов в массиве

## Результат

✅ Теперь вы видите **каждый шаг** обработки ответа Agent 1
✅ Легко диагностировать **где именно** происходит сбой
✅ Понятно **почему** Agent 1 не отвечает
✅ Видно **структуру** ответа от OpenAI API
