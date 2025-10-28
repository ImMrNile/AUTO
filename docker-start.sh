#!/bin/bash

set -e

echo "🚀 WB Automation Docker Setup"
echo "================================"

# Проверяем наличие .env файла
if [ ! -f ".env" ]; then
    echo "⚠️  .env файл не найден"
    echo "📋 Копируем .env.example в .env..."
    cp .env.example .env
    echo "✅ Файл .env создан"
    echo "⚠️  Пожалуйста, отредактируйте .env с вашими значениями"
    exit 1
fi

# Проверяем Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен"
    exit 1
fi

echo "✅ Docker установлен"

# Выбираем режим
echo ""
echo "Выберите режим запуска:"
echo "1) Production (по умолчанию)"
echo "2) Development"
read -p "Введите номер (1-2): " MODE

case $MODE in
    2)
        echo "🔧 Запуск в режиме разработки..."
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
        ;;
    *)
        echo "🚀 Запуск в production режиме..."
        docker-compose up -d
        
        echo ""
        echo "⏳ Ожидание инициализации сервисов..."
        sleep 10
        
        echo ""
        echo "✅ Сервисы запущены!"
        echo ""
        echo "📍 Доступные сервисы:"
        echo "   - Приложение: http://localhost:3000"
        echo "   - pgAdmin: http://localhost:5050"
        echo "   - Redis Commander: http://localhost:8081"
        echo ""
        echo "📊 Просмотр логов:"
        echo "   docker-compose logs -f app"
        echo ""
        echo "🛑 Остановка сервисов:"
        echo "   docker-compose down"
        ;;
esac
