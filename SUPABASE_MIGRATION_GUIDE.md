# Добавление таблицы TelegramSession в Supabase

## Способ 1: Через SQL Editor в Supabase Dashboard (Рекомендуется)

### Шаг 1: Откройте Supabase Dashboard
1. Перейдите на https://app.supabase.com
2. Выберите ваш проект
3. В левом меню нажмите "SQL Editor"

### Шаг 2: Создайте новый запрос
1. Нажмите "New query"
2. Скопируйте SQL код ниже
3. Нажмите "Run"

### SQL код для выполнения:

```sql
-- Create telegram_sessions table
CREATE TABLE IF NOT EXISTS "telegram_sessions" (
  "id" text NOT NULL PRIMARY KEY,
  "sessionId" text NOT NULL UNIQUE,
  "userId" text,
  "authenticated" boolean NOT NULL DEFAULT false,
  "expiresAt" timestamp(3) NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "telegram_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes for better performance
CREATE INDEX "telegram_sessions_sessionId_idx" ON "telegram_sessions"("sessionId");
CREATE INDEX "telegram_sessions_userId_idx" ON "telegram_sessions"("userId");
CREATE INDEX "telegram_sessions_expiresAt_idx" ON "telegram_sessions"("expiresAt");

-- Add trigger to update updatedAt automatically
CREATE OR REPLACE FUNCTION update_telegram_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_telegram_sessions_updated_at_trigger ON "telegram_sessions";
CREATE TRIGGER update_telegram_sessions_updated_at_trigger
BEFORE UPDATE ON "telegram_sessions"
FOR EACH ROW
EXECUTE FUNCTION update_telegram_sessions_updated_at();
```

## Способ 2: Через psql (Командная строка)

### Шаг 1: Получите строку подключения
1. В Supabase Dashboard откройте "Project Settings"
2. Перейдите на вкладку "Database"
3. Скопируйте "Connection string" (выберите "psql")
4. Она выглядит так: `postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres`

### Шаг 2: Подключитесь к БД
```bash
psql "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres"
```

### Шаг 3: Выполните SQL код
Скопируйте весь SQL код выше и вставьте в консоль psql

### Шаг 4: Проверьте результат
```sql
-- Проверьте что таблица создана
SELECT * FROM "telegram_sessions" LIMIT 1;

-- Проверьте индексы
SELECT indexname FROM pg_indexes WHERE tablename = 'telegram_sessions';
```

## Способ 3: Через pgAdmin (Если у вас есть доступ)

1. Откройте pgAdmin
2. Подключитесь к вашей БД Supabase
3. Откройте "Query Tool"
4. Вставьте SQL код
5. Нажмите "Execute"

## Проверка результата

После выполнения SQL кода проверьте что всё создалось:

```sql
-- 1. Проверьте таблицу
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'telegram_sessions';

-- 2. Проверьте структуру таблицы
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'telegram_sessions';

-- 3. Проверьте индексы
SELECT indexname FROM pg_indexes 
WHERE tablename = 'telegram_sessions';

-- 4. Проверьте триггеры
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_table = 'telegram_sessions';
```

## Если что-то пошло не так

### Удалить таблицу и начать заново:
```sql
-- Удалить триггер
DROP TRIGGER IF EXISTS update_telegram_sessions_updated_at_trigger ON "telegram_sessions";

-- Удалить функцию
DROP FUNCTION IF EXISTS update_telegram_sessions_updated_at();

-- Удалить таблицу
DROP TABLE IF EXISTS "telegram_sessions";
```

Затем выполните SQL код создания таблицы заново.

## Структура таблицы

| Поле | Тип | Описание |
|------|-----|---------|
| `id` | text | Уникальный ID сессии (первичный ключ) |
| `sessionId` | text | Уникальный session ID для QR-кода |
| `userId` | text | ID пользователя (внешний ключ на users) |
| `authenticated` | boolean | Флаг аутентификации |
| `expiresAt` | timestamp | Время истечения сессии |
| `createdAt` | timestamp | Время создания |
| `updatedAt` | timestamp | Время последнего обновления |

## Индексы

- `telegram_sessions_sessionId_idx` - Для быстрого поиска по sessionId
- `telegram_sessions_userId_idx` - Для быстрого поиска по userId
- `telegram_sessions_expiresAt_idx` - Для удаления истекших сессий

## Триггер

Автоматически обновляет поле `updatedAt` при каждом изменении записи.

## Результат

После выполнения SQL кода:
✅ Таблица `telegram_sessions` создана
✅ Все индексы созданы
✅ Триггер для `updatedAt` установлен
✅ Связь с таблицей `users` установлена

Теперь приложение может использовать Telegram авторизацию с ПК! 🎉
