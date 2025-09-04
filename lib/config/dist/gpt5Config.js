"use strict";
// lib/config/gpt5Config.ts - ИСПРАВЛЕННАЯ КОНФИГУРАЦИЯ С ТИПИЗАЦИЕЙ
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
exports.GPT5_UTILS = exports.GPT5_CONFIG = void 0;
exports.GPT5_CONFIG = {
    // Модели для разных агентов (обновлено)
    MODELS: {
        RESEARCHER: 'gpt-5',
        RESEARCHER_FALLBACK: 'gpt-4.1',
        CHARACTERISTICS: 'gpt-4.1',
        SEO: 'gpt-4.1',
        VALIDATOR: 'gpt-4.1'
    },
    // Обновленные лимиты для WB (унифицированы)
    WB_LIMITS: {
        UNIVERSAL: {
            maxTitleLength: 60,
            maxDescriptionLength: 2000,
            recommendedTitleLength: 50,
            recommendedDescriptionLength: 1500
        }
    },
    // Лимиты и параметры системы
    LIMITS: {
        MAX_TOKENS: {
            RESEARCHER: 8000,
            CHARACTERISTICS: 10000,
            SEO: 12000 // GPT-4.1 для SEO
        },
        TIMEOUT: {
            RESEARCHER: 150000,
            CHARACTERISTICS: 90000,
            SEO: 90000 // 1.5 минуты для SEO
        },
        MAX_RETRIES: 3,
        MAX_IMAGES: 20,
        MAX_SEARCH_QUERIES: 12,
        MIN_CHARACTERISTICS: 20,
        TARGET_FILL_RATE: 0.80 // Целевой процент заполнения
    },
    // Настройки температуры
    TEMPERATURE: {
        RESEARCH: 0.1,
        ANALYSIS: 0.1,
        SEO: 0.2,
        VALIDATION: 0.0 // Минимальная для проверки
    },
    // Обновленные категории с типизацией
    SPECIAL_CATEGORIES: {
        794: {
            name: 'Наушники',
            parentName: 'Телевизоры и аудиотехника',
            maxTitleLength: 60,
            maxDescriptionLength: 2000,
            requiredSearchQueries: [
                'технические характеристики наушники',
                'bluetooth наушники отзывы wildberries',
                'беспроводные наушники сравнение моделей',
                'TWS наушники официальная спецификация',
                'время работы наушники аккумулятор'
            ],
            focusKeywords: ['bluetooth', 'беспроводные', 'TWS', 'автономность', 'качество звука'],
            commonIssues: ['время работы', 'качество сборки', 'совместимость', 'зарядка'],
            priorityCharacteristics: [85, 90746, 14177449, 90651] // Бренд, Время работы, Цвет, Тип подключения
        },
        5581: {
            name: 'Электроника',
            parentName: 'Техника',
            maxTitleLength: 60,
            maxDescriptionLength: 2000,
            requiredSearchQueries: [
                'технические спецификации электроника',
                'обзоры и тесты устройства',
                'сравнение с конкурентами',
                'официальные характеристики'
            ],
            focusKeywords: ['мощность', 'эффективность', 'совместимость', 'качество'],
            commonIssues: ['надежность', 'энергопотребление', 'совместимость'],
            priorityCharacteristics: [85, 14177449] // Бренд, Цвет
        }
    },
    // Расширенные настройки поиска для GPT-5
    SEARCH_CONFIG: {
        PRIORITY_SOURCES: [
            'официальные сайты производителей',
            'wildberries.ru',
            'ozon.ru',
            'market.yandex.ru',
            'dns-shop.ru',
            'citilink.ru',
            'mvideo.ru',
            'eldorado.ru'
        ],
        SEARCH_PATTERNS: {
            TECHNICAL_SPECS: [
                '{productName} технические характеристики',
                '{productName} спецификация официальная',
                '{productName} datasheet руководство',
                '{productName} обзор детальный тест'
            ],
            MARKET_ANALYSIS: [
                '{productName} wildberries отзывы покупателей',
                '{productName} ozon цена сравнение',
                '{productName} яндекс маркет характеристики',
                '{productName} сравнение аналоги конкуренты'
            ],
            COMPETITIVE: [
                '{categoryName} лучшие модели 2024 рейтинг',
                '{categoryName} топ производителей качество',
                '{categoryName} что выбрать рекомендации экспертов'
            ],
            QUALITY_ASSESSMENT: [
                '{productName} качество сборки материалы',
                '{productName} проблемы недостатки жалобы',
                '{productName} преимущества особенности плюсы'
            ]
        },
        MIN_SOURCES_REQUIRED: 8,
        MIN_RELEVANCE_SCORE: 0.75,
        CROSS_VERIFICATION: true
    },
    // Обновленные шаблоны промптов
    PROMPT_TEMPLATES: {
        RESEARCH_SYSTEM: "\u0412\u044B - GPT-5 \u0438\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0441 \u0444\u0443\u043D\u043A\u0446\u0438\u0435\u0439 \u0432\u0435\u0431-\u043F\u043E\u0438\u0441\u043A\u0430. \u0412\u0430\u0448\u0430 \u0437\u0430\u0434\u0430\u0447\u0430:\n1. \u041D\u0430\u0439\u0442\u0438 \u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C \u0434\u043E\u0441\u0442\u043E\u0432\u0435\u0440\u043D\u043E\u0439 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u0438 \u043E \u0442\u043E\u0432\u0430\u0440\u0435 \u0447\u0435\u0440\u0435\u0437 \u0432\u0435\u0431-\u043F\u043E\u0438\u0441\u043A\n2. \u041F\u0440\u043E\u0430\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u0442\u043E\u0432\u0430\u0440\u0430 \u043D\u0430 \u0432\u044B\u0441\u043E\u043A\u043E\u043C \u0443\u0440\u043E\u0432\u043D\u0435 \u0434\u0435\u0442\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438\n3. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u043C\u043D\u043E\u0436\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0435 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438 \u0434\u043B\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0434\u0430\u043D\u043D\u044B\u0445\n4. \u0421\u0444\u043E\u043A\u0443\u0441\u0438\u0440\u043E\u0432\u0430\u0442\u044C\u0441\u044F \u043D\u0430 \u0442\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0445 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0430\u0445 \u0438 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0435\n5. \u0418\u0437\u0431\u0435\u0433\u0430\u0442\u044C \u0433\u0430\u0431\u0430\u0440\u0438\u0442\u043D\u044B\u0445 \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u0439 (\u0438\u0445 \u0437\u0430\u043F\u043E\u043B\u043D\u0438\u0442 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C)\n6. \u041F\u0440\u0435\u0434\u043E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0432\u044B\u0441\u043E\u043A\u043E\u0433\u043E \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0430\n7. \u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044E \u0438\u0437 \u0440\u0430\u0437\u043D\u044B\u0445 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u043E\u0432",
        CHARACTERISTICS_SYSTEM: "\u0412\u044B - GPT-4.1 \u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u043E\u0442 GPT-5:\n1. \u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A \u0441 \u0432\u044B\u0441\u043E\u043A\u043E\u0439 \u0442\u043E\u0447\u043D\u043E\u0441\u0442\u044C\u044E (\u0446\u0435\u043B\u044C: 80%+ \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F)\n2. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0442\u0438\u043F\u044B \u0438\u0437 \u0431\u0430\u0437\u044B \u0434\u0430\u043D\u043D\u044B\u0445 (string/number) \u0441\u0442\u0440\u043E\u0433\u043E\n3. \u041E\u0431\u0435\u0441\u043F\u0435\u0447\u044C\u0442\u0435 \u0432\u044B\u0441\u043E\u043A\u0443\u044E \u0443\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0441\u0442\u044C (>0.8) \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u0440\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u044B\u0445 \u0434\u0430\u043D\u043D\u044B\u0445\n4. \u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438 \u0434\u0430\u043D\u043D\u044B\u0445 \u0434\u043B\u044F \u043A\u0430\u0436\u0434\u043E\u0439 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438\n5. \u041F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442 \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u043C \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0430\u043C\n6. \u0418\u0441\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u0433\u0430\u0431\u0430\u0440\u0438\u0442\u043D\u044B\u0435 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438 \u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E",
        SEO_SYSTEM: "\u0412\u044B - GPT-4.1 SEO \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442 \u0434\u043B\u044F Wildberries:\n1. \u0421\u043E\u0431\u043B\u044E\u0434\u0430\u0439\u0442\u0435 \u0441\u0442\u0440\u043E\u0433\u0438\u0435 \u043B\u0438\u043C\u0438\u0442\u044B: \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A 60 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432, \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 2000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432\n2. \u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043F\u0440\u043E\u0434\u0430\u044E\u0449\u0438\u0439 \u043A\u043E\u043D\u0442\u0435\u043D\u0442 \u0441 \u0442\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u043C\u0438 \u0434\u0435\u0442\u0430\u043B\u044F\u043C\u0438 \u0438\u0437 GPT-5\n3. \u041E\u043F\u0442\u0438\u043C\u0438\u0437\u0438\u0440\u0443\u0439\u0442\u0435 \u043F\u043E\u0434 \u043F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0435 \u0437\u0430\u043F\u0440\u043E\u0441\u044B WB \u0438 Google\n4. \u0412\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u044D\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0435 \u0442\u0440\u0438\u0433\u0433\u0435\u0440\u044B \u0438 \u043A\u043E\u043D\u043A\u0443\u0440\u0435\u043D\u0442\u043D\u044B\u0435 \u043F\u0440\u0435\u0438\u043C\u0443\u0449\u0435\u0441\u0442\u0432\u0430\n5. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0438\u0437 \u0432\u0435\u0431-\u043F\u043E\u0438\u0441\u043A\u0430 GPT-5\n6. \u0424\u043E\u043A\u0443\u0441 \u043D\u0430 \u0440\u0435\u0448\u0435\u043D\u0438\u0438 \u043F\u0440\u043E\u0431\u043B\u0435\u043C \u043A\u043B\u0438\u0435\u043D\u0442\u0430"
    },
    // Метрики качества (обновлены)
    QUALITY_THRESHOLDS: {
        MIN_CONFIDENCE: 0.8,
        MIN_CHARACTERISTICS: 20,
        MIN_SEARCH_SOURCES: 8,
        TARGET_FILL_RATE: 0.80,
        EXCELLENT_QUALITY_SCORE: 90,
        GOOD_QUALITY_SCORE: 75,
        ACCEPTABLE_QUALITY_SCORE: 60,
        MIN_TITLE_LENGTH: 40,
        MIN_DESCRIPTION_LENGTH: 1000
    },
    // Настройки A/B тестирования
    AB_TESTING: {
        SAMPLE_SIZE: 50,
        CONFIDENCE_LEVEL: 0.95,
        METRICS_TO_TRACK: [
            'quality_score',
            'processing_time',
            'characteristics_count',
            'confidence_level',
            'wb_compliance',
            'search_sources_count',
            'fill_rate_percentage'
        ],
        AUTO_SWITCH_THRESHOLD: 0.10,
        MIN_SAMPLE_SIZE: 20
    },
    // Характеристики, заполняемые пользователем
    USER_INPUT_CHARACTERISTICS: new Set([
        89008, 90630, 90607, 90608, 90652, 90653,
        11001, 11002, 72739, 90654, 90655,
        15001135, 15001136, 15001137, 15001138, 15001405,
        15001650, 15001706, 14177453, 15000001
    ])
};
// Вспомогательные функции с правильной типизацией
exports.GPT5_UTILS = {
    /**
     * Получение конфигурации для категории с типизацией
     */
    getCategoryConfig: function (categoryId) {
        var config = exports.GPT5_CONFIG.SPECIAL_CATEGORIES[categoryId];
        if (config) {
            return __assign(__assign({}, config), { maxTitleLength: exports.GPT5_CONFIG.WB_LIMITS.UNIVERSAL.maxTitleLength, maxDescriptionLength: exports.GPT5_CONFIG.WB_LIMITS.UNIVERSAL.maxDescriptionLength });
        }
        return {
            name: 'Товар',
            parentName: 'Общая категория',
            maxTitleLength: exports.GPT5_CONFIG.WB_LIMITS.UNIVERSAL.maxTitleLength,
            maxDescriptionLength: exports.GPT5_CONFIG.WB_LIMITS.UNIVERSAL.maxDescriptionLength,
            requiredSearchQueries: [
                'технические характеристики',
                'отзывы покупателей',
                'сравнение моделей'
            ],
            focusKeywords: ['качество', 'надежность', 'функциональность'],
            commonIssues: ['качество сборки', 'соответствие описанию'],
            priorityCharacteristics: [85, 14177449] // Бренд, Цвет
        };
    },
    /**
     * Генерация расширенных поисковых запросов для GPT-5
     */
    generateSearchQueries: function (productName, categoryConfig) {
        var queries = [];
        // Базовые запросы из конфигурации категории
        categoryConfig.requiredSearchQueries.forEach(function (query) {
            queries.push(query.includes('{productName}') ?
                query.replace('{productName}', productName) :
                productName + " " + query);
        });
        // Запросы по всем шаблонам
        Object.values(exports.GPT5_CONFIG.SEARCH_CONFIG.SEARCH_PATTERNS).forEach(function (patterns) {
            patterns.forEach(function (pattern) {
                queries.push(pattern
                    .replace('{productName}', productName)
                    .replace('{categoryName}', categoryConfig.name));
            });
        });
        // Дополнительные специфичные запросы
        queries.push(productName + " \u0438\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F", productName + " \u0433\u0430\u0440\u0430\u043D\u0442\u0438\u044F \u0441\u0435\u0440\u0432\u0438\u0441", productName + " \u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0441\u0442\u044C \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430", productName + " \u043A\u043E\u043C\u043F\u043B\u0435\u043A\u0442\u0430\u0446\u0438\u044F \u0447\u0442\u043E \u0432\u0445\u043E\u0434\u0438\u0442");
        return queries.slice(0, exports.GPT5_CONFIG.LIMITS.MAX_SEARCH_QUERIES);
    },
    /**
     * Определение рекомендуемой системы с типизацией
     */
    recommendSystem: function (context) {
        var reasons = [];
        var score = 0;
        // Критерии для GPT-5
        if (context.categoryId === 794) {
            score += 4;
            reasons.push('Категория наушников требует точного анализа');
        }
        if (context.price > 2000) {
            score += 3;
            reasons.push('Цена товара требует качественного анализа');
        }
        if (context.hasReference) {
            score += 3;
            reasons.push('Референсная ссылка - GPT-5 лучше анализирует');
        }
        if (context.imageCount > 3) {
            score += 2;
            reasons.push('Много изображений для анализа');
        }
        if (context.complexityLevel === 'complex') {
            score += 3;
            reasons.push('Сложный товар требует глубокого анализа');
        }
        // Учитываем предпочтения пользователя
        if (context.userPreference === 'quality') {
            score += 2;
            reasons.push('Пользователь приоритизирует качество');
        }
        else if (context.userPreference === 'speed') {
            score -= 2;
            reasons.push('Пользователь приоритизирует скорость');
        }
        var confidence = Math.min(0.95, 0.6 + (score * 0.05));
        return {
            system: score >= 5 ? 'gpt5' : 'optimized',
            reasons: reasons,
            confidence: confidence
        };
    },
    /**
     * Валидация результатов GPT-5 с типизацией
     */
    validateGPT5Results: function (results) {
        var _a, _b, _c, _d, _e;
        var issues = [];
        var suggestions = [];
        var score = 100;
        // Проверка поисковых метрик
        var searchSources = ((_a = results.searchMetrics) === null || _a === void 0 ? void 0 : _a.totalSources) || 0;
        if (searchSources < exports.GPT5_CONFIG.QUALITY_THRESHOLDS.MIN_SEARCH_SOURCES) {
            issues.push("\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u043E\u0432: " + searchSources + "/" + exports.GPT5_CONFIG.QUALITY_THRESHOLDS.MIN_SEARCH_SOURCES);
            score -= 25;
        }
        // Проверка характеристик
        var charCount = ((_b = results.characteristics) === null || _b === void 0 ? void 0 : _b.length) || 0;
        if (charCount < exports.GPT5_CONFIG.QUALITY_THRESHOLDS.MIN_CHARACTERISTICS) {
            issues.push("\u041C\u0430\u043B\u043E \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A: " + charCount + "/" + exports.GPT5_CONFIG.QUALITY_THRESHOLDS.MIN_CHARACTERISTICS);
            score -= 20;
        }
        // Проверка уверенности
        var avgConfidence = ((_c = results.characteristics) === null || _c === void 0 ? void 0 : _c.reduce(function (sum, char) {
            return sum + (char.confidence || 0);
        }, 0)) / (charCount || 1);
        if (avgConfidence < exports.GPT5_CONFIG.QUALITY_THRESHOLDS.MIN_CONFIDENCE) {
            issues.push("\u041D\u0438\u0437\u043A\u0430\u044F \u0443\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0441\u0442\u044C: " + Math.round(avgConfidence * 100) + "%");
            score -= 15;
        }
        // Проверка WB соответствия
        if (results.wbCompliance && !results.wbCompliance.isCompliant) {
            issues.push('Не соответствует требованиям WB');
            score -= 20;
        }
        // Проверка качества контента
        var titleLength = ((_d = results.seoTitle) === null || _d === void 0 ? void 0 : _d.length) || 0;
        var descLength = ((_e = results.seoDescription) === null || _e === void 0 ? void 0 : _e.length) || 0;
        if (titleLength < exports.GPT5_CONFIG.QUALITY_THRESHOLDS.MIN_TITLE_LENGTH) {
            issues.push("\u041A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A: " + titleLength + " \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
            score -= 10;
        }
        if (descLength < exports.GPT5_CONFIG.QUALITY_THRESHOLDS.MIN_DESCRIPTION_LENGTH) {
            issues.push("\u041A\u043E\u0440\u043E\u0442\u043A\u043E\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435: " + descLength + " \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
            score -= 10;
        }
        // Рекомендации по улучшению
        if (score < exports.GPT5_CONFIG.QUALITY_THRESHOLDS.EXCELLENT_QUALITY_SCORE) {
            if (searchSources < 10) {
                suggestions.push('Добавьте больше поисковых запросов');
            }
            if (charCount < 25) {
                suggestions.push('Улучшите промпты для заполнения характеристик');
            }
            if (avgConfidence < 0.85) {
                suggestions.push('Проверьте качество входных данных');
            }
        }
        var detailedMetrics = {
            searchQuality: Math.min(100, (searchSources / 15) * 100),
            characteristicsQuality: Math.min(100, (charCount / 30) * 100),
            confidenceScore: Math.round(avgConfidence * 100),
            contentQuality: Math.min(100, ((titleLength / 60) + (descLength / 2000)) * 50),
            overallEfficiency: Math.round(score)
        };
        return {
            isValid: issues.length === 0,
            score: Math.max(0, score),
            issues: issues,
            suggestions: suggestions,
            detailedMetrics: detailedMetrics
        };
    },
    /**
     * Расчет стоимости обработки
     */
    estimateProcessingCost: function (context) {
        var costs = {
            gpt5_input: 0.01,
            gpt5_output: 0.03,
            gpt41_input: 0.005,
            gpt41_output: 0.015,
            image_processing: 0.002,
            web_search: 0.001 // $0.001 per search query
        };
        var totalCost = 0;
        var breakdown = {};
        if (context.systemType === 'gpt5') {
            // GPT-5 для исследования
            var gpt5Tokens = 6000 + (context.imageCount * 1000);
            breakdown.gpt5_research = (gpt5Tokens / 1000) * (costs.gpt5_input + costs.gpt5_output);
            // GPT-4.1 для характеристик и SEO
            var gpt41Tokens = 8000 + (context.characteristicsCount * 100);
            breakdown.gpt41_analysis = (gpt41Tokens / 1000) * (costs.gpt41_input + costs.gpt41_output);
            // Веб-поиск
            if (context.hasWebSearch) {
                breakdown.web_search = 12 * costs.web_search;
            }
        }
        else {
            // Оптимизированная система
            var totalTokens = 12000 + (context.imageCount * 800);
            breakdown.optimized_system = (totalTokens / 1000) * (costs.gpt41_input + costs.gpt41_output);
        }
        // Обработка изображений
        breakdown.image_processing = context.imageCount * costs.image_processing;
        totalCost = Object.values(breakdown).reduce(function (sum, cost) { return sum + cost; }, 0);
        return {
            estimatedCost: Math.round(totalCost * 100) / 100,
            breakdown: breakdown,
            currency: 'USD'
        };
    },
    /**
     * Получение лимитов категории с типизацией
     */
    getCategoryLimits: function (categoryId) {
        var categoryKey = categoryId.toString();
        var limits = {
            '794': {
                maxTitleLength: 60,
                maxDescriptionLength: 2000,
                categoryName: 'Наушники'
            },
            '5581': {
                maxTitleLength: 60,
                maxDescriptionLength: 2000,
                categoryName: 'Электроника'
            },
            'default': {
                maxTitleLength: 60,
                maxDescriptionLength: 2000,
                categoryName: 'Товар'
            }
        };
        return limits[categoryKey] || limits['default'];
    },
    /**
     * Проверка является ли характеристика пользовательской
     */
    isUserInputCharacteristic: function (characteristicId) {
        return exports.GPT5_CONFIG.USER_INPUT_CHARACTERISTICS.has(characteristicId);
    },
    /**
     * Получение приоритетных характеристик для категории
     */
    getPriorityCharacteristics: function (categoryId) {
        var config = this.getCategoryConfig(categoryId);
        return config.priorityCharacteristics;
    },
    /**
     * Валидация настроек системы
     */
    validateConfig: function () {
        var errors = [];
        var warnings = [];
        // Проверка моделей
        if (!exports.GPT5_CONFIG.MODELS.RESEARCHER) {
            errors.push('Модель исследователя не указана');
        }
        // Проверка лимитов
        if (exports.GPT5_CONFIG.LIMITS.MAX_SEARCH_QUERIES < 5) {
            warnings.push('Мало поисковых запросов для качественного анализа');
        }
        // Проверка категорий
        if (Object.keys(exports.GPT5_CONFIG.SPECIAL_CATEGORIES).length === 0) {
            warnings.push('Нет настроенных специальных категорий');
        }
        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    }
};
exports["default"] = exports.GPT5_CONFIG;
