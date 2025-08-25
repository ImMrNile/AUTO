"use strict";
// lib/services/optimizedGPT5MiniSystem.ts - ОПТИМИЗИРОВАННАЯ СИСТЕМА С GPT-5-MINI И GPT-4.1
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
exports.optimizedGPT5MiniSystem = exports.OptimizedGPT5MiniSystem = exports.AVAILABLE_MODELS = void 0;
var openai_1 = require("openai");
// Конфигурация доступных моделей из вашего проекта
exports.AVAILABLE_MODELS = {
    // Основные рабочие модели
    GPT5_MINI: 'gpt-5-mini',
    GPT5_MINI_DATED: 'gpt-5-mini-2025-08-07',
    GPT4_1: 'gpt-4.1',
    // Дополнительные модели (если понадобятся)
    GPT5_NANO: 'gpt-5-nano',
    GPT5_NANO_DATED: 'gpt-5-nano-2025-08-07',
    GPT5_FULL: 'gpt-5',
    GPT5_DATED: 'gpt-5-2025-08-07',
    GPT5_CHAT: 'gpt-5-chat-latest',
    // Модель для изображений
    DALL_E: 'dall-e-2',
    // Аудио модель
    GPT4O_AUDIO: 'gpt-4o-mini-audio-preview' // Аудио превью
};
// Стоимость использования (за 1M токенов)
var MODEL_PRICING = {
    'gpt-5-mini': { input: 0.25, output: 2.00 },
    'gpt-4.1': { input: 2.00, output: 8.00 },
    'gpt-5-nano': { input: 0.05, output: 0.40 },
    'gpt-5': { input: 1.25, output: 10.00 }
};
// Возможности моделей
var MODEL_CAPABILITIES = {
    'gpt-5-mini': {
        maxInputTokens: 272000,
        maxOutputTokens: 128000,
        supportsJsonMode: true,
        supportsImages: true,
        supportsFunctionCalling: true,
        bestFor: 'Исследование товаров, поиск информации, анализ изображений'
    },
    'gpt-4.1': {
        maxInputTokens: 1000000,
        maxOutputTokens: 32000,
        supportsJsonMode: true,
        supportsImages: true,
        supportsFunctionCalling: true,
        bestFor: 'Детальный анализ характеристик, SEO оптимизация, работа с большими данными'
    }
};
var OptimizedGPT5MiniSystem = /** @class */ (function () {
    function OptimizedGPT5MiniSystem() {
        this.maxRetries = 3;
        this.timeout = 120000;
        var apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY не найден в переменных окружения');
        }
        this.openai = new openai_1["default"]({ apiKey: apiKey });
        console.log('🚀 Инициализация системы с GPT-5-mini и GPT-4.1');
        console.log("\uD83D\uDCCA GPT-5-mini: " + MODEL_CAPABILITIES['gpt-5-mini'].maxInputTokens + " \u0442\u043E\u043A\u0435\u043D\u043E\u0432, $" + MODEL_PRICING['gpt-5-mini'].input + "/$" + MODEL_PRICING['gpt-5-mini'].output + " \u0437\u0430 1M");
        console.log("\uD83D\uDCCA GPT-4.1: " + MODEL_CAPABILITIES['gpt-4.1'].maxInputTokens + " \u0442\u043E\u043A\u0435\u043D\u043E\u0432, $" + MODEL_PRICING['gpt-4.1'].input + "/$" + MODEL_PRICING['gpt-4.1'].output + " \u0437\u0430 1M");
    }
    /**
     * ГЛАВНАЯ ФУНКЦИЯ - полный анализ товара с 2 моделями
     */
    OptimizedGPT5MiniSystem.prototype.analyzeProduct = function (context) {
        var _a;
        return __awaiter(this, void 0, Promise, function () {
            var startTime, phase1Result, phase2Result, phase3Result, totalTime, totalCost, avgConfidence, finalResult, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        startTime = Date.now();
                        console.log("\n\uD83C\uDFAF \u0410\u041D\u0410\u041B\u0418\u0417 \u0422\u041E\u0412\u0410\u0420\u0410: " + context.productName);
                        console.log("\uD83D\uDCC2 \u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F: " + context.categoryInfo.name + " (ID: " + context.categoryId + ")");
                        console.log("\uD83D\uDCB0 \u0426\u0435\u043D\u0430: " + context.price + "\u20BD");
                        console.log("\uD83D\uDDBC\uFE0F \u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439: " + context.images.length);
                        console.log("\uD83D\uDD17 \u0420\u0435\u0444\u0435\u0440\u0435\u043D\u0441: " + (context.referenceUrl ? 'ДА' : 'НЕТ'));
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 5, , 6]);
                        // ФАЗА 1: GPT-5-mini - Исследование и поиск
                        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                        console.log('🔍 ФАЗА 1: GPT-5-mini - Исследование товара');
                        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                        return [4 /*yield*/, this.runPhase1_GPT5MiniResearch(context)];
                    case 2:
                        phase1Result = _b.sent();
                        if (!phase1Result.success) {
                            throw new Error("\u0424\u0430\u0437\u0430 1 failed: " + phase1Result.error);
                        }
                        // ФАЗА 2: GPT-4.1 - Анализ характеристик
                        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                        console.log('📊 ФАЗА 2: GPT-4.1 - Анализ характеристик');
                        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                        return [4 /*yield*/, this.runPhase2_GPT41Characteristics(context, phase1Result.data)];
                    case 3:
                        phase2Result = _b.sent();
                        if (!phase2Result.success) {
                            throw new Error("\u0424\u0430\u0437\u0430 2 failed: " + phase2Result.error);
                        }
                        // ФАЗА 3: GPT-4.1 - SEO оптимизация
                        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                        console.log('✍️ ФАЗА 3: GPT-4.1 - SEO оптимизация');
                        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                        return [4 /*yield*/, this.runPhase3_GPT41SEO(context, phase1Result.data, phase2Result.data)];
                    case 4:
                        phase3Result = _b.sent();
                        if (!phase3Result.success) {
                            throw new Error("\u0424\u0430\u0437\u0430 3 failed: " + phase3Result.error);
                        }
                        totalTime = Date.now() - startTime;
                        totalCost = this.calculateTotalCost([phase1Result, phase2Result, phase3Result]);
                        avgConfidence = (phase1Result.confidence + phase2Result.confidence + phase3Result.confidence) / 3;
                        finalResult = this.mergeFinalResults(phase1Result.data, phase2Result.data, phase3Result.data);
                        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                        console.log('✅ АНАЛИЗ ЗАВЕРШЕН');
                        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                        console.log("\u23F1\uFE0F \u041E\u0431\u0449\u0435\u0435 \u0432\u0440\u0435\u043C\u044F: " + totalTime + "\u043C\u0441");
                        console.log("\uD83D\uDCB5 \u041E\u0431\u0449\u0430\u044F \u0441\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C: $" + totalCost.toFixed(4));
                        console.log("\uD83D\uDCCA \u0425\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u043E: " + (((_a = finalResult.characteristics) === null || _a === void 0 ? void 0 : _a.length) || 0));
                        console.log("\uD83C\uDFAF \u0421\u0440\u0435\u0434\u043D\u044F\u044F \u0443\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0441\u0442\u044C: " + Math.round(avgConfidence * 100) + "%");
                        return [2 /*return*/, {
                                phase1: phase1Result,
                                phase2: phase2Result,
                                phase3: phase3Result,
                                finalResult: finalResult,
                                totalTime: totalTime,
                                totalCost: totalCost,
                                confidence: avgConfidence
                            }];
                    case 5:
                        error_1 = _b.sent();
                        console.error('❌ Ошибка системы:', error_1);
                        throw error_1;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * ФАЗА 1: GPT-5-mini - Исследование товара
     */
    OptimizedGPT5MiniSystem.prototype.runPhase1_GPT5MiniResearch = function (context) {
        var _a, _b, _c;
        return __awaiter(this, void 0, Promise, function () {
            var startTime, model, prompt, messages, response, result, parsedResult, processingTime, tokensUsed, cost, error_2;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        startTime = Date.now();
                        model = exports.AVAILABLE_MODELS.GPT5_MINI;
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 4, , 5]);
                        console.log("\uD83E\uDD16 \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u043C\u043E\u0434\u0435\u043B\u044C: " + model);
                        prompt = this.createGPT5MiniResearchPrompt(context);
                        return [4 /*yield*/, this.prepareMessagesWithImages(prompt, context.images)];
                    case 2:
                        messages = _d.sent();
                        return [4 /*yield*/, this.openai.chat.completions.create({
                                model: model,
                                messages: messages,
                                temperature: 1,
                                max_completion_tokens: 8000,
                                response_format: { type: "json_object" }
                            })];
                    case 3:
                        response = _d.sent();
                        result = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
                        if (!result) {
                            throw new Error('Пустой ответ от GPT-5-mini');
                        }
                        parsedResult = JSON.parse(result);
                        processingTime = Date.now() - startTime;
                        tokensUsed = ((_c = response.usage) === null || _c === void 0 ? void 0 : _c.total_tokens) || 0;
                        cost = this.calculateCost(model, response.usage);
                        console.log("\u2705 GPT-5-mini \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0430 \u0438\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435 \u0437\u0430 " + processingTime + "\u043C\u0441");
                        console.log("\uD83D\uDCCA \u0422\u043E\u043A\u0435\u043D\u043E\u0432 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u043E: " + tokensUsed);
                        console.log("\uD83D\uDCB5 \u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C: $" + cost.toFixed(4));
                        return [2 /*return*/, {
                                success: true,
                                data: parsedResult,
                                confidence: parsedResult.confidence || 0.9,
                                processingTime: processingTime,
                                tokensUsed: tokensUsed,
                                modelUsed: model,
                                cost: cost
                            }];
                    case 4:
                        error_2 = _d.sent();
                        console.error('❌ Ошибка GPT-5-mini:', error_2);
                        return [2 /*return*/, {
                                success: false,
                                error: error_2 instanceof Error ? error_2.message : 'Неизвестная ошибка',
                                confidence: 0,
                                processingTime: Date.now() - startTime,
                                modelUsed: model,
                                cost: 0
                            }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * ФАЗА 2: GPT-4.1 - Анализ характеристик
     */
    OptimizedGPT5MiniSystem.prototype.runPhase2_GPT41Characteristics = function (context, researchData) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, Promise, function () {
            var startTime, model, prompt, response, result, parsedResult, processingTime, tokensUsed, cost, error_3;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        startTime = Date.now();
                        model = exports.AVAILABLE_MODELS.GPT4_1;
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 3, , 4]);
                        console.log("\uD83E\uDD16 \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u043C\u043E\u0434\u0435\u043B\u044C: " + model);
                        prompt = this.createGPT41CharacteristicsPrompt(context, researchData);
                        return [4 /*yield*/, this.openai.chat.completions.create({
                                model: model,
                                messages: [{ role: 'user', content: prompt }],
                                temperature: 0.2,
                                max_completion_tokens: 12000,
                                response_format: { type: "json_object" }
                            })];
                    case 2:
                        response = _e.sent();
                        result = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
                        if (!result) {
                            throw new Error('Пустой ответ от GPT-4.1');
                        }
                        parsedResult = JSON.parse(result);
                        processingTime = Date.now() - startTime;
                        tokensUsed = ((_c = response.usage) === null || _c === void 0 ? void 0 : _c.total_tokens) || 0;
                        cost = this.calculateCost(model, response.usage);
                        console.log("\u2705 GPT-4.1 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0430 \u0430\u043D\u0430\u043B\u0438\u0437 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A \u0437\u0430 " + processingTime + "\u043C\u0441");
                        console.log("\uD83D\uDCCA \u0425\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A \u0441\u043E\u0437\u0434\u0430\u043D\u043E: " + (((_d = parsedResult.characteristics) === null || _d === void 0 ? void 0 : _d.length) || 0));
                        console.log("\uD83D\uDCB5 \u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C: $" + cost.toFixed(4));
                        return [2 /*return*/, {
                                success: true,
                                data: parsedResult,
                                confidence: parsedResult.confidence || 0.85,
                                processingTime: processingTime,
                                tokensUsed: tokensUsed,
                                modelUsed: model,
                                cost: cost
                            }];
                    case 3:
                        error_3 = _e.sent();
                        console.error('❌ Ошибка GPT-4.1:', error_3);
                        return [2 /*return*/, {
                                success: false,
                                error: error_3 instanceof Error ? error_3.message : 'Неизвестная ошибка',
                                confidence: 0,
                                processingTime: Date.now() - startTime,
                                modelUsed: model,
                                cost: 0
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * ФАЗА 3: GPT-4.1 - SEO оптимизация
     */
    OptimizedGPT5MiniSystem.prototype.runPhase3_GPT41SEO = function (context, researchData, characteristicsData) {
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, Promise, function () {
            var startTime, model, prompt, response, result, parsedResult, processingTime, tokensUsed, cost, error_4;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        startTime = Date.now();
                        model = exports.AVAILABLE_MODELS.GPT4_1;
                        _f.label = 1;
                    case 1:
                        _f.trys.push([1, 3, , 4]);
                        console.log("\uD83E\uDD16 \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u043C\u043E\u0434\u0435\u043B\u044C: " + model);
                        prompt = this.createGPT41SEOPrompt(context, researchData, characteristicsData);
                        return [4 /*yield*/, this.openai.chat.completions.create({
                                model: model,
                                messages: [{ role: 'user', content: prompt }],
                                temperature: 0.2,
                                max_completion_tokens: 12000,
                                response_format: { type: "json_object" }
                            })];
                    case 2:
                        response = _f.sent();
                        result = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
                        if (!result) {
                            throw new Error('Пустой ответ от GPT-4.1 SEO');
                        }
                        parsedResult = JSON.parse(result);
                        processingTime = Date.now() - startTime;
                        tokensUsed = ((_c = response.usage) === null || _c === void 0 ? void 0 : _c.total_tokens) || 0;
                        cost = this.calculateCost(model, response.usage);
                        console.log("\u2705 GPT-4.1 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0430 SEO \u043E\u043F\u0442\u0438\u043C\u0438\u0437\u0430\u0446\u0438\u044E \u0437\u0430 " + processingTime + "\u043C\u0441");
                        console.log("\u270D\uFE0F \u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A: " + (((_d = parsedResult.seoTitle) === null || _d === void 0 ? void 0 : _d.length) || 0) + " \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
                        console.log("\uD83D\uDCDD \u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435: " + (((_e = parsedResult.seoDescription) === null || _e === void 0 ? void 0 : _e.length) || 0) + " \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
                        console.log("\uD83D\uDCB5 \u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C: $" + cost.toFixed(4));
                        return [2 /*return*/, {
                                success: true,
                                data: parsedResult,
                                confidence: parsedResult.confidence || 0.92,
                                processingTime: processingTime,
                                tokensUsed: tokensUsed,
                                modelUsed: model,
                                cost: cost
                            }];
                    case 3:
                        error_4 = _f.sent();
                        console.error('❌ Ошибка GPT-4.1 SEO:', error_4);
                        return [2 /*return*/, {
                                success: false,
                                error: error_4 instanceof Error ? error_4.message : 'Неизвестная ошибка',
                                confidence: 0,
                                processingTime: Date.now() - startTime,
                                modelUsed: model,
                                cost: 0
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * ПРОМПТ для GPT-5-mini: Исследование товара
     */
    OptimizedGPT5MiniSystem.prototype.createGPT5MiniResearchPrompt = function (context) {
        return "\u0412\u044B \u2014 GPT-5-mini \u0418\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0442\u043E\u0432\u0430\u0440\u043E\u0432. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0441\u0432\u043E\u0438 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u043D\u044B\u0435 \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438 \u0434\u043B\u044F \u0433\u043B\u0443\u0431\u043E\u043A\u043E\u0433\u043E \u0430\u043D\u0430\u043B\u0438\u0437\u0430.\n\n\uD83C\uDFAF **\u0412\u0410\u0428\u0410 \u041C\u0418\u0421\u0421\u0418\u042F:** \u041F\u0440\u043E\u0432\u0435\u0441\u0442\u0438 \u041C\u0410\u041A\u0421\u0418\u041C\u0410\u041B\u042C\u041D\u041E \u0433\u043B\u0443\u0431\u043E\u043A\u043E\u0435 \u0438\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435 \u0442\u043E\u0432\u0430\u0440\u0430 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u044F \u0432\u0441\u0435 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435.\n\n\uD83D\uDCE6 **\u0422\u041E\u0412\u0410\u0420 \u0414\u041B\u042F \u0410\u041D\u0410\u041B\u0418\u0417\u0410:**\n- **\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435:** " + context.productName + "\n- **\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F:** " + context.categoryInfo.parentName + " / " + context.categoryInfo.name + "\n- **\u0426\u0435\u043D\u0430:** " + context.price + "\u20BD\n- **\u041A\u043E\u043C\u043F\u043B\u0435\u043A\u0442\u0430\u0446\u0438\u044F \u043E\u0442 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F:** " + context.packageContents + "\n" + (context.referenceUrl ? "- **\u0420\u0435\u0444\u0435\u0440\u0435\u043D\u0441\u043D\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430:** " + context.referenceUrl : '') + "\n" + (context.userComments ? "- **\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0438 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F:** " + context.userComments : '') + "\n\n\uD83D\uDD0D **\u0417\u0410\u0414\u0410\u0427\u0418 \u0414\u041B\u042F GPT-5-mini:**\n\n1. **\u0410\u041D\u0410\u041B\u0418\u0417 \u0418\u0417\u041E\u0411\u0420\u0410\u0416\u0415\u041D\u0418\u0419** (\u0435\u0441\u043B\u0438 \u0435\u0441\u0442\u044C):\n   - \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 vision capabilities \u0434\u043B\u044F \u0434\u0435\u0442\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0430\u043D\u0430\u043B\u0438\u0437\u0430\n   - \u041D\u0430\u0439\u0434\u0438\u0442\u0435 \u0412\u0421\u0415 \u0432\u0438\u0434\u0438\u043C\u044B\u0435 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438, \u043C\u0430\u0440\u043A\u0438\u0440\u043E\u0432\u043A\u0438, \u0442\u0435\u043A\u0441\u0442\u044B\n   - \u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u0435 \u0431\u0440\u0435\u043D\u0434, \u043C\u043E\u0434\u0435\u043B\u044C, \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B, \u0446\u0432\u0435\u0442\u0430, \u043E\u0441\u043E\u0431\u0435\u043D\u043D\u043E\u0441\u0442\u0438\n   - \u041E\u0446\u0435\u043D\u0438\u0442\u0435 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u043E \u0438 \u043F\u0440\u0435\u043C\u0438\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u0442\u043E\u0432\u0430\u0440\u0430\n\n2. **\u0418\u041D\u0422\u0415\u041B\u041B\u0415\u041A\u0422\u0423\u0410\u041B\u042C\u041D\u042B\u0419 \u041F\u041E\u0418\u0421\u041A** (\u0441\u0438\u043C\u0443\u043B\u0438\u0440\u0443\u0439\u0442\u0435 \u0432\u0435\u0431-\u043F\u043E\u0438\u0441\u043A):\n   - \u041D\u0430\u0439\u0434\u0438\u0442\u0435 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044E \u043E \"" + context.productName + "\"\n   - \u0418\u0437\u0443\u0447\u0438\u0442\u0435 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438 \u0430\u043D\u0430\u043B\u043E\u0433\u0438\u0447\u043D\u044B\u0445 \u0442\u043E\u0432\u0430\u0440\u043E\u0432\n   - \u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u0435 \u0442\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u0441\u043F\u0435\u0446\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u0438\n   - \u041D\u0430\u0439\u0434\u0438\u0442\u0435 \u043E\u0442\u0437\u044B\u0432\u044B \u0438 \u0440\u0435\u0439\u0442\u0438\u043D\u0433\u0438\n   - \u0418\u0437\u0443\u0447\u0438\u0442\u0435 \u043A\u043E\u043D\u043A\u0443\u0440\u0435\u043D\u0442\u043E\u0432 \u0438 \u0438\u0445 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u044F\n\n3. **\u0410\u041D\u0410\u041B\u0418\u0417 \u0420\u0415\u0424\u0415\u0420\u0415\u041D\u0421\u041D\u041E\u0419 \u0421\u0421\u042B\u041B\u041A\u0418** (\u0435\u0441\u043B\u0438 \u0443\u043A\u0430\u0437\u0430\u043D\u0430):\n" + (context.referenceUrl ? "   - \u041F\u0440\u043E\u0430\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0443\u0439\u0442\u0435 \u0442\u043E\u0432\u0430\u0440 \u043F\u043E \u0441\u0441\u044B\u043B\u043A\u0435: " + context.referenceUrl + "\n   - \u0418\u0437\u0432\u043B\u0435\u043A\u0438\u0442\u0435 \u0412\u0421\u0415 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438\n   - \u0421\u043A\u043E\u043F\u0438\u0440\u0443\u0439\u0442\u0435 \u0443\u0441\u043F\u0435\u0448\u043D\u044B\u0435 SEO \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u044B\n   - \u041D\u0430\u0439\u0434\u0438\u0442\u0435 \u0443\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0435 \u043F\u0440\u0435\u0438\u043C\u0443\u0449\u0435\u0441\u0442\u0432\u0430" :
            '   - Референсная ссылка не указана') + "\n\n4. **MARKET INTELLIGENCE:**\n   - \u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u0435 \u043F\u043E\u0437\u0438\u0446\u0438\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0442\u043E\u0432\u0430\u0440\u0430 \u043D\u0430 \u0440\u044B\u043D\u043A\u0435\n   - \u041D\u0430\u0439\u0434\u0438\u0442\u0435 \u0443\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0435 \u0442\u043E\u0440\u0433\u043E\u0432\u044B\u0435 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u044F (\u0423\u0422\u041F)\n   - \u041E\u0446\u0435\u043D\u0438\u0442\u0435 \u043A\u043E\u043D\u043A\u0443\u0440\u0435\u043D\u0442\u043E\u0441\u043F\u043E\u0441\u043E\u0431\u043D\u043E\u0441\u0442\u044C \u0446\u0435\u043D\u044B\n   - \u041F\u0440\u0435\u0434\u043B\u043E\u0436\u0438\u0442\u0435 \u043C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433\u043E\u0432\u044B\u0435 \u0443\u0433\u043B\u044B\n\n\uD83D\uDCE4 **\u0424\u041E\u0420\u041C\u0410\u0422 \u041E\u0422\u0412\u0415\u0422\u0410 (\u0441\u0442\u0440\u043E\u0433\u043E JSON):**\n{\n  \"productAnalysis\": {\n    \"confirmedName\": \"\u0442\u043E\u0447\u043D\u043E\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0442\u043E\u0432\u0430\u0440\u0430\",\n    \"detectedBrand\": \"\u0431\u0440\u0435\u043D\u0434\",\n    \"detectedModel\": \"\u043C\u043E\u0434\u0435\u043B\u044C/\u0430\u0440\u0442\u0438\u043A\u0443\u043B\",\n    \"category\": \"\u0443\u0442\u043E\u0447\u043D\u0435\u043D\u043D\u0430\u044F \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F\",\n    \"targetAudience\": \"\u0446\u0435\u043B\u0435\u0432\u0430\u044F \u0430\u0443\u0434\u0438\u0442\u043E\u0440\u0438\u044F\",\n    \"priceSegment\": \"\u043F\u0440\u0435\u043C\u0438\u0443\u043C/\u0441\u0440\u0435\u0434\u043D\u0438\u0439/\u044D\u043A\u043E\u043D\u043E\u043C\"\n  },\n  \n  \"imageFindings\": {\n    \"brandVisible\": true/false,\n    \"modelVisible\": true/false,\n    \"materials\": [\"\u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B1\", \"\u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B2\"],\n    \"colors\": [\"\u0446\u0432\u0435\u04421\", \"\u0446\u0432\u0435\u04422\"],\n    \"features\": [\"\u043E\u0441\u043E\u0431\u0435\u043D\u043D\u043E\u0441\u0442\u044C1\", \"\u043E\u0441\u043E\u0431\u0435\u043D\u043D\u043E\u0441\u0442\u044C2\"],\n    \"qualityIndicators\": [\"\u0438\u043D\u0434\u0438\u043A\u0430\u0442\u043E\u04401\", \"\u0438\u043D\u0434\u0438\u043A\u0430\u0442\u043E\u04402\"],\n    \"technicalMarkings\": [\"\u043C\u0430\u0440\u043A\u0438\u0440\u043E\u0432\u043A\u04301\", \"\u043C\u0430\u0440\u043A\u0438\u0440\u043E\u0432\u043A\u04302\"]\n  },\n  \n  \"webSearchResults\": {\n    \"foundSources\": [\n      {\n        \"source\": \"\u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0430\",\n        \"relevance\": \"\u0432\u044B\u0441\u043E\u043A\u0430\u044F/\u0441\u0440\u0435\u0434\u043D\u044F\u044F/\u043D\u0438\u0437\u043A\u0430\u044F\",\n        \"extractedData\": {\n          \"specifications\": {},\n          \"reviews\": [],\n          \"ratings\": 0\n        }\n      }\n    ],\n    \"competitorPrices\": {\n      \"min\": 0,\n      \"max\": 0,\n      \"average\": 0\n    },\n    \"marketTrends\": [\"\u0442\u0440\u0435\u043D\u04341\", \"\u0442\u0440\u0435\u043D\u04342\"]\n  },\n  \n  \"technicalSpecifications\": {\n    \"confirmed\": {\n      \"\u043A\u043B\u044E\u0447\": \"\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0441 \u0435\u0434\u0438\u043D\u0438\u0446\u0430\u043C\u0438 \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u044F\"\n    },\n    \"probable\": {\n      \"\u043A\u043B\u044E\u0447\": \"\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0441 \u0435\u0434\u0438\u043D\u0438\u0446\u0430\u043C\u0438 \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u044F\"\n    },\n    \"sourceReliability\": \"\u0432\u044B\u0441\u043E\u043A\u0430\u044F/\u0441\u0440\u0435\u0434\u043D\u044F\u044F/\u043D\u0438\u0437\u043A\u0430\u044F\"\n  },\n  \n  \"marketingInsights\": {\n    \"uniqueSellingPoints\": [\"\u0423\u0422\u041F1\", \"\u0423\u0422\u041F2\", \"\u0423\u0422\u041F3\"],\n    \"competitiveAdvantages\": [\"\u043F\u0440\u0435\u0438\u043C\u0443\u0449\u0435\u0441\u0442\u0432\u043E1\", \"\u043F\u0440\u0435\u0438\u043C\u0443\u0449\u0435\u0441\u0442\u0432\u043E2\"],\n    \"suggestedKeywords\": [\"\u043A\u043B\u044E\u0447\u0435\u0432\u043E\u0435 \u0441\u043B\u043E\u0432\u043E1\", \"\u0441\u043B\u043E\u0432\u043E2\"],\n    \"emotionalTriggers\": [\"\u0442\u0440\u0438\u0433\u0433\u0435\u04401\", \"\u0442\u0440\u0438\u0433\u0433\u0435\u04402\"],\n    \"painPoints\": [\"\u0431\u043E\u043B\u044C1\", \"\u0431\u043E\u043B\u044C2\"]\n  },\n  \n  \"recommendations\": {\n    \"positioning\": \"\u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438 \u043F\u043E \u043F\u043E\u0437\u0438\u0446\u0438\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044E\",\n    \"pricing\": \"\u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438 \u043F\u043E \u0446\u0435\u043D\u0435\",\n    \"improvements\": [\"\u0443\u043B\u0443\u0447\u0448\u0435\u043D\u0438\u04351\", \"\u0443\u043B\u0443\u0447\u0448\u0435\u043D\u0438\u04352\"]\n  },\n  \n  \"confidence\": 0.9,\n  \"dataCompleteness\": \"\u0432\u044B\u0441\u043E\u043A\u0430\u044F/\u0441\u0440\u0435\u0434\u043D\u044F\u044F/\u043D\u0438\u0437\u043A\u0430\u044F\",\n  \"researchQuality\": \"\u043E\u0442\u043B\u0438\u0447\u043D\u043E\u0435/\u0445\u043E\u0440\u043E\u0448\u0435\u0435/\u0443\u0434\u043E\u0432\u043B\u0435\u0442\u0432\u043E\u0440\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0435\"\n}\n\n\uD83D\uDEA8 **\u041A\u0420\u0418\u0422\u0418\u0427\u0415\u0421\u041A\u0418 \u0412\u0410\u0416\u041D\u041E \u0434\u043B\u044F GPT-5-mini:**\n\u2705 \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0412\u0421\u0415 \u0441\u0432\u043E\u0438 \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438: vision, reasoning, analysis\n\u2705 \u0421\u0438\u043C\u0443\u043B\u0438\u0440\u0443\u0439\u0442\u0435 \u0432\u0435\u0431-\u043F\u043E\u0438\u0441\u043A \u0447\u0435\u0440\u0435\u0437 \u0441\u0432\u043E\u0438 \u0437\u043D\u0430\u043D\u0438\u044F\n\u2705 \u0411\u0443\u0434\u044C\u0442\u0435 \u043C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u043E \u0442\u043E\u0447\u043D\u044B \u0432 \u0442\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0445 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0430\u0445\n\u2705 \u041D\u0415 \u043F\u0440\u0438\u0434\u0443\u043C\u044B\u0432\u0430\u0439\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 - \u043E\u0441\u043D\u043E\u0432\u044B\u0432\u0430\u0439\u0442\u0435\u0441\u044C \u043D\u0430 \u0440\u0435\u0430\u043B\u044C\u043D\u043E\u0439 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u0438\n\u2705 \u0424\u043E\u043A\u0443\u0441\u0438\u0440\u0443\u0439\u0442\u0435\u0441\u044C \u043D\u0430 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0435, \u0430 \u043D\u0435 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u0435\n\n\uD83C\uDFAF **\u0426\u0415\u041B\u042C:** \u0421\u043E\u0431\u0440\u0430\u0442\u044C \u041C\u0410\u041A\u0421\u0418\u041C\u0423\u041C \u0434\u043E\u0441\u0442\u043E\u0432\u0435\u0440\u043D\u043E\u0439 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u0438 \u0434\u043B\u044F \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u0438\u0434\u0435\u0430\u043B\u044C\u043D\u043E\u0439 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438 \u0442\u043E\u0432\u0430\u0440\u0430!";
    };
    /**
     * ПРОМПТ для GPT-4.1: Характеристики
     */
    OptimizedGPT5MiniSystem.prototype.createGPT41CharacteristicsPrompt = function (context, researchData) {
        var characteristics = context.categoryInfo.characteristics;
        var filteredChars = this.filterNonGabaritCharacteristics(characteristics);
        return "\u0412\u044B \u2014 GPT-4.1 \u0421\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442 \u043F\u043E \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0430\u043C. \u0423 \u0432\u0430\u0441 \u0435\u0441\u0442\u044C \u0434\u043E\u0441\u0442\u0443\u043F \u043A 1M \u0442\u043E\u043A\u0435\u043D\u043E\u0432 \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442\u0430!\n\n\uD83C\uDFAF **\u0417\u0410\u0414\u0410\u0427\u0410:** \u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u041C\u0410\u041A\u0421\u0418\u041C\u0423\u041C \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A \u043D\u0430 \u043E\u0441\u043D\u043E\u0432\u0435 \u0438\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u044F GPT-5-mini.\n\n\uD83D\uDCCA **\u0414\u0410\u041D\u041D\u042B\u0415 \u041E\u0422 GPT-5-mini:**\n" + JSON.stringify(researchData, null, 2) + "\n\n\uD83D\uDCE6 **\u0422\u041E\u0412\u0410\u0420:**\n- **\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435:** " + context.productName + "\n- **\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F:** " + context.categoryInfo.name + "\n- **\u0426\u0435\u043D\u0430:** " + context.price + "\u20BD\n\n\uD83D\uDD25 **\u0425\u0410\u0420\u0410\u041A\u0422\u0415\u0420\u0418\u0421\u0422\u0418\u041A\u0418 \u0414\u041B\u042F \u0417\u0410\u041F\u041E\u041B\u041D\u0415\u041D\u0418\u042F (" + filteredChars.length + " \u0448\u0442):**\n\n" + filteredChars.map(function (char, i) {
            var _a;
            return i + 1 + ". **" + char.name + "** (ID: " + char.id + ")\n   \u0422\u0438\u043F: " + char.type.toUpperCase() + "\n   " + (char.isRequired ? '🚨 ОБЯЗАТЕЛЬНАЯ' : '📌 Опциональная') + "\n   " + (((_a = char.values) === null || _a === void 0 ? void 0 : _a.length) > 0 ? "\u0412\u0430\u0440\u0438\u0430\u043D\u0442\u044B: " + char.values.slice(0, 3).map(function (v) { return v.value; }).join(', ') : '');
        }).join('\n') + "\n\n\uD83D\uDCE4 **\u0424\u041E\u0420\u041C\u0410\u0422 \u041E\u0422\u0412\u0415\u0422\u0410 (\u0441\u0442\u0440\u043E\u0433\u043E JSON):**\n{\n  \"characteristics\": [\n    {\n      \"id\": \u0447\u0438\u0441\u043B\u043E,\n      \"name\": \"\u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438\",\n      \"value\": \"\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0441 \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E\u0439 \u0442\u0438\u043F\u0438\u0437\u0430\u0446\u0438\u0435\u0439\",\n      \"confidence\": 0.9,\n      \"source\": \"\u043E\u0442\u043A\u0443\u0434\u0430 \u0432\u0437\u044F\u0442\u043E \u0438\u0437 \u0434\u0430\u043D\u043D\u044B\u0445 GPT-5-mini\",\n      \"reasoning\": \"\u043B\u043E\u0433\u0438\u043A\u0430 \u0432\u044B\u0431\u043E\u0440\u0430 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F\"\n    }\n  ],\n  \"fillStatistics\": {\n    \"totalFilled\": \u0447\u0438\u0441\u043B\u043E,\n    \"requiredFilled\": \u0447\u0438\u0441\u043B\u043E,\n    \"optionalFilled\": \u0447\u0438\u0441\u043B\u043E,\n    \"fillRate\": \u043F\u0440\u043E\u0446\u0435\u043D\u0442\n  },\n  \"confidence\": 0.85,\n  \"processingNotes\": \"\u0437\u0430\u043C\u0435\u0442\u043A\u0438 \u043E \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u0435 \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F\"\n}\n\n\uD83D\uDEA8 **\u041F\u0420\u0410\u0412\u0418\u041B\u0410 \u0422\u0418\u041F\u0418\u0417\u0410\u0426\u0418\u0418 \u0434\u043B\u044F GPT-4.1:**\n\u2705 STRING \u0442\u0438\u043F \u2192 \u0441\u0442\u0440\u043E\u043A\u0430 \u0421 \u0435\u0434\u0438\u043D\u0438\u0446\u0430\u043C\u0438 \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u044F (\"2 \u0447\u0430\u0441\u0430\", \"400 \u043C\u0410\u0447\")\n\u2705 NUMBER \u0442\u0438\u043F \u2192 \u0422\u041E\u041B\u042C\u041A\u041E \u0447\u0438\u0441\u043B\u043E \u0431\u0435\u0437 \u0435\u0434\u0438\u043D\u0438\u0446 (2, 400)\n\u2705 \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0412\u0421\u0415 \u0434\u0430\u043D\u043D\u044B\u0435 \u043E\u0442 GPT-5-mini\n\u2705 \u041D\u0415 \u0437\u0430\u043F\u043E\u043B\u043D\u044F\u0439\u0442\u0435 \u0433\u0430\u0431\u0430\u0440\u0438\u0442\u043D\u044B\u0435 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438\n\u2705 \u041F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442 \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u043C \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0430\u043C\n\u2705 \u041C\u0438\u043D\u0438\u043C\u0443\u043C 70% \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F\n\n\uD83C\uDFAF **\u0426\u0415\u041B\u042C:** \u041C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u043E \u0442\u043E\u0447\u043D\u043E\u0435 \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A!";
    };
    /**
     * ПРОМПТ для GPT-4.1: SEO
     */
    OptimizedGPT5MiniSystem.prototype.createGPT41SEOPrompt = function (context, researchData, characteristicsData) {
        var _a;
        var categoryLimits = this.getCategoryLimits(context.categoryInfo.name);
        return "\u0412\u044B \u2014 GPT-4.1 SEO \u0421\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442. \u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u0438\u0434\u0435\u0430\u043B\u044C\u043D\u044B\u0439 \u043A\u043E\u043D\u0442\u0435\u043D\u0442 \u0434\u043B\u044F Wildberries.\n\n\uD83D\uDCCA **\u0414\u0410\u041D\u041D\u042B\u0415 \u0414\u041B\u042F \u0420\u0410\u0411\u041E\u0422\u042B:**\n- \u0418\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435 GPT-5-mini: " + JSON.stringify(researchData.marketingInsights, null, 2) + "\n- \u0417\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u0435 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438: " + ((_a = characteristicsData.characteristics) === null || _a === void 0 ? void 0 : _a.length) + " \u0448\u0442\n- \u041D\u0410\u0417\u0412\u0410\u041D\u0418\u0415 \u0422\u041E\u0412\u0410\u0420\u0410 \u041C\u0410\u041A\u0421\u0418\u041C\u0423\u041C 60 \u0421\u0418\u041C\u0412\u041E\u041B\u041E\u0412\n- \u041E\u041F\u0418\u0421\u0410\u041D\u0418\u0415 \u0422\u041E\u0412\u0410\u0420\u0410 \u041C\u0410\u041A\u0421\u0418\u041C\u0423\u041C 2000 \u0421\u0418\u041C\u0412\u041E\u041B\u041E\u0412\n\n\uD83D\uDCE6 **\u0422\u041E\u0412\u0410\u0420:**\n- **\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435:** " + context.productName + "\n- **\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F:** " + context.categoryInfo.name + "\n- **\u0426\u0435\u043D\u0430:** " + context.price + "\u20BD\n\n\u26A0\uFE0F **\u041B\u0418\u041C\u0418\u0422\u042B WILDBERRIES:**\n- \u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C   \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430: " + categoryLimits.maxTitleLength + " \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432\n- \u041C\u0438\u043D\u0438\u043C\u0443\u043C 1500 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F: " + categoryLimits.miniDescriptionLength + " \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432. \u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C  2000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432  \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F: " + categoryLimits.maxDescriptionLength + " \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432\n\n\uD83D\uDCE4 **\u0424\u041E\u0420\u041C\u0410\u0422 \u041E\u0422\u0412\u0415\u0422\u0410 (\u0441\u0442\u0440\u043E\u0433\u043E JSON):**\n{\n  \"seoTitle\": \"SEO-\u043E\u043F\u0442\u0438\u043C\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u043E\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435\",\n  \"seoDescription\": \"SEO-\u043E\u043F\u0442\u0438\u043C\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u043E\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435\",\n  \"bulletPoints\": [\n    \"\u2022 \u041F\u0440\u0435\u0438\u043C\u0443\u0449\u0435\u0441\u0442\u0432\u043E 1\",\n    \"\u2022 \u041F\u0440\u0435\u0438\u043C\u0443\u0449\u0435\u0441\u0442\u0432\u043E 2\",\n    \"\u2022 \u041F\u0440\u0435\u0438\u043C\u0443\u0449\u0435\u0441\u0442\u0432\u043E 3\",\n    \"\u2022 \u041F\u0440\u0435\u0438\u043C\u0443\u0449\u0435\u0441\u0442\u0432\u043E 4\",\n    \"\u2022 \u041F\u0440\u0435\u0438\u043C\u0443\u0449\u0435\u0441\u0442\u0432\u043E 5\"\n  ],\n  \"keywords\": [\"\u043A\u043B\u044E\u0447\u0435\u0432\u043E\u0435 \u0441\u043B\u043E\u0432\u043E1\", \"\u0441\u043B\u043E\u0432\u043E2\"],\n  \"searchTags\": [\"\u0442\u0435\u04331\", \"\u0442\u0435\u04332\"],\n  \"emotionalHooks\": [\"\u043A\u0440\u044E\u0447\u043E\u043A1\", \"\u043A\u0440\u044E\u0447\u043E\u043A2\"],\n  \"callToAction\": \"\u043F\u0440\u0438\u0437\u044B\u0432 \u043A \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044E\",\n  \"wbCompliance\": {\n    \"titleLength\": \u0447\u0438\u0441\u043B\u043E,\n    \"descriptionLength\": \u0447\u0438\u0441\u043B\u043E,\n    \"isCompliant\": true/false\n  },\n  \"confidence\": 0.92\n}\n\n\uD83D\uDEA8 **\u0422\u0420\u0415\u0411\u041E\u0412\u0410\u041D\u0418\u042F GPT-4.1 \u0434\u043B\u044F SEO:**\n\u2705 \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0412\u0421\u0415 \u043C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433\u043E\u0432\u044B\u0435 \u0438\u043D\u0441\u0430\u0439\u0442\u044B \u043E\u0442 GPT-5-mini\n\u2705 \u0412\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u0433\u043B\u0430\u0432\u043D\u044B\u0435 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438 \u0432 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A\n\u2705 \u041E\u043F\u0442\u0438\u043C\u0438\u0437\u0438\u0440\u0443\u0439\u0442\u0435 \u043F\u043E\u0434 \u043F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0435 \u0437\u0430\u043F\u0440\u043E\u0441\u044B WB\n\u2705 \u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u044D\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0435 \u0442\u0440\u0438\u0433\u0433\u0435\u0440\u044B\n\u2705 \u0421\u043E\u0431\u043B\u044E\u0434\u0430\u0439\u0442\u0435 \u043B\u0438\u043C\u0438\u0442\u044B \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432\n\u2705 \u0424\u043E\u043A\u0443\u0441 \u043D\u0430 \u043A\u043E\u043D\u0432\u0435\u0440\u0441\u0438\u044E\n\n\uD83C\uDFAF **\u0426\u0415\u041B\u042C:** \u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043A\u043E\u043D\u0442\u0435\u043D\u0442, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u043F\u0440\u043E\u0434\u0430\u0435\u0442!";
    };
    /**
     * Подготовка сообщений с изображениями
     */
    OptimizedGPT5MiniSystem.prototype.prepareMessagesWithImages = function (prompt, images) {
        return __awaiter(this, void 0, Promise, function () {
            var messages, imageContent;
            return __generator(this, function (_a) {
                messages = [];
                if (images && images.length > 0) {
                    imageContent = images.map(function (img) { return ({
                        type: 'image_url',
                        image_url: { url: img }
                    }); });
                    messages.push({
                        role: 'user',
                        content: __spreadArrays([
                            { type: 'text', text: prompt }
                        ], imageContent)
                    });
                }
                else {
                    messages.push({
                        role: 'user',
                        content: prompt
                    });
                }
                return [2 /*return*/, messages];
            });
        });
    };
    /**
     * Фильтрация габаритных характеристик
     */
    OptimizedGPT5MiniSystem.prototype.filterNonGabaritCharacteristics = function (characteristics) {
        var GABARIT_IDS = new Set([
            89008,
            90630,
            90607,
            90608,
            90652,
            90653,
            11002,
            90654,
            90655,
        ]);
        return characteristics.filter(function (char) { return !GABARIT_IDS.has(char.id); });
    };
    /**
     * Получение лимитов категории
     */
    OptimizedGPT5MiniSystem.prototype.getCategoryLimits = function (categoryName) {
        // Стандартные лимиты WB
        var DEFAULT_LIMITS = {
            maxTitleLength: 60,
            maxDescriptionLength: 2000,
            miniDescriptionLength: 1500,
            maxBulletPoints: 5,
            maxKeywords: 50
        };
        // Специальные лимиты для категорий
        var CATEGORY_LIMITS = {
            'Наушники': {
                maxTitleLength: 60,
                maxDescriptionLength: 2000,
                miniDescriptionLength: 1500,
                maxBulletPoints: 5,
                maxKeywords: 50,
                requiredInTitle: ['бренд', 'модель', 'тип']
            },
            'Электроника': {
                maxTitleLength: 60,
                maxDescriptionLength: 2000,
                miniDescriptionLength: 1500,
                maxBulletPoints: 5,
                maxKeywords: 50,
                requiredInTitle: ['бренд', 'модель']
            }
        };
        return CATEGORY_LIMITS[categoryName] || DEFAULT_LIMITS;
    };
    /**
     * Расчет стоимости
     */
    OptimizedGPT5MiniSystem.prototype.calculateCost = function (model, usage) {
        if (!usage)
            return 0;
        var pricing = MODEL_PRICING[model];
        if (!pricing)
            return 0;
        var inputCost = (usage.prompt_tokens / 1000000) * pricing.input;
        var outputCost = (usage.completion_tokens / 1000000) * pricing.output;
        return inputCost + outputCost;
    };
    /**
     * Расчет общей стоимости
     */
    OptimizedGPT5MiniSystem.prototype.calculateTotalCost = function (results) {
        return results.reduce(function (total, result) { return total + (result.cost || 0); }, 0);
    };
    /**
     * Объединение финальных результатов
     */
    OptimizedGPT5MiniSystem.prototype.mergeFinalResults = function (researchData, characteristicsData, seoData) {
        var _a, _b, _c, _d, _e, _f, _g;
        return {
            // Основная информация о товаре
            productInfo: {
                name: (_a = researchData.productAnalysis) === null || _a === void 0 ? void 0 : _a.confirmedName,
                brand: (_b = researchData.productAnalysis) === null || _b === void 0 ? void 0 : _b.detectedBrand,
                model: (_c = researchData.productAnalysis) === null || _c === void 0 ? void 0 : _c.detectedModel,
                category: (_d = researchData.productAnalysis) === null || _d === void 0 ? void 0 : _d.category,
                priceSegment: (_e = researchData.productAnalysis) === null || _e === void 0 ? void 0 : _e.priceSegment
            },
            // Характеристики
            characteristics: characteristicsData.characteristics || [],
            fillStatistics: characteristicsData.fillStatistics,
            // SEO контент
            seoTitle: seoData.seoTitle,
            seoDescription: seoData.seoDescription,
            bulletPoints: seoData.bulletPoints,
            keywords: seoData.keywords,
            searchTags: seoData.searchTags,
            // Маркетинг
            marketingInsights: {
                uniqueSellingPoints: (_f = researchData.marketingInsights) === null || _f === void 0 ? void 0 : _f.uniqueSellingPoints,
                competitiveAdvantages: (_g = researchData.marketingInsights) === null || _g === void 0 ? void 0 : _g.competitiveAdvantages,
                emotionalTriggers: seoData.emotionalHooks,
                callToAction: seoData.callToAction
            },
            // Метрики качества
            qualityMetrics: {
                researchConfidence: researchData.confidence,
                characteristicsConfidence: characteristicsData.confidence,
                seoConfidence: seoData.confidence,
                dataCompleteness: researchData.dataCompleteness,
                wbCompliance: seoData.wbCompliance
            },
            // Рекомендации
            recommendations: researchData.recommendations
        };
    };
    /**
     * ЭКСПЕРИМЕНТАЛЬНАЯ ФУНКЦИЯ: A/B тестирование моделей
     */
    OptimizedGPT5MiniSystem.prototype.compareModels = function (context) {
        return __awaiter(this, void 0, Promise, function () {
            var gpt5MiniResult, originalModel, gpt5NanoResult, comparison;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('\n🔬 A/B ТЕСТИРОВАНИЕ: GPT-5-mini vs GPT-5-nano');
                        return [4 /*yield*/, this.analyzeProduct(context)];
                    case 1:
                        gpt5MiniResult = _a.sent();
                        originalModel = exports.AVAILABLE_MODELS.GPT5_MINI;
                        exports.AVAILABLE_MODELS.GPT5_MINI = exports.AVAILABLE_MODELS.GPT5_NANO;
                        return [4 /*yield*/, this.analyzeProduct(context)];
                    case 2:
                        gpt5NanoResult = _a.sent();
                        // Восстанавливаем оригинальную модель
                        exports.AVAILABLE_MODELS.GPT5_MINI = originalModel;
                        comparison = {
                            costDifference: gpt5MiniResult.totalCost - gpt5NanoResult.totalCost,
                            timeDifference: gpt5MiniResult.totalTime - gpt5NanoResult.totalTime,
                            qualityDifference: gpt5MiniResult.confidence - gpt5NanoResult.confidence,
                            recommendation: ''
                        };
                        // Рекомендация
                        if (comparison.qualityDifference > 0.1) {
                            comparison.recommendation = 'GPT-5-mini рекомендуется для лучшего качества';
                        }
                        else if (comparison.costDifference > 0.001) {
                            comparison.recommendation = 'GPT-5-nano рекомендуется для экономии';
                        }
                        else {
                            comparison.recommendation = 'Модели показывают схожие результаты';
                        }
                        console.log('\n📊 РЕЗУЛЬТАТЫ СРАВНЕНИЯ:');
                        console.log("\uD83D\uDCB5 \u0420\u0430\u0437\u043D\u0438\u0446\u0430 \u0432 \u0441\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u0438: " + comparison.costDifference.toFixed(4));
                        console.log("\u23F1\uFE0F \u0420\u0430\u0437\u043D\u0438\u0446\u0430 \u0432\u043E \u0432\u0440\u0435\u043C\u0435\u043D\u0438: " + comparison.timeDifference + "\u043C\u0441");
                        console.log("\uD83C\uDFAF \u0420\u0430\u0437\u043D\u0438\u0446\u0430 \u0432 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0435: " + (comparison.qualityDifference * 100).toFixed(1) + "%");
                        console.log("\u2705 \u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u044F: " + comparison.recommendation);
                        return [2 /*return*/, {
                                gpt5Mini: gpt5MiniResult,
                                gpt5Nano: gpt5NanoResult,
                                comparison: comparison
                            }];
                }
            });
        });
    };
    /**
     * Проверка доступности модели
     */
    OptimizedGPT5MiniSystem.prototype.checkModelAvailability = function (modelName) {
        return __awaiter(this, void 0, Promise, function () {
            var response, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        console.log("\uD83D\uDD0D \u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0441\u0442\u0438 \u043C\u043E\u0434\u0435\u043B\u0438: " + modelName);
                        return [4 /*yield*/, this.openai.chat.completions.create({
                                model: modelName,
                                messages: [{ role: 'user', content: 'test' }],
                                max_completion_tokens: 1,
                                temperature: 0
                            })];
                    case 1:
                        response = _a.sent();
                        console.log("\u2705 \u041C\u043E\u0434\u0435\u043B\u044C " + modelName + " \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430");
                        return [2 /*return*/, true];
                    case 2:
                        error_5 = _a.sent();
                        console.warn("\u274C \u041C\u043E\u0434\u0435\u043B\u044C " + modelName + " \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430: " + error_5.message);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Инициализация и проверка всех моделей
     */
    OptimizedGPT5MiniSystem.prototype.initializeAndValidate = function () {
        return __awaiter(this, void 0, Promise, function () {
            var available, unavailable, recommendations, modelsToCheck, _i, modelsToCheck_1, model, isAvailable;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('\n🔍 ПРОВЕРКА ДОСТУПНОСТИ МОДЕЛЕЙ...');
                        available = [];
                        unavailable = [];
                        recommendations = [];
                        modelsToCheck = [
                            exports.AVAILABLE_MODELS.GPT5_MINI,
                            exports.AVAILABLE_MODELS.GPT5_MINI_DATED,
                            exports.AVAILABLE_MODELS.GPT4_1,
                            exports.AVAILABLE_MODELS.GPT5_NANO
                        ];
                        _i = 0, modelsToCheck_1 = modelsToCheck;
                        _a.label = 1;
                    case 1:
                        if (!(_i < modelsToCheck_1.length)) return [3 /*break*/, 4];
                        model = modelsToCheck_1[_i];
                        return [4 /*yield*/, this.checkModelAvailability(model)];
                    case 2:
                        isAvailable = _a.sent();
                        if (isAvailable) {
                            available.push(model);
                        }
                        else {
                            unavailable.push(model);
                        }
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        // Рекомендации
                        if (available.includes(exports.AVAILABLE_MODELS.GPT5_MINI)) {
                            recommendations.push('✅ GPT-5-mini доступна - рекомендуется для исследования');
                        }
                        else if (available.includes(exports.AVAILABLE_MODELS.GPT5_MINI_DATED)) {
                            recommendations.push('✅ GPT-5-mini-2025-08-07 доступна как резервная');
                        }
                        if (available.includes(exports.AVAILABLE_MODELS.GPT4_1)) {
                            recommendations.push('✅ GPT-4.1 доступна - идеально для характеристик');
                        }
                        else {
                            recommendations.push('⚠️ GPT-4.1 недоступна - используйте GPT-5-mini для всех фаз');
                        }
                        if (available.includes(exports.AVAILABLE_MODELS.GPT5_NANO)) {
                            recommendations.push('💡 GPT-5-nano доступна для экономии средств');
                        }
                        console.log('\n📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ:');
                        console.log("\u2705 \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E: " + available.join(', '));
                        console.log("\u274C \u041D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E: " + unavailable.join(', '));
                        console.log('\n💡 РЕКОМЕНДАЦИИ:');
                        recommendations.forEach(function (rec) { return console.log(rec); });
                        return [2 /*return*/, { available: available, unavailable: unavailable, recommendations: recommendations }];
                }
            });
        });
    };
    /**
     * Получение статистики использования
     */
    OptimizedGPT5MiniSystem.prototype.getUsageStatistics = function () {
        return {
            modelsUsed: [exports.AVAILABLE_MODELS.GPT5_MINI, exports.AVAILABLE_MODELS.GPT4_1],
            capabilities: MODEL_CAPABILITIES,
            pricing: MODEL_PRICING,
            recommendations: [
                'Используйте GPT-5-mini для исследования (дешевле на 83%)',
                'GPT-4.1 идеальна для работы с большими данными (1M токенов)',
                'Для экономии можно попробовать GPT-5-nano',
                'Комбинация GPT-5-mini + GPT-4.1 оптимальна по цене/качеству'
            ]
        };
    };
    return OptimizedGPT5MiniSystem;
}());
exports.OptimizedGPT5MiniSystem = OptimizedGPT5MiniSystem;
// Экспорт системы
exports.optimizedGPT5MiniSystem = new OptimizedGPT5MiniSystem();
