-- SQL скрипт для привязки всех товаров к кабинетам

-- Показать товары без кабинета
SELECT 
    p.id,
    p.name,
    p."wbNmId",
    p."userId",
    (SELECT COUNT(*) FROM "ProductCabinet" pc WHERE pc."productId" = p.id) as cabinet_count
FROM "Product" p
WHERE NOT EXISTS (
    SELECT 1 FROM "ProductCabinet" pc WHERE pc."productId" = p.id
)
ORDER BY p."createdAt" DESC;

-- Привязать все товары без кабинета к первому активному кабинету пользователя
INSERT INTO "ProductCabinet" ("id", "productId", "cabinetId", "isSelected", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid(),
    p.id,
    (
        SELECT c.id 
        FROM "Cabinet" c 
        WHERE c."userId" = p."userId" 
          AND c."isActive" = true 
          AND c."apiToken" IS NOT NULL
        ORDER BY c."createdAt" ASC
        LIMIT 1
    ),
    true,
    NOW(),
    NOW()
FROM "Product" p
WHERE NOT EXISTS (
    SELECT 1 FROM "ProductCabinet" pc WHERE pc."productId" = p.id
)
AND EXISTS (
    SELECT 1 FROM "Cabinet" c 
    WHERE c."userId" = p."userId" 
      AND c."isActive" = true 
      AND c."apiToken" IS NOT NULL
);

-- Проверить результат
SELECT 
    p.id,
    p.name,
    p."wbNmId",
    c.name as cabinet_name,
    c."apiToken" IS NOT NULL as has_token
FROM "Product" p
LEFT JOIN "ProductCabinet" pc ON p.id = pc."productId"
LEFT JOIN "Cabinet" c ON pc."cabinetId" = c.id
ORDER BY p."createdAt" DESC
LIMIT 20;
