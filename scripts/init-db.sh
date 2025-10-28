#!/bin/bash

set -e

echo "🔄 Инициализация базы данных..."

# Ждем, пока PostgreSQL будет готов
echo "⏳ Ожидание подключения к PostgreSQL..."
until PGPASSWORD=$DB_PASSWORD psql -h postgres -U $DB_USER -d $DB_NAME -c "\q"; do
  >&2 echo "PostgreSQL недоступна - ожидание..."
  sleep 1
done

echo "✅ PostgreSQL готова"

# Запускаем миграции Prisma
echo "📦 Запуск миграций Prisma..."
npx prisma migrate deploy

# Генерируем Prisma Client
echo "🔧 Генерация Prisma Client..."
npx prisma generate

# Заполняем начальные данные (опционально)
if [ -f "scripts/seed.ts" ]; then
  echo "🌱 Заполнение начальных данных..."
  npx ts-node scripts/seed.ts
fi

echo "✅ Инициализация базы данных завершена!"
