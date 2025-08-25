"use strict";
// lib/services/simplifiedCharacteristicsSystem.ts
// УПРОЩЕННАЯ СИСТЕМА ТИПИЗАЦИИ - БЕЗ АГРЕССИВНОЙ ОЧИСТКИ
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
exports.__esModule = true;
exports.integratedProcessor = exports.simplifiedCharacteristicsSystem = exports.IntegratedCharacteristicsProcessor = exports.SimplifiedCharacteristicsSystem = void 0;
var SimplifiedCharacteristicsSystem = /** @class */ (function () {
    function SimplifiedCharacteristicsSystem() {
    }
    /**
     * ГЛАВНАЯ ФУНКЦИЯ - упрощенная обработка без агрессивной очистки
     */
    SimplifiedCharacteristicsSystem.prototype.processCharacteristicsWithAI = function (productData, categoryCharacteristics) {
        return __awaiter(this, void 0, Promise, function () {
            var typedCharacteristics, aiResult, processedCharacteristics, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('🎯 УПРОЩЕННАЯ СИСТЕМА: Обработка характеристик без агрессивной очистки');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        typedCharacteristics = this.determineSimpleTypes(categoryCharacteristics);
                        return [4 /*yield*/, this.sendToAIWithTypes(productData, typedCharacteristics)];
                    case 2:
                        aiResult = _a.sent();
                        processedCharacteristics = this.lightProcessing(aiResult.characteristics, typedCharacteristics);
                        // 4. Формируем результат
                        return [2 /*return*/, {
                                characteristics: processedCharacteristics,
                                seoTitle: aiResult.seoTitle || productData.productName,
                                seoDescription: aiResult.seoDescription || productData.productName + " - \u0432\u044B\u0441\u043E\u043A\u043E\u0435 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u043E, \u0431\u044B\u0441\u0442\u0440\u0430\u044F \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0430",
                                totalProcessed: processedCharacteristics.length,
                                confidence: aiResult.confidence || 0.8
                            }];
                    case 3:
                        error_1 = _a.sent();
                        console.error('❌ Ошибка упрощенной системы:', error_1);
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * ПРОСТОЕ определение типов характеристик БЕЗ ИИ
     */
    SimplifiedCharacteristicsSystem.prototype.determineSimpleTypes = function (characteristics) {
        return characteristics.map(function (char) {
            var nameLower = char.name.toLowerCase();
            var detectedType = 'string_only';
            var reasoning = 'По умолчанию - строка';
            // ЖЕСТКО ЗАДАННЫЕ ПРАВИЛА - БЕЗ СЛОЖНОЙ ЛОГИКИ
            // Чистые числа (единица измерения в скобках)
            if (nameLower.includes('(г)') || nameLower.includes('(кг)') ||
                nameLower.includes('(вт)') || nameLower.includes('(в)') ||
                nameLower.includes('(ом)') || nameLower.includes('(гц)') ||
                nameLower.includes('(шт)') || nameLower.includes('граммах')) {
                detectedType = 'pure_number';
                reasoning = 'Единица измерения в названии - число без единиц';
            }
            // Строки с единицами (размеры, время, емкость)
            else if (nameLower.includes('время') ||
                nameLower.includes('высота') || nameLower.includes('ширина') ||
                nameLower.includes('длина') || nameLower.includes('глубина') ||
                nameLower.includes('диаметр') || nameLower.includes('толщина') ||
                nameLower.includes('емкость') || nameLower.includes('гарант')) {
                detectedType = 'string_with_units';
                reasoning = 'Размер/время/емкость - строка с единицами';
            }
            // Текстовые характеристики
            else if (nameLower.includes('цвет') || nameLower.includes('материал') ||
                nameLower.includes('бренд') || nameLower.includes('страна') ||
                nameLower.includes('тип') || nameLower.includes('назначение')) {
                detectedType = 'string_only';
                reasoning = 'Текстовая характеристика';
            }
            return {
                id: char.id,
                name: char.name,
                detectedType: detectedType,
                confidence: 0.9,
                reasoning: reasoning
            };
        });
    };
    /**
     * Отправка в ИИ с четкими инструкциями
     */
    SimplifiedCharacteristicsSystem.prototype.sendToAIWithTypes = function (productData, typedCharacteristics) {
        var _a;
        return __awaiter(this, void 0, Promise, function () {
            var prompt, response, data, result, cleanResult;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        prompt = this.createSimplePrompt(productData, typedCharacteristics);
                        console.log('🤖 Отправляем в ИИ с упрощенными инструкциями...');
                        return [4 /*yield*/, fetch('https://api.anthropic.com/v1/messages', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    model: 'claude-sonnet-4-20250514',
                                    max_tokens: 4000,
                                    messages: [
                                        { role: 'user', content: prompt }
                                    ]
                                })
                            })];
                    case 1:
                        response = _b.sent();
                        return [4 /*yield*/, response.json()];
                    case 2:
                        data = _b.sent();
                        result = (_a = data.content[0]) === null || _a === void 0 ? void 0 : _a.text;
                        if (!result) {
                            throw new Error('Пустой ответ от ИИ');
                        }
                        // Парсим JSON ответ
                        try {
                            cleanResult = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                            return [2 /*return*/, JSON.parse(cleanResult)];
                        }
                        catch (error) {
                            console.error('❌ Ошибка парсинга JSON от ИИ:', error);
                            throw new Error('Некорректный JSON от ИИ');
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * ПРОСТОЙ промпт без сложностей
     */
    SimplifiedCharacteristicsSystem.prototype.createSimplePrompt = function (productData, typedCharacteristics) {
        return "\u041F\u0440\u043E\u0430\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0443\u0439\u0442\u0435 \u0442\u043E\u0432\u0430\u0440 \u0438 \u0437\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438 \u0422\u041E\u0427\u041D\u041E \u0432 \u0443\u043A\u0430\u0437\u0430\u043D\u043D\u044B\u0445 \u0442\u0438\u043F\u0430\u0445.\n\n\u0422\u041E\u0412\u0410\u0420: " + productData.productName + "\n\u0426\u0415\u041D\u0410: " + productData.price + "\u20BD\n" + (productData.referenceUrl ? "\u0421\u0421\u042B\u041B\u041A\u0410: " + productData.referenceUrl : '') + "\n" + (productData.userComments ? "\u041A\u041E\u041C\u041C\u0415\u041D\u0422\u0410\u0420\u0418\u0418: " + productData.userComments : '') + "\n\n\u0425\u0410\u0420\u0410\u041A\u0422\u0415\u0420\u0418\u0421\u0422\u0418\u041A\u0418 \u0414\u041B\u042F \u0417\u0410\u041F\u041E\u041B\u041D\u0415\u041D\u0418\u042F:\n\n" + typedCharacteristics.map(function (char, i) {
            var typeExample = char.detectedType === 'pure_number' ? 'число (например: 350)' :
                char.detectedType === 'string_with_units' ? 'строка с единицами (например: "2 часа")' :
                    'строка (например: "Черный")';
            return i + 1 + ". " + char.name + " (ID: " + char.id + ")\n   \u0422\u0418\u041F: " + char.detectedType.toUpperCase() + "\n   \u0424\u041E\u0420\u041C\u0410\u0422: " + typeExample;
        }).join('\n\n') + "\n\n\u041F\u0420\u0410\u0412\u0418\u041B\u0410:\n1. pure_number - \u0422\u041E\u041B\u042C\u041A\u041E \u0447\u0438\u0441\u043B\u043E \u0431\u0435\u0437 \u0435\u0434\u0438\u043D\u0438\u0446: 350 (\u041D\u0415 \"350 \u0433\")\n2. string_with_units - \u0441\u0442\u0440\u043E\u043A\u0430 \u0441 \u0435\u0434\u0438\u043D\u0438\u0446\u0430\u043C\u0438: \"2 \u0447\u0430\u0441\u0430\" (\u041D\u0415 \u0447\u0438\u0441\u043B\u043E 2)\n3. string_only - \u043E\u0431\u044B\u0447\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \"\u0427\u0435\u0440\u043D\u044B\u0439\"\n\n\u041E\u0422\u0412\u0415\u0422 \u0412 \u0424\u041E\u0420\u041C\u0410\u0422\u0415 JSON:\n{\n  \"characteristics\": [\n    {\n      \"id\": 85,\n      \"name\": \"\u0411\u0440\u0435\u043D\u0434\",\n      \"value\": \"\u043D\u0430\u0439\u0434\u0435\u043D\u043D\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435\",\n      \"confidence\": 0.9,\n      \"source\": \"\u043E\u0442\u043A\u0443\u0434\u0430 \u0432\u0437\u044F\u0442\u043E\"\n    }\n  ],\n  \"seoTitle\": \"SEO \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435\",\n  \"seoDescription\": \"SEO \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435\",\n  \"confidence\": 0.8\n}\n\n\u041D\u0415 \u041C\u0415\u041D\u042F\u0419\u0422\u0415 \u0422\u0418\u041F\u042B! \u041E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0439\u0442\u0435 \u0422\u041E\u0427\u041D\u041E \u043A\u0430\u043A \u0443\u043A\u0430\u0437\u0430\u043D\u043E \u0432\u044B\u0448\u0435.";
    };
    /**
     * ЛЕГКАЯ обработка - минимальные изменения
     */
    SimplifiedCharacteristicsSystem.prototype.lightProcessing = function (aiCharacteristics, typedCharacteristics) {
        console.log('🔧 ЛЕГКАЯ обработка - сохраняем данные ИИ');
        return aiCharacteristics.map(function (aiChar) {
            var typeInfo = typedCharacteristics.find(function (tc) { return tc.id === aiChar.id; });
            if (!typeInfo) {
                console.warn("\u26A0\uFE0F \u0422\u0438\u043F \u0434\u043B\u044F \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438 " + aiChar.id + " \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
                return __assign(__assign({}, aiChar), { type: 'string_only' });
            }
            // МИНИМАЛЬНАЯ валидация - только критичные случаи
            var finalValue = aiChar.value;
            // Только для чистых чисел - убираем очевидный текст
            if (typeInfo.detectedType === 'pure_number' && typeof finalValue === 'string') {
                var numMatch = finalValue.match(/(\d+(?:\.\d+)?)/);
                if (numMatch) {
                    finalValue = parseFloat(numMatch[1]);
                    console.log("\uD83D\uDD22 \u0418\u0437\u0432\u043B\u0435\u043A\u043B\u0438 \u0447\u0438\u0441\u043B\u043E \u0434\u043B\u044F " + aiChar.name + ": \"" + aiChar.value + "\" \u2192 " + finalValue);
                }
            }
            // Для остальных типов - оставляем КАК ЕСТЬ
            console.log("\u2705 \u0421\u043E\u0445\u0440\u0430\u043D\u0438\u043B\u0438 \u0434\u043B\u044F " + aiChar.name + ": \"" + finalValue + "\" (\u0442\u0438\u043F: " + typeInfo.detectedType + ")");
            return {
                id: aiChar.id,
                name: aiChar.name,
                value: finalValue,
                type: typeInfo.detectedType,
                confidence: aiChar.confidence || 0.8,
                source: aiChar.source || 'ИИ анализ'
            };
        });
    };
    /**
     * Получение типа характеристики по ID
     */
    SimplifiedCharacteristicsSystem.prototype.getCharacteristicType = function (characteristicId) {
        // Жестко заданные типы для известных ID
        var knownTypes = {
            // Чистые числа
            89008: 'pure_number',
            5478: 'pure_number',
            5479: 'pure_number',
            63292: 'pure_number',
            65666: 'pure_number',
            65667: 'pure_number',
            // Строки с единицами
            13491: 'string_with_units',
            90746: 'string_with_units',
            90878: 'string_with_units',
            90630: 'string_with_units',
            90607: 'string_with_units',
            90608: 'string_with_units',
            // Строки
            85: 'string_only',
            91: 'string_only',
            14: 'string_only',
            372: 'string_only' // Материал
        };
        return knownTypes[characteristicId] || 'string_only';
    };
    /**
     * Форматирование для WB API
     */
    SimplifiedCharacteristicsSystem.prototype.formatForWBAPI = function (characteristics) {
        console.log('📦 Форматирование для WB API - БЕЗ агрессивной очистки');
        return characteristics.map(function (char) {
            var wbValue = char.value;
            // Только базовая нормализация
            if (char.type === 'pure_number') {
                // Убеждаемся что это число
                if (typeof wbValue === 'string') {
                    var num = parseFloat(wbValue.replace(/[^\d.,]/g, '').replace(',', '.'));
                    wbValue = isNaN(num) ? 1 : num;
                }
                console.log("\uD83D\uDD22 WB \u0447\u0438\u0441\u043B\u043E " + char.name + ": " + wbValue);
            }
            else {
                // Для строк - только trim
                wbValue = String(wbValue).trim();
                console.log("\uD83D\uDCDD WB \u0441\u0442\u0440\u043E\u043A\u0430 " + char.name + ": \"" + wbValue + "\"");
            }
            return {
                id: char.id,
                name: char.name,
                value: wbValue
            };
        });
    };
    /**
     * Проверка заполненности
     */
    SimplifiedCharacteristicsSystem.prototype.validateCharacteristics = function (characteristics, allCharacteristics) {
        var filled = characteristics.length;
        var total = allCharacteristics.length;
        var fillRate = Math.round((filled / total) * 100);
        var requiredChars = allCharacteristics.filter(function (c) { return c.isRequired; });
        var filledRequiredIds = characteristics.map(function (c) { return c.id; });
        var missingRequired = requiredChars.filter(function (rc) { return !filledRequiredIds.includes(rc.id); });
        var warnings = [];
        if (fillRate < 50) {
            warnings.push("\u041D\u0438\u0437\u043A\u0430\u044F \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u043E\u0441\u0442\u044C: " + fillRate + "%");
        }
        if (missingRequired.length > 0) {
            warnings.push("\u041D\u0435 \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u043E " + missingRequired.length + " \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A");
        }
        return { fillRate: fillRate, missingRequired: missingRequired, warnings: warnings };
    };
    return SimplifiedCharacteristicsSystem;
}());
exports.SimplifiedCharacteristicsSystem = SimplifiedCharacteristicsSystem;
// Интеграция с существующей агентной системой
var IntegratedCharacteristicsProcessor = /** @class */ (function () {
    function IntegratedCharacteristicsProcessor() {
        this.simplifiedSystem = new SimplifiedCharacteristicsSystem();
    }
    /**
     * Обработка результатов агентной системы БЕЗ потери данных
     */
    IntegratedCharacteristicsProcessor.prototype.processAgentResults = function (agentResult, categoryCharacteristics) {
        return __awaiter(this, void 0, Promise, function () {
            var typedCharacteristics_1, processedChars;
            return __generator(this, function (_a) {
                console.log('🔄 ИНТЕГРАЦИЯ: Обработка результатов агентной системы');
                try {
                    typedCharacteristics_1 = this.simplifiedSystem['determineSimpleTypes'](categoryCharacteristics);
                    processedChars = agentResult.finalResult.characteristics.map(function (agentChar) {
                        var typeInfo = typedCharacteristics_1.find(function (tc) { return tc.id === agentChar.id; });
                        var categoryChar = categoryCharacteristics.find(function (cc) { return cc.id === agentChar.id; });
                        if (!typeInfo || !categoryChar) {
                            console.warn("\u26A0\uFE0F \u0425\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0430 " + agentChar.id + " \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u0432 \u0442\u0438\u043F\u0430\u0445 \u0438\u043B\u0438 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438");
                            return null;
                        }
                        // СОХРАНЯЕМ значение от агента КАК ЕСТЬ
                        var finalValue = agentChar.value;
                        // Только критичная коррекция для чисел
                        if (typeInfo.detectedType === 'pure_number' && typeof finalValue === 'string') {
                            var numMatch = String(finalValue).match(/(\d+(?:\.\d+)?)/);
                            if (numMatch) {
                                finalValue = parseFloat(numMatch[1]);
                                console.log("\uD83D\uDD22 \u041A\u043E\u0440\u0440\u0435\u043A\u0446\u0438\u044F \u0447\u0438\u0441\u043B\u0430 " + agentChar.name + ": \"" + agentChar.value + "\" \u2192 " + finalValue);
                            }
                        }
                        console.log("\u2705 \u0421\u041E\u0425\u0420\u0410\u041D\u0418\u041B\u0418 \u043E\u0442 \u0430\u0433\u0435\u043D\u0442\u0430 " + agentChar.name + ": \"" + finalValue + "\" (" + typeInfo.detectedType + ")");
                        return {
                            id: agentChar.id,
                            name: categoryChar.name,
                            value: finalValue,
                            type: typeInfo.detectedType,
                            confidence: agentChar.confidence || 0.8,
                            source: agentChar.source || 'агентная система'
                        };
                    }).filter(Boolean);
                    return [2 /*return*/, {
                            characteristics: processedChars,
                            seoTitle: agentResult.finalResult.seoTitle || 'Товар',
                            seoDescription: agentResult.finalResult.seoDescription || 'Описание товара',
                            totalProcessed: processedChars.length,
                            confidence: agentResult.confidence || 0.8
                        }];
                }
                catch (error) {
                    console.error('❌ Ошибка интеграции агентных результатов:', error);
                    throw error;
                }
                return [2 /*return*/];
            });
        });
    };
    return IntegratedCharacteristicsProcessor;
}());
exports.IntegratedCharacteristicsProcessor = IntegratedCharacteristicsProcessor;
exports.simplifiedCharacteristicsSystem = new SimplifiedCharacteristicsSystem();
exports.integratedProcessor = new IntegratedCharacteristicsProcessor();
