-- fix-schema.sql - Исправление схемы БД для устранения ошибки unique constraint

-- Удаляем unique ограничение на wbSubjectId
-- Это позволит иметь null значения и дубликаты

-- Для SQLite нужно пересоздать таблицу без unique ограничения
-- 1. Создаем временную таблицу без ограничения
CREATE TABLE wb_subcategories_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wbSubjectId INTEGER, -- убрали UNIQUE
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    parentCategoryId INTEGER NOT NULL,
    commissionFbw REAL DEFAULT 0.00,
    commissionFbs REAL DEFAULT 0.00,  
    commissionDbs REAL DEFAULT 0.00,
    commissionCc REAL DEFAULT 0.00,
    commissionEdbs REAL DEFAULT 0.00,
    commissionBooking REAL DEFAULT 0.00,
    description TEXT,
    keywords TEXT,
    isActive INTEGER DEFAULT 1,
    sortOrder INTEGER DEFAULT 0,
    minPrice REAL,
    maxPrice REAL,
    requiresCertificate INTEGER DEFAULT 0,
    ageRestriction INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parentCategoryId) REFERENCES wb_parent_categories(id) ON DELETE CASCADE
);

-- 2. Копируем данные из старой таблицы
INSERT INTO wb_subcategories_new 
SELECT * FROM wb_subcategories;

-- 3. Удаляем старую таблицу
DROP TABLE wb_subcategories;

-- 4. Переименовываем новую таблицу
ALTER TABLE wb_subcategories_new RENAME TO wb_subcategories;

-- Проверяем результат
SELECT COUNT(*) as total_categories FROM wb_subcategories;
SELECT COUNT(*) as categories_with_wb_id FROM wb_subcategories WHERE wbSubjectId IS NOT NULL;