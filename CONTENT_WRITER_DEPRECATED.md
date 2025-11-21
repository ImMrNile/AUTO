# content-writer.ts - Устаревший файл

## Статус: DEPRECATED

Файл `lib/ai/content-writer.ts` **не используется** в текущей версии приложения.

## Причина

- Использует **старый Assistant API** (threads, runs, messages)
- Текущая система использует **Responses API** (более новый и быстрый)
- Функции из этого файла **нигде не импортируются**

## Ошибки при сборке

```
Argument of type 'string' is not assignable to parameter of type 'RunRetrieveParams'
```

Эти ошибки возникают из-за несовместимости с текущей версией OpenAI SDK.

## Решение

Файл можно:
1. **Удалить** - если не планируется использовать
2. **Переименовать** в `.bak` - для сохранения истории
3. **Исправить** - если планируется использовать в будущем

## Рекомендация

**Удалите файл:**

```bash
rm lib/ai/content-writer.ts
```

Или **переименуйте:**

```bash
mv lib/ai/content-writer.ts lib/ai/content-writer.ts.bak
```

## Текущая система

Вместо `content-writer.ts` используется:
- `lib/services/unifiedAISystem.ts` - Agent 1 (Responses API)
- `lib/services/unifiedAISystem.ts` - Agent 2 (Responses API)

Эти агенты работают **без ошибок** и используют современный API.
