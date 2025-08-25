// /scripts/update-characteristics.js - ФИНАЛЬНАЯ ВЕРСИЯ С ВОЗОБНОВЛЕНИЕМ РАБОТЫ

import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

const WB_API_TOKEN = process.env.WB_API_TOKEN;
const WB_API_BASE_URL = 'https://content-api.wildberries.ru';

// Увеличиваем задержку до 1 секунды для максимальной безопасности
const REQUEST_DELAY_MS = 1000;

if (!WB_API_TOKEN) {
    console.error('❌ Ошибка: Не найден WB_API_TOKEN в переменных окружения (.env файле).');
    process.exit(1);
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function makeWbApiRequest(endpoint) {
    const url = `${WB_API_BASE_URL}${endpoint}`;
    const headers = { 'Authorization': WB_API_TOKEN, 'Content-Type': 'application/json' };
    const response = await fetch(url, { headers });
    if (!response.ok) {
        if (response.status === 429) {
            throw new Error(`429 Too Many Requests`);
        }
        if (response.status !== 404) {
            const errorText = await response.text();
            throw new Error(`Ошибка WB API (${response.status}): ${errorText}`);
        }
        return null;
    }
    return response.json();
}

async function main() {
    console.log('🚀 Запуск обновления характеристик с возможностью возобновления...');
    console.log(`🕒 Задержка между запросами: ${REQUEST_DELAY_MS} мс.`);

    try {
        // Шаг 1: Получаем ВСЕ категории из нашей БД
        const allSubcategories = await prisma.wbSubcategory.findMany({
            orderBy: { id: 'asc' },
        });

        if (allSubcategories.length === 0) {
            console.error('❌ В базе данных нет категорий для обновления.');
            return;
        }
        console.log(`✅ Найдено ${allSubcategories.length} категорий в БД.`);

        // Шаг 2: Получаем ID категорий, которые УЖЕ обработаны
        const processedCategoryIds = (await prisma.wbCategoryCharacteristic.findMany({
            select: { subcategoryId: true },
            distinct: ['subcategoryId']
        })).map(c => c.subcategoryId);

        if (processedCategoryIds.length > 0) {
            console.log(`✅ Найдено ${processedCategoryIds.length} уже обработанных категорий. Они будут пропущены.`);
        }

        // Шаг 3: Фильтруем список, оставляя только НЕОБРАБОТАННЫЕ категории
        const categoriesToProcess = allSubcategories.filter(
            cat => !processedCategoryIds.includes(cat.id)
        );

        if (categoriesToProcess.length === 0) {
            console.log('🎉 Все категории уже обработаны! Обновление не требуется.');
            return;
        }
        console.log(`🔥 Осталось обработать: ${categoriesToProcess.length} категорий.`);


        // Шаг 4: Проходим по НЕОБРАБОТАННЫМ категориям и загружаем для них характеристики
        let totalCharacteristicsSynced = 0;
        let categoriesWithoutChars = 0;

        for (let i = 0; i < categoriesToProcess.length; i++) {
            const subcategory = categoriesToProcess[i];
            if (!subcategory.wbSubjectId) {
                console.log(`[${i + 1}/${categoriesToProcess.length}] ⚠️ Пропуск: у категории "${subcategory.name}" нет WB Subject ID.`);
                continue;
            }

            console.log(`[${i + 1}/${categoriesToProcess.length}] 🔄 Загружаем характеристики для "${subcategory.name}" (ID: ${subcategory.wbSubjectId})...`);

            try {
                const characteristicsResponse = await makeWbApiRequest(`/content/v2/object/charcs/${subcategory.wbSubjectId}`);

                if (!characteristicsResponse || !characteristicsResponse.data || characteristicsResponse.data.length === 0) {
                    console.log(`  🤔 Для категории "${subcategory.name}" нет характеристик.`);
                    categoriesWithoutChars++;
                    await delay(REQUEST_DELAY_MS);
                    continue;
                }

                const characteristics = characteristicsResponse.data;

                for (const char of characteristics) {
                    const characteristicId = char.id || char.charcID;
                    if (!characteristicId || !char.name || typeof char.charcType === 'undefined') {
                        console.warn(`  ⚠️ Пропущена неполная характеристика:`, char);
                        continue;
                    }

                    await prisma.wbCategoryCharacteristic.create({
                        data: {
                            subcategoryId: subcategory.id,
                            wbCharacteristicId: characteristicId,
                            name: char.name,
                            type: String(char.charcType),
                            isRequired: char.required || false,
                            isMultiselect: char.isMultiselect || false,
                        },
                    });
                    totalCharacteristicsSynced++;
                }
                console.log(`  👍 Успешно! Загружено ${characteristics.length} характеристик.`);

            } catch (error) {
                console.error(`  ❌ Ошибка при загрузке для категории "${subcategory.name}": ${error.message}`);
                if (error.message.includes('429')) {
                    console.error('🚫 Обнаружена ошибка превышения лимитов. Скрипт остановлен. Запустите его снова через несколько минут, и он продолжит с этого же места.');
                    process.exit(1);
                }
            }

            await delay(REQUEST_DELAY_MS);
        }

        console.log('\n=============================================');
        console.log('✅ Обновление характеристик завершено!');
        console.log(`  - Новых характеристик добавлено в этой сессии: ${totalCharacteristicsSynced}`);
        console.log('=============================================');

    } catch (error) {
        console.error('\n❌ Произошла критическая ошибка во время обновления:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();