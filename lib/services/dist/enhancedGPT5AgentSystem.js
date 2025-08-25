"use strict";
// lib/services/enhancedGPT5AgentSystem.ts - ИСПРАВЛЕНИЕ МОДЕЛЕЙ
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
exports.enhancedGPT5AgentSystem = exports.UPDATED_GPT5_CONFIG = exports.EnhancedGPT5AgentSystem = void 0;
var EnhancedGPT5AgentSystem = /** @class */ (function () {
    function EnhancedGPT5AgentSystem() {
        this.maxRetries = 3;
        this.timeout = 120000;
        var apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY не найден в переменных окружения');
        }
        this.openai = new OpenAI({ apiKey: apiKey });
    }
    /**
     * АГЕНТ 1: GPT-5 с функцией поиска - ИСПРАВЛЕНО
     */
    EnhancedGPT5AgentSystem.prototype.runAgent1_GPT5SearchResearcher = function (context, categoryLimits) {
        var _a, _b, _c, _d, _e, _f, _g;
        return __awaiter(this, void 0, Promise, function () {
            var startTime, prompt, messages, modelToUse, response, result, parsedResult, processingTime, error_1;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        startTime = Date.now();
                        _h.label = 1;
                    case 1:
                        _h.trys.push([1, 4, , 5]);
                        prompt = this.createGPT5SearchPrompt(context, categoryLimits);
                        return [4 /*yield*/, this.prepareGPT5MessagesWithImages(prompt, context.images)];
                    case 2:
                        messages = _h.sent();
                        modelToUse = this.getAvailableGPT5Model();
                        console.log("\uD83E\uDD16 \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u043C\u043E\u0434\u0435\u043B\u044C: " + modelToUse);
                        return [4 /*yield*/, this.openai.chat.completions.create({
                                model: modelToUse,
                                messages: messages,
                                temperature: 0.1,
                                max_tokens: 8000,
                                response_format: { type: "json_object" }
                            })];
                    case 3:
                        response = _h.sent();
                        result = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
                        if (!result) {
                            throw new Error('Пустой ответ от GPT-5');
                        }
                        parsedResult = this.parseAgentResponse(result);
                        processingTime = Date.now() - startTime;
                        console.log("\u2705 " + modelToUse + " \u0410\u0433\u0435\u043D\u0442 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B \u0440\u0430\u0431\u043E\u0442\u0443 \u0437\u0430 " + processingTime + "\u043C\u0441");
                        console.log("\uD83D\uDD0D \u041F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0445 \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432: " + (((_c = parsedResult.searchMetrics) === null || _c === void 0 ? void 0 : _c.totalQueries) || 0));
                        console.log("\uD83D\uDCCA \u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u043E\u0432 \u043D\u0430\u0439\u0434\u0435\u043D\u043E: " + (((_d = parsedResult.searchMetrics) === null || _d === void 0 ? void 0 : _d.sourcesFound) || 0));
                        return [2 /*return*/, {
                                success: true,
                                data: parsedResult,
                                confidence: parsedResult.confidence || 0.9,
                                processingTime: processingTime,
                                tokensUsed: ((_e = response.usage) === null || _e === void 0 ? void 0 : _e.total_tokens) || 0,
                                searchQueries: ((_f = parsedResult.searchMetrics) === null || _f === void 0 ? void 0 : _f.queriesExecuted) || [],
                                sourcesFound: ((_g = parsedResult.searchMetrics) === null || _g === void 0 ? void 0 : _g.sourcesFound) || 0
                            }];
                    case 4:
                        error_1 = _h.sent();
                        console.error('❌ Ошибка GPT-5 Агента:', error_1);
                        return [2 /*return*/, {
                                success: false,
                                error: error_1 instanceof Error ? error_1.message : 'Неизвестная ошибка',
                                confidence: 0,
                                processingTime: Date.now() - startTime,
                                searchQueries: [],
                                sourcesFound: 0
                            }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * АГЕНТ 2: GPT-4.1 Аналитик характеристик - ИСПРАВЛЕНО
     */
    EnhancedGPT5AgentSystem.prototype.runAgent2_GPT41CharacteristicsAnalyst = function (context, searchData, categoryLimits) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, Promise, function () {
            var startTime, prompt, modelToUse, response, result, parsedResult, processingTime, error_2;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        startTime = Date.now();
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 3, , 4]);
                        prompt = this.createGPT41CharacteristicsPrompt(context, searchData, categoryLimits);
                        modelToUse = this.getAvailableGPT41Model();
                        console.log("\uD83E\uDD16 \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u043C\u043E\u0434\u0435\u043B\u044C \u0434\u043B\u044F \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A: " + modelToUse);
                        return [4 /*yield*/, this.openai.chat.completions.create({
                                model: modelToUse,
                                messages: [{ role: 'user', content: prompt }],
                                temperature: 0.1,
                                max_tokens: 10000,
                                response_format: { type: "json_object" }
                            })];
                    case 2:
                        response = _e.sent();
                        result = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
                        if (!result) {
                            throw new Error('Пустой ответ от GPT-4.1');
                        }
                        parsedResult = this.parseAgentResponse(result);
                        processingTime = Date.now() - startTime;
                        console.log("\u2705 " + modelToUse + " Characteristics \u0410\u0433\u0435\u043D\u0442 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B \u0440\u0430\u0431\u043E\u0442\u0443 \u0437\u0430 " + processingTime + "\u043C\u0441");
                        console.log("\uD83D\uDCCA \u0425\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A \u0441\u043E\u0437\u0434\u0430\u043D\u043E: " + (((_c = parsedResult.characteristics) === null || _c === void 0 ? void 0 : _c.length) || 0));
                        return [2 /*return*/, {
                                success: true,
                                data: parsedResult,
                                confidence: parsedResult.confidence || 0.85,
                                processingTime: processingTime,
                                tokensUsed: ((_d = response.usage) === null || _d === void 0 ? void 0 : _d.total_tokens) || 0
                            }];
                    case 3:
                        error_2 = _e.sent();
                        console.error('❌ Ошибка GPT-4.1 Characteristics Агента:', error_2);
                        return [2 /*return*/, {
                                success: false,
                                error: error_2 instanceof Error ? error_2.message : 'Неизвестная ошибка',
                                confidence: 0,
                                processingTime: Date.now() - startTime
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * АГЕНТ 3: GPT-4.1 SEO специалист - ИСПРАВЛЕНО
     */
    EnhancedGPT5AgentSystem.prototype.runAgent3_GPT41SEOSpecialist = function (context, searchData, characteristicsData, categoryLimits) {
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, Promise, function () {
            var startTime, prompt, modelToUse, response, result, parsedResult, processingTime, error_3;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        startTime = Date.now();
                        _f.label = 1;
                    case 1:
                        _f.trys.push([1, 3, , 4]);
                        prompt = this.createGPT41SEOPrompt(context, searchData, characteristicsData, categoryLimits);
                        modelToUse = this.getAvailableGPT41Model();
                        console.log("\uD83E\uDD16 \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u043C\u043E\u0434\u0435\u043B\u044C \u0434\u043B\u044F SEO: " + modelToUse);
                        return [4 /*yield*/, this.openai.chat.completions.create({
                                model: modelToUse,
                                messages: [{ role: 'user', content: prompt }],
                                temperature: 0.2,
                                max_tokens: 12000,
                                response_format: { type: "json_object" }
                            })];
                    case 2:
                        response = _f.sent();
                        result = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
                        if (!result) {
                            throw new Error('Пустой ответ от GPT-4.1 SEO');
                        }
                        parsedResult = this.parseAgentResponse(result);
                        processingTime = Date.now() - startTime;
                        console.log("\u2705 " + modelToUse + " SEO \u0410\u0433\u0435\u043D\u0442 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B \u0440\u0430\u0431\u043E\u0442\u0443 \u0437\u0430 " + processingTime + "\u043C\u0441");
                        console.log("\u270D\uFE0F \u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A: " + (((_c = parsedResult.seoTitle) === null || _c === void 0 ? void 0 : _c.length) || 0) + "/" + categoryLimits.maxTitleLength + " \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
                        console.log("\uD83D\uDCDD \u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435: " + (((_d = parsedResult.seoDescription) === null || _d === void 0 ? void 0 : _d.length) || 0) + "/" + categoryLimits.maxDescriptionLength + " \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
                        return [2 /*return*/, {
                                success: true,
                                data: parsedResult,
                                confidence: parsedResult.confidence || 0.92,
                                processingTime: processingTime,
                                tokensUsed: ((_e = response.usage) === null || _e === void 0 ? void 0 : _e.total_tokens) || 0
                            }];
                    case 3:
                        error_3 = _f.sent();
                        console.error('❌ Ошибка GPT-4.1 SEO Агента:', error_3);
                        return [2 /*return*/, {
                                success: false,
                                error: error_3 instanceof Error ? error_3.message : 'Неизвестная ошибка',
                                confidence: 0,
                                processingTime: Date.now() - startTime
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * НОВАЯ ФУНКЦИЯ - определение доступной модели GPT-5
     */
    EnhancedGPT5AgentSystem.prototype.getAvailableGPT5Model = function () {
        // Список возможных названий модели GPT-5 в порядке приоритета
        var gpt5Models = [
            'gpt-5',
            'gpt-5-turbo',
            'o1',
            'o1-preview',
            'gpt-4o',
            'gpt-4-turbo' // Fallback
        ];
        // В реальном приложении здесь можно добавить проверку доступности модели
        // через API или переменные окружения
        var preferredModel = process.env.GPT5_MODEL_NAME || 'gpt-4o';
        console.log("\uD83D\uDD0D \u041F\u043E\u043F\u044B\u0442\u043A\u0430 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u043C\u043E\u0434\u0435\u043B\u044C: " + preferredModel);
        // Проверяем, есть ли модель в списке поддерживаемых
        if (gpt5Models.includes(preferredModel)) {
            return preferredModel;
        }
        // Если предпочтительная модель недоступна, используем лучшую доступную
        console.warn("\u26A0\uFE0F \u041C\u043E\u0434\u0435\u043B\u044C " + preferredModel + " \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430, \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u043C gpt-4o");
        return 'gpt-4o';
    };
    /**
     * НОВАЯ ФУНКЦИЯ - определение доступной модели GPT-4.1
     */
    EnhancedGPT5AgentSystem.prototype.getAvailableGPT41Model = function () {
        // Список возможных названий модели GPT-4.1 в порядке приоритета
        var gpt41Models = [
            'gpt-4.1',
            'gpt-4.1-turbo',
            'gpt-4o',
            'gpt-4-turbo',
            'gpt-4' // Последний fallback
        ];
        var preferredModel = process.env.GPT41_MODEL_NAME || 'gpt-4o';
        console.log("\uD83D\uDD0D \u041F\u043E\u043F\u044B\u0442\u043A\u0430 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u043C\u043E\u0434\u0435\u043B\u044C GPT-4.1: " + preferredModel);
        if (gpt41Models.includes(preferredModel)) {
            return preferredModel;
        }
        console.warn("\u26A0\uFE0F \u041C\u043E\u0434\u0435\u043B\u044C " + preferredModel + " \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430, \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u043C gpt-4o");
        return 'gpt-4o';
    };
    /**
     * НОВАЯ ФУНКЦИЯ - проверка доступности модели через API
     */
    EnhancedGPT5AgentSystem.prototype.checkModelAvailability = function (modelName) {
        return __awaiter(this, void 0, Promise, function () {
            var error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        // Делаем тестовый запрос с минимальными параметрами
                        return [4 /*yield*/, this.openai.chat.completions.create({
                                model: modelName,
                                messages: [{ role: 'user', content: 'test' }],
                                max_tokens: 1,
                                temperature: 0
                            })];
                    case 1:
                        // Делаем тестовый запрос с минимальными параметрами
                        _a.sent();
                        console.log("\u2705 \u041C\u043E\u0434\u0435\u043B\u044C " + modelName + " \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430");
                        return [2 /*return*/, true];
                    case 2:
                        error_4 = _a.sent();
                        console.warn("\u274C \u041C\u043E\u0434\u0435\u043B\u044C " + modelName + " \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430: " + error_4.message);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * НОВАЯ ФУНКЦИЯ - автоматический выбор лучшей доступной модели
     */
    EnhancedGPT5AgentSystem.prototype.selectBestAvailableModel = function (modelType) {
        return __awaiter(this, void 0, Promise, function () {
            var models, _i, models_1, model, isAvailable, fallback;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        models = modelType === 'gpt5'
                            ? ['o1-preview', 'gpt-4o', 'gpt-4-turbo']
                            : ['gpt-4o', 'gpt-4-turbo', 'gpt-4'];
                        _i = 0, models_1 = models;
                        _a.label = 1;
                    case 1:
                        if (!(_i < models_1.length)) return [3 /*break*/, 4];
                        model = models_1[_i];
                        return [4 /*yield*/, this.checkModelAvailability(model)];
                    case 2:
                        isAvailable = _a.sent();
                        if (isAvailable) {
                            console.log("\u2705 \u0412\u044B\u0431\u0440\u0430\u043D\u0430 \u043C\u043E\u0434\u0435\u043B\u044C: " + model + " \u0434\u043B\u044F " + modelType);
                            return [2 /*return*/, model];
                        }
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        fallback = modelType === 'gpt5' ? 'gpt-4o' : 'gpt-4o';
                        console.warn("\u26A0\uFE0F \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u043C fallback \u043C\u043E\u0434\u0435\u043B\u044C: " + fallback);
                        return [2 /*return*/, fallback];
                }
            });
        });
    };
    return EnhancedGPT5AgentSystem;
}());
exports.EnhancedGPT5AgentSystem = EnhancedGPT5AgentSystem;
// Обновленный конфиг с правильными моделями
exports.UPDATED_GPT5_CONFIG = {
    MODELS: {
        // Основные модели (обновите эти названия когда модели станут доступны)
        RESEARCHER_PRIMARY: 'o1-preview',
        RESEARCHER_FALLBACK: 'gpt-4o',
        CHARACTERISTICS_PRIMARY: 'gpt-4o',
        CHARACTERISTICS_FALLBACK: 'gpt-4-turbo',
        SEO_PRIMARY: 'gpt-4o',
        SEO_FALLBACK: 'gpt-4-turbo',
        // Экспериментальные модели (добавляйте новые сюда)
        EXPERIMENTAL: ['o1', 'gpt-5', 'gpt-4.1'],
        // Валидация моделей
        VALIDATE_AVAILABILITY: true,
        AUTO_FALLBACK: true // Автоматически переключаться на запасные
    },
    // Настройки для разных моделей
    MODEL_SETTINGS: {
        'o1-preview': {
            maxTokens: 32768,
            temperature: 1,
            supportsJsonMode: false,
            supportsImages: true,
            costPerToken: 0.015
        },
        'gpt-4o': {
            maxTokens: 4096,
            temperature: 0.1,
            supportsJsonMode: true,
            supportsImages: true,
            costPerToken: 0.005
        },
        'gpt-4-turbo': {
            maxTokens: 4096,
            temperature: 0.1,
            supportsJsonMode: true,
            supportsImages: true,
            costPerToken: 0.01
        }
    }
};
exports.enhancedGPT5AgentSystem = new EnhancedGPT5AgentSystem();
