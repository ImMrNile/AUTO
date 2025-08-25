#!/bin/bash

# scripts/backup-sqlite.sh
# Скрипт для создания полной копии SQLite базы данных

# Настройки
DB_PATH="./prisma/dev.db"  # Путь к вашей БД
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

# Создаем папку для бэкапов
mkdir -p "$BACKUP_DIR"

echo "🔄 Создание бэкапа SQLite базы данных..."

# 1. ПОЛНАЯ КОПИЯ ФАЙЛА БД
echo "📁 Копируем файл базы данных..."
cp "$DB_PATH" "$BACKUP_DIR/db_backup_$TIMESTAMP.db"
echo "✅ Файл скопирован: $BACKUP_DIR/db_backup_$TIMESTAMP.db"

# 2. SQL ДАМП
echo "📄 Создаем SQL дамп..."
sqlite3 "$DB_PATH" .dump > "$BACKUP_DIR/sql_dump_$TIMESTAMP.sql"
echo "✅ SQL дамп создан: $BACKUP_DIR/sql_dump_$TIMESTAMP.sql"

# 3. КОПИЯ СХЕМЫ PRISMA
echo "📋 Копируем схему Prisma..."
cp "./prisma/schema.prisma" "$BACKUP_DIR/schema_$TIMESTAMP.prisma"
echo "✅ Схема скопирована: $BACKUP_DIR/schema_$TIMESTAMP.prisma"

# 4. СТАТИСТИКА БД
echo "📊 Собираем статистику..."
sqlite3 "$DB_PATH" "
SELECT 'Таблица: ' || name || ' | Записей: ' || 
(SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name!='sqlite_sequence') 
FROM sqlite_master 
WHERE type='table' AND name NOT LIKE 'sqlite_%'
" > "$BACKUP_DIR/stats_$TIMESTAMP.txt"

# Добавляем размер файла
echo "Размер БД: $(du -h $DB_PATH | cut -f1)" >> "$BACKUP_DIR/stats_$TIMESTAMP.txt"

echo "✅ Статистика сохранена: $BACKUP_DIR/stats_$TIMESTAMP.txt"

echo ""
echo "🎯 БЭКАП ЗАВЕРШЕН УСПЕШНО!"
echo "📁 Папка с бэкапом: $BACKUP_DIR"
echo "📋 Файлы созданы:"
echo "   - db_backup_$TIMESTAMP.db (полная копия)"
echo "   - sql_dump_$TIMESTAMP.sql (SQL дамп)"  
echo "   - schema_$TIMESTAMP.prisma (схема)"
echo "   - stats_$TIMESTAMP.txt (статистика)"

# ВОССТАНОВЛЕНИЕ (раскомментируйте при необходимости)
# echo ""
# echo "💡 Для восстановления используйте:"
# echo "   cp $BACKUP_DIR/db_backup_$TIMESTAMP.db $DB_PATH"
# echo "   или"
# echo "   sqlite3 новая_база.db < $BACKUP_DIR/sql_dump_$TIMESTAMP.sql"