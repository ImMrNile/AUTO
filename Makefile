.PHONY: help docker-build docker-up docker-down docker-logs docker-shell docker-db docker-redis docker-clean

help:
	@echo "🐳 WB Automation Docker Commands"
	@echo "=================================="
	@echo ""
	@echo "Основные команды:"
	@echo "  make docker-up          - Запустить контейнеры (production)"
	@echo "  make docker-dev         - Запустить контейнеры (development)"
	@echo "  make docker-down        - Остановить контейнеры"
	@echo "  make docker-logs        - Просмотреть логи приложения"
	@echo "  make docker-shell       - Подключиться к контейнеру приложения"
	@echo ""
	@echo "Управление БД:"
	@echo "  make docker-db          - Подключиться к PostgreSQL"
	@echo "  make docker-migrate     - Запустить миграции Prisma"
	@echo "  make docker-studio      - Открыть Prisma Studio"
	@echo ""
	@echo "Управление Redis:"
	@echo "  make docker-redis       - Подключиться к Redis"
	@echo ""
	@echo "Очистка:"
	@echo "  make docker-clean       - Удалить контейнеры и тома"
	@echo "  make docker-build       - Пересобрать образы"

docker-build:
	@echo "🔨 Сборка Docker образов..."
	docker-compose build --no-cache

docker-up:
	@echo "🚀 Запуск контейнеров (production)..."
	docker-compose up -d
	@echo "✅ Сервисы запущены!"
	@echo "📍 http://localhost:3000"

docker-dev:
	@echo "🔧 Запуск контейнеров (development)..."
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

docker-down:
	@echo "🛑 Остановка контейнеров..."
	docker-compose down

docker-logs:
	@echo "📋 Логи приложения:"
	docker-compose logs -f app

docker-shell:
	@echo "🔌 Подключение к контейнеру приложения..."
	docker-compose exec app sh

docker-db:
	@echo "🗄️  Подключение к PostgreSQL..."
	docker-compose exec postgres psql -U postgres -d wb_automation

docker-migrate:
	@echo "📦 Запуск миграций Prisma..."
	docker-compose exec app npx prisma migrate deploy

docker-studio:
	@echo "🎨 Открытие Prisma Studio..."
	docker-compose exec app npx prisma studio

docker-redis:
	@echo "🔴 Подключение к Redis..."
	docker-compose exec redis redis-cli

docker-clean:
	@echo "🧹 Удаление контейнеров и томов..."
	docker-compose down -v
	@echo "✅ Очистка завершена"

docker-ps:
	@echo "📊 Статус контейнеров:"
	docker-compose ps

docker-health:
	@echo "🏥 Проверка здоровья сервисов..."
	@echo "Приложение:"
	@curl -s http://localhost:3000/api/health || echo "❌ Недоступно"
	@echo ""
	@echo "PostgreSQL:"
	@docker-compose exec postgres pg_isready || echo "❌ Недоступно"
	@echo ""
	@echo "Redis:"
	@docker-compose exec redis redis-cli ping || echo "❌ Недоступно"

docker-backup:
	@echo "💾 Резервная копия БД..."
	@mkdir -p backups
	docker-compose exec postgres pg_dump -U postgres wb_automation > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "✅ Резервная копия создана"

docker-restore:
	@echo "📥 Восстановление из резервной копии..."
	@read -p "Введите имя файла резервной копии: " FILE; \
	docker-compose exec -T postgres psql -U postgres wb_automation < $$FILE
	@echo "✅ Восстановление завершено"
