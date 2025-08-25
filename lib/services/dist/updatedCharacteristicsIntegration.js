"use strict";
// lib/services/updatedCharacteristicsIntegration.ts
// ОБНОВЛЕННАЯ ИНТЕГРАЦИЯ С УПРОЩЕННОЙ СИСТЕМОЙ
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.CharacteristicsController = exports.updatedCharacteristicsIntegration = exports.UpdatedCharacteristicsIntegration = void 0;
var agentSystem_1 = require("./agentSystem");
var simplifiedCharacteristicsSystem_1 = require("./simplifiedCharacteristicsSystem");
var UpdatedCharacteristicsIntegration = /** @class */ (function () {
    function UpdatedCharacteristicsIntegration() {
    }
    /**
     * ГЛАВНАЯ ФУНКЦИЯ - использует агентную систему + упрощенную типизацию
     */
    UpdatedCharacteristicsIntegration.prototype.processProductCharacteristics = function (input) {
        var _a;
        return __awaiter(this, void 0, Promise, function () {
            var startTime, categoryCharacteristics, filteredCharacteristics, agentContext, agentResults, processedResults, enrichedCharacteristics, validation, processingTime, fillPercentage, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        startTime = Date.now();
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 5, , 6]);
                        console.log("\uD83D\uDE80 \u041E\u0411\u041D\u041E\u0412\u041B\u0415\u041D\u041D\u0410\u042F \u0421\u0418\u0421\u0422\u0415\u041C\u0410: \u041E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0430 \"" + input.productName + "\"");
                        return [4 /*yield*/, this.getCategoryCharacteristics(input.categoryId)];
                    case 2:
                        categoryCharacteristics = _b.sent();
                        if (categoryCharacteristics.length === 0) {
                            throw new Error('Характеристики категории не найдены');
                        }
                        console.log("\uD83D\uDCCB \u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E " + categoryCharacteristics.length + " \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438");
                        filteredCharacteristics = this.filterSystemCharacteristics(categoryCharacteristics);
                        console.log("\uD83D\uDD0D \u041E\u0442\u0444\u0438\u043B\u044C\u0442\u0440\u043E\u0432\u0430\u043D\u043E \u0434\u043E " + filteredCharacteristics.length + " \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A");
                        agentContext = this.prepareAgentContext(input, filteredCharacteristics);
                        // 4. ЗАПУСКАЕМ АГЕНТНУЮ СИСТЕМУ
                        console.log('🤖 Запуск агентной системы...');
                        return [4 /*yield*/, agentSystem_1.agentSystem.analyzeProductWithAgents(agentContext)];
                    case 3:
                        agentResults = _b.sent();
                        if (!agentResults.finalResult) {
                            throw new Error('Агентная система не вернула результатов');
                        }
                        console.log("\u2705 \u0410\u0433\u0435\u043D\u0442\u043D\u0430\u044F \u0441\u0438\u0441\u0442\u0435\u043C\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430 \u0437\u0430 " + agentResults.totalTime + "\u043C\u0441");
                        console.log("\uD83D\uDCCA \u0410\u0433\u0435\u043D\u0442\u0430\u043C\u0438 \u043D\u0430\u0439\u0434\u0435\u043D\u043E \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A: " + (((_a = agentResults.finalResult.characteristics) === null || _a === void 0 ? void 0 : _a.length) || 0));
                        // 5. ОБРАБАТЫВАЕМ РЕЗУЛЬТАТЫ БЕЗ ПОТЕРИ ДАННЫХ
                        console.log('🔄 Интеграция результатов агентной системы...');
                        return [4 /*yield*/, simplifiedCharacteristicsSystem_1.integratedProcessor.processAgentResults(agentResults, filteredCharacteristics)];
                    case 4:
                        processedResults = _b.sent();
                        enrichedCharacteristics = this.addMissingRequired(processedResults.characteristics, filteredCharacteristics);
                        validation = this.validateResults(enrichedCharacteristics, filteredCharacteristics);
                        processingTime = Date.now() - startTime;
                        fillPercentage = Math.round((enrichedCharacteristics.length / filteredCharacteristics.length) * 100);
                        console.log("\u2705 \u041E\u0411\u041D\u041E\u0412\u041B\u0415\u041D\u041D\u0410\u042F \u0421\u0418\u0421\u0422\u0415\u041C\u0410 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430 \u0437\u0430 " + processingTime + "\u043C\u0441");
                        console.log("\uD83D\uDCCA \u0417\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u043E: " + enrichedCharacteristics.length + "/" + filteredCharacteristics.length + " (" + fillPercentage + "%)");
                        console.log("\uD83C\uDFAF \u0423\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0441\u0442\u044C: " + Math.round(processedResults.confidence * 100) + "%");
                        return [2 /*return*/, {
                                characteristics: enrichedCharacteristics,
                                seoTitle: processedResults.seoTitle,
                                seoDescription: processedResults.seoDescription,
                                metadata: {
                                    totalProcessed: enrichedCharacteristics.length,
                                    fillPercentage: fillPercentage,
                                    processingTime: processingTime,
                                    confidence: processedResults.confidence,
                                    systemUsed: 'Агентная система + Упрощенная типизация'
                                },
                                warnings: validation.warnings
                            }];
                    case 5:
                        error_1 = _b.sent();
                        console.error('❌ Ошибка обновленной системы:', error_1);
                        throw new Error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0438: " + (error_1 instanceof Error ? error_1.message : 'Неизвестная ошибка'));
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Подготовка контекста для агентной системы
     */
    UpdatedCharacteristicsIntegration.prototype.prepareAgentContext = function (input, characteristics) {
        // Получаем информацию о категории
        var categoryInfo = this.getCategoryInfo(input.categoryId);
        return {
            productId: input.productId,
            productName: input.productName,
            categoryId: input.categoryId,
            categoryInfo: {
                id: categoryInfo.id,
                name: categoryInfo.name,
                parentName: categoryInfo.parentName,
                characteristics: characteristics
            },
            images: input.productImages || [],
            referenceUrl: input.referenceUrl,
            price: input.price,
            dimensions: input.dimensions || {},
            packageContents: input.packageContents || '',
            userComments: input.userComments,
            additionalData: {
                additionalCharacteristics: input.additionalCharacteristics || []
            }
        };
    };
    /**
     * Фильтрация системных характеристик
     */
    UpdatedCharacteristicsIntegration.prototype.filterSystemCharacteristics = function (characteristics) {
        var systemIds = new Set([
            15001135,
            15001136,
            15001137,
            15001138,
            15001405,
            15001650,
            15001706,
            14177453,
            15000001 // ТНВЭД
        ]);
        return characteristics.filter(function (char) { return !systemIds.has(char.id); });
    };
    /**
     * Добавление обязательных характеристик
     */
    UpdatedCharacteristicsIntegration.prototype.addMissingRequired = function (currentCharacteristics, allCharacteristics) {
        var currentIds = new Set(currentCharacteristics.map(function (c) { return c.id; }));
        var result = __spreadArrays(currentCharacteristics);
        // Обязательные характеристики
        var requiredDefaults = [
            { id: 85, name: 'Бренд', value: 'OEM' },
            { id: 91, name: 'Страна производства', value: 'Китай' }
        ];
        var _loop_1 = function (required) {
            if (!currentIds.has(required.id)) {
                var categoryChar = allCharacteristics.find(function (c) { return c.id === required.id; });
                if (categoryChar) {
                    result.push({
                        id: required.id,
                        name: required.name,
                        value: required.value,
                        confidence: 0.8,
                        source: 'автоматическое добавление'
                    });
                    console.log("\u2795 \u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0430 \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u0430\u044F \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0430: " + required.name + " = \"" + required.value + "\"");
                }
            }
        };
        for (var _i = 0, requiredDefaults_1 = requiredDefaults; _i < requiredDefaults_1.length; _i++) {
            var required = requiredDefaults_1[_i];
            _loop_1(required);
        }
        return result;
    };
    /**
     * Валидация результатов
     */
    UpdatedCharacteristicsIntegration.prototype.validateResults = function (characteristics, allCharacteristics) {
        var warnings = [];
        var fillPercentage = (characteristics.length / allCharacteristics.length) * 100;
        if (fillPercentage < 30) {
            warnings.push("\u041D\u0438\u0437\u043A\u043E\u0435 \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A: " + Math.round(fillPercentage) + "%");
        }
        var lowConfidenceCount = characteristics.filter(function (c) { return c.confidence < 0.6; }).length;
        if (lowConfidenceCount > characteristics.length * 0.3) {
            warnings.push("\u041C\u043D\u043E\u0433\u043E \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A \u0441 \u043D\u0438\u0437\u043A\u043E\u0439 \u0443\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0441\u0442\u044C\u044E: " + lowConfidenceCount);
        }
        return { warnings: warnings };
    };
    /**
     * Получение характеристик категории (заглушка)
     */
    UpdatedCharacteristicsIntegration.prototype.getCategoryCharacteristics = function (categoryId) {
        return __awaiter(this, void 0, Promise, function () {
            return __generator(this, function (_a) {
                // В реальном приложении здесь будет вызов к БД
                console.log("\uD83D\uDCCB \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A \u0434\u043B\u044F \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438 " + categoryId);
                // Возвращаем типичный набор характеристик
                return [2 /*return*/, [
                        {
                            id: 85,
                            name: "Бренд",
                            type: "string",
                            isRequired: true,
                            values: [{ value: "OEM" }]
                        },
                        {
                            id: 91,
                            name: "Страна производства",
                            type: "string",
                            isRequired: true,
                            values: [{ value: "Китай" }, { value: "Россия" }]
                        },
                        {
                            id: 89008,
                            name: "Вес товара без упаковки (г)",
                            type: "number",
                            isRequired: false
                        },
                        {
                            id: 90630,
                            name: "Высота предмета",
                            type: "string",
                            isRequired: false
                        },
                        {
                            id: 90607,
                            name: "Ширина предмета",
                            type: "string",
                            isRequired: false
                        },
                        {
                            id: 90608,
                            name: "Длина предмета",
                            type: "string",
                            isRequired: false
                        },
                        {
                            id: 13491,
                            name: "Время зарядки",
                            type: "string",
                            isRequired: false
                        },
                        {
                            id: 90746,
                            name: "Время работы от аккумулятора, до",
                            type: "string",
                            isRequired: false
                        },
                        {
                            id: 90878,
                            name: "Емкость аккумулятора",
                            type: "string",
                            isRequired: false
                        },
                        {
                            id: 63292,
                            name: "Импеданс",
                            type: "number",
                            isRequired: false
                        },
                        {
                            id: 65666,
                            name: "Минимальная воспроизводимая частота",
                            type: "number",
                            isRequired: false
                        },
                        {
                            id: 65667,
                            name: "Максимальная воспроизводимая частота",
                            type: "number",
                            isRequired: false
                        }
                    ]];
            });
        });
    };
    /**
     * Получение информации о категории (заглушка)
     */
    UpdatedCharacteristicsIntegration.prototype.getCategoryInfo = function (categoryId) {
        console.log("\uD83D\uDCC2 \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u0438 \u043E \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438 " + categoryId);
        return {
            id: categoryId,
            name: "Электроника",
            parentName: "Техника"
        };
    };
    /**
     * Форматирование для WB API
     */
    UpdatedCharacteristicsIntegration.prototype.formatForWildberries = function (characteristics) {
        var _this = this;
        console.log('📦 Форматирование для WB API...');
        return characteristics.map(function (char) {
            // Используем упрощенную систему для форматирования
            var type = _this.getCharacteristicType(char.id);
            var wbValue = char.value;
            if (type === 'pure_number') {
                // Для чисел - убеждаемся что это число
                if (typeof wbValue === 'string') {
                    var numMatch = wbValue.match(/(\d+(?:\.\d+)?)/);
                    wbValue = numMatch ? parseFloat(numMatch[1]) : 1;
                }
                console.log("\uD83D\uDD22 WB API \u0447\u0438\u0441\u043B\u043E " + char.name + ": " + wbValue);
            }
            else {
                // Для строк - только базовая очистка
                wbValue = String(wbValue).trim();
                if (!wbValue) {
                    wbValue = type === 'string_with_units' ? 'не указано' : 'Стандартный';
                }
                console.log("\uD83D\uDCDD WB API \u0441\u0442\u0440\u043E\u043A\u0430 " + char.name + ": \"" + wbValue + "\"");
            }
            return {
                id: char.id,
                value: wbValue
            };
        });
    };
    /**
     * Простое определение типа характеристики
     */
    UpdatedCharacteristicsIntegration.prototype.getCharacteristicType = function (characteristicId) {
        // Известные типы для основных характеристик
        var knownTypes = {
            // Чистые числа (единица в названии характеристики)
            89008: 'pure_number',
            5478: 'pure_number',
            5479: 'pure_number',
            63292: 'pure_number',
            65666: 'pure_number',
            65667: 'pure_number',
            // Строки с единицами (размеры, время, емкость)
            13491: 'string_with_units',
            90746: 'string_with_units',
            90878: 'string_with_units',
            90630: 'string_with_units',
            90607: 'string_with_units',
            90608: 'string_with_units',
            90652: 'string_with_units',
            // Текстовые строки
            85: 'string_only',
            91: 'string_only',
            14: 'string_only',
            372: 'string_only',
            6234: 'string_only' // Тип
        };
        return knownTypes[characteristicId] || 'string_only';
    };
    /**
     * Получение статистики обработки
     */
    UpdatedCharacteristicsIntegration.prototype.getProcessingStatistics = function (result, totalAvailable) {
        var avgConfidence = result.characteristics.length > 0
            ? result.characteristics.reduce(function (sum, char) { return sum + char.confidence; }, 0) / result.characteristics.length
            : 0;
        return {
            summary: "\u041E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u043E " + result.characteristics.length + " \u0438\u0437 " + totalAvailable + " \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A (" + result.metadata.fillPercentage + "%)",
            details: {
                processed: result.characteristics.length,
                available: totalAvailable,
                fillRate: result.metadata.fillPercentage + "%",
                avgConfidence: Math.round(avgConfidence * 100) + "%",
                processingTime: result.metadata.processingTime + "\u043C\u0441"
            }
        };
    };
    return UpdatedCharacteristicsIntegration;
}());
exports.UpdatedCharacteristicsIntegration = UpdatedCharacteristicsIntegration;
// Экспорт singleton
exports.updatedCharacteristicsIntegration = new UpdatedCharacteristicsIntegration();
// Пример использования
var CharacteristicsController = /** @class */ (function () {
    function CharacteristicsController() {
    }
    /**
     * API endpoint для обработки характеристик товара
     */
    CharacteristicsController.prototype.processProduct = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, productId, productName, productImages, categoryId, packageContents, referenceUrl, price, dimensions, userComments, additionalCharacteristics, result, wbFormattedCharacteristics, statistics, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        _a = req.body, productId = _a.productId, productName = _a.productName, productImages = _a.productImages, categoryId = _a.categoryId, packageContents = _a.packageContents, referenceUrl = _a.referenceUrl, price = _a.price, dimensions = _a.dimensions, userComments = _a.userComments, additionalCharacteristics = _a.additionalCharacteristics;
                        console.log("\uD83C\uDFAF API: \u041E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0430 \u0442\u043E\u0432\u0430\u0440\u0430 \"" + productName + "\"");
                        // Валидация входных данных
                        if (!productName || !categoryId || !price) {
                            return [2 /*return*/, res.status(400).json({
                                    error: 'Отсутствуют обязательные поля: productName, categoryId, price'
                                })];
                        }
                        return [4 /*yield*/, exports.updatedCharacteristicsIntegration.processProductCharacteristics({
                                productId: productId || "temp-" + Date.now(),
                                productName: productName,
                                productImages: productImages || [],
                                categoryId: categoryId,
                                packageContents: packageContents,
                                referenceUrl: referenceUrl,
                                price: price,
                                dimensions: dimensions || {},
                                userComments: userComments,
                                additionalCharacteristics: additionalCharacteristics || []
                            })];
                    case 1:
                        result = _b.sent();
                        wbFormattedCharacteristics = exports.updatedCharacteristicsIntegration.formatForWildberries(result.characteristics);
                        statistics = exports.updatedCharacteristicsIntegration.getProcessingStatistics(result, 100 // TODO: получать реальное количество из БД
                        );
                        console.log("\u2705 API: " + statistics.summary);
                        return [2 /*return*/, res.json({
                                success: true,
                                data: {
                                    characteristics: result.characteristics,
                                    wbFormattedCharacteristics: wbFormattedCharacteristics,
                                    seoTitle: result.seoTitle,
                                    seoDescription: result.seoDescription,
                                    metadata: result.metadata,
                                    statistics: statistics.details
                                },
                                warnings: result.warnings
                            })];
                    case 2:
                        error_2 = _b.sent();
                        console.error('❌ API: Ошибка обработки товара:', error_2);
                        return [2 /*return*/, res.status(500).json({
                                success: false,
                                error: error_2 instanceof Error ? error_2.message : 'Внутренняя ошибка сервера'
                            })];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * API endpoint для получения типов характеристик
     */
    CharacteristicsController.prototype.getCharacteristicTypes = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var categoryId, characteristics, typedCharacteristics, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        categoryId = req.params.categoryId;
                        console.log("\uD83D\uDCCB API: \u041F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0435 \u0442\u0438\u043F\u043E\u0432 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A \u0434\u043B\u044F \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438 " + categoryId);
                        return [4 /*yield*/, exports.updatedCharacteristicsIntegration['getCategoryCharacteristics'](parseInt(categoryId))];
                    case 1:
                        characteristics = _a.sent();
                        typedCharacteristics = characteristics.map(function (char) { return ({
                            id: char.id,
                            name: char.name,
                            type: exports.updatedCharacteristicsIntegration['getCharacteristicType'](char.id),
                            isRequired: char.isRequired || false,
                            description: char.description || ''
                        }); });
                        return [2 /*return*/, res.json({
                                success: true,
                                data: {
                                    categoryId: parseInt(categoryId),
                                    characteristics: typedCharacteristics,
                                    total: typedCharacteristics.length
                                }
                            })];
                    case 2:
                        error_3 = _a.sent();
                        console.error('❌ API: Ошибка получения типов характеристик:', error_3);
                        return [2 /*return*/, res.status(500).json({
                                success: false,
                                error: error_3 instanceof Error ? error_3.message : 'Ошибка получения типов'
                            })];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return CharacteristicsController;
}());
exports.CharacteristicsController = CharacteristicsController;
