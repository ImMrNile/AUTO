# Docker Setup для WB Automation

## Предварительные требования

- Docker Desktop (или Docker Engine + Docker Compose)
- 4GB+ RAM
- 10GB+ свободного места на диске

## Быстрый старт

### 1. Подготовка переменных окружения

```bash
# Скопируйте .env.example в .env
cp .env.example .env

# Отредактируйте .env с вашими значениями
# Особенно важны:
# - DATABASE_URL
# - SUPABASE_URL и SUPABASE_ANON_KEY
# - GOOGLE_VERTEX_AI_PROJECT
# - WB_API_KEY
```

### 2. Запуск контейнеров

```bash
# Сборка и запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f app

# Остановка сервисов
docker-compose down
```

### 3. Инициализация БД

```bash
# Запуск миграций Prisma
docker-compose exec app npx prisma migrate deploy

# Просмотр БД
docker-compose exec app npx prisma studio
```

## Структура сервисов

### PostgreSQL (порт 5432)
- Основная база данных
- Том: `postgres_data`
- Credentials: из `.env`

### Redis (порт 6379)
- Кеширование и сессии
- Том: `redis_data`

### Next.js App (порт 3000)
- Основное приложение
- Health check: `/api/health`

## Команды

### Разработка

```bash
# Запуск в режиме разработки
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Перестроить образ
docker-compose build --no-cache

# Очистить все данные
docker-compose down -v
```

### Production

```bash
# Запуск в production
docker-compose up -d

# Масштабирование приложения (если используется load balancer)
docker-compose up -d --scale app=3

# Просмотр статуса
docker-compose ps

# Проверка логов
docker-compose logs app
```

### Управление БД

```bash
# Подключение к PostgreSQL
docker-compose exec postgres psql -U postgres -d wb_automation

# Резервная копия БД
docker-compose exec postgres pg_dump -U postgres wb_automation > backup.sql

# Восстановление из резервной копии
docker-compose exec -T postgres psql -U postgres wb_automation < backup.sql

# Просмотр Prisma Studio
docker-compose exec app npx prisma studio
```

## Переменные окружения

### Обязательные

- `DATABASE_URL` - строка подключения PostgreSQL
- `SUPABASE_URL` - URL Supabase проекта
- `SUPABASE_ANON_KEY` - публичный ключ Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - приватный ключ Supabase
- `GOOGLE_VERTEX_AI_PROJECT` - ID проекта Google Cloud
- `WB_API_KEY` - API ключ Wildberries

### Опциональные

- `NEXT_PUBLIC_API_URL` - URL API (по умолчанию: http://localhost:3000)
- `REDIS_URL` - URL Redis (по умолчанию: redis://redis:6379)
- `OPENAI_API_KEY` - если используется OpenAI вместо Vertex AI

## Troubleshooting

### Приложение не запускается

```bash
# Проверьте логи
docker-compose logs app

# Проверьте здоровье контейнеров
docker-compose ps

# Перезагрузите контейнеры
docker-compose restart
```

### Ошибка подключения к БД

```bash
# Проверьте, что PostgreSQL готова
docker-compose exec postgres pg_isready

# Проверьте переменные окружения
docker-compose config | grep DATABASE_URL

# Перезагрузите PostgreSQL
docker-compose restart postgres
```

### Проблемы с миграциями

```bash
# Проверьте статус миграций
docker-compose exec app npx prisma migrate status

# Сбросьте БД (осторожно!)
docker-compose exec app npx prisma migrate reset

# Запустите миграции вручную
docker-compose exec app npx prisma migrate deploy
```

## Мониторинг

### Health Check

```bash
# Проверить здоровье приложения
curl http://localhost:3000/api/health

# Проверить здоровье БД
docker-compose exec postgres pg_isready

# Проверить здоровье Redis
docker-compose exec redis redis-cli ping
```

### Логи

```bash
# Все логи
docker-compose logs

# Логи приложения
docker-compose logs app

# Логи БД
docker-compose logs postgres

# Логи Redis
docker-compose logs redis

# Следить за логами в реальном времени
docker-compose logs -f
```

## Оптимизация

### Размер образа

- Multi-stage build уменьшает размер с ~1.5GB до ~400MB
- Используется Alpine Linux для минимального размера
- Удаляются dev зависимости в production

### Производительность

- Health checks для автоматического перезапуска
- Restart policy: `unless-stopped`
- Volumes для сохранения данных между перезагрузками

## Безопасность

- Непривилегированный пользователь (nextjs:1001)
- Сетевая изоляция через custom network
- Переменные окружения не в коде
- Health checks для обнаружения проблем

## Развертывание

### На сервер

```bash
# Скопируйте файлы на сервер
scp -r . user@server:/app

# Подключитесь к серверу
ssh user@server

# Перейдите в директорию
cd /app

# Создайте .env файл
nano .env

# Запустите контейнеры
docker-compose up -d
```

### На облачный сервис

- **AWS ECS**: используйте `docker-compose` как основу для task definition
- **Google Cloud Run**: используйте Dockerfile для создания образа
- **Azure Container Instances**: используйте docker-compose.yml
- **DigitalOcean App Platform**: загрузите Dockerfile

## Лицензия

MIT
