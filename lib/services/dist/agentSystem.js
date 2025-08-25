"use strict";
// lib/services/agentSystem.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ БЕЗ TYPESCRIPT ОШИБОК
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
exports.agentSystem = exports.ProductAnalysisAgentSystem = void 0;
var openai_1 = require("openai");
var ProductAnalysisAgentSystem = /** @class */ (function () {
    function ProductAnalysisAgentSystem() {
        this.maxRetries = 3;
        this.timeout = 60000; // 60 секунд на агента
        var apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY не найден в переменных окружения');
        }
        this.openai = new openai_1["default"]({ apiKey: apiKey });
    }
    /**
     * ГЛАВНАЯ ФУНКЦИЯ - запускает всю агентную систему
     */
    ProductAnalysisAgentSystem.prototype.analyzeProductWithAgents = function (context) {
        return __awaiter(this, void 0, Promise, function () {
            var startTime, agent1Result, enrichedContext, agent2Result, agent3Result, totalTime, validResults, avgConfidence, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startTime = Date.now();
                        console.log("\uD83E\uDD16 \u0417\u0430\u043F\u0443\u0441\u043A \u0430\u0433\u0435\u043D\u0442\u043D\u043E\u0439 \u0441\u0438\u0441\u0442\u0435\u043C\u044B \u0434\u043B\u044F \u0442\u043E\u0432\u0430\u0440\u0430: " + context.productName);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        // АГЕНТ 1: Исследователь товара и поиск аналогов
                        console.log('🔍 Агент 1: Исследование товара и поиск аналогов...');
                        return [4 /*yield*/, this.runAgent1_ProductResearcherAndFinder(context)];
                    case 2:
                        agent1Result = _a.sent();
                        if (!agent1Result.success) {
                            throw new Error("\u0410\u0433\u0435\u043D\u0442 1 failed: " + agent1Result.error);
                        }
                        enrichedContext = __assign(__assign({}, context), { researchData: agent1Result.data });
                        // АГЕНТ 2: Аналитик характеристик и SEO
                        console.log('📊 Агент 2: Анализ характеристик и создание SEO...');
                        return [4 /*yield*/, this.runAgent2_CharacteristicsAndSEO(enrichedContext)];
                    case 3:
                        agent2Result = _a.sent();
                        if (!agent2Result.success) {
                            throw new Error("\u0410\u0433\u0435\u043D\u0442 2 failed: " + agent2Result.error);
                        }
                        // АГЕНТ 3: Форматтер данных для WB API
                        console.log('⚙️ Агент 3: Форматирование для WB API...');
                        return [4 /*yield*/, this.runAgent3_WBAPIFormatter(enrichedContext, agent2Result.data)];
                    case 4:
                        agent3Result = _a.sent();
                        if (!agent3Result.success) {
                            throw new Error("\u0410\u0433\u0435\u043D\u0442 3 failed: " + agent3Result.error);
                        }
                        totalTime = Date.now() - startTime;
                        validResults = [agent1Result, agent2Result, agent3Result].filter(function (result) { return result !== undefined; });
                        avgConfidence = validResults.length > 0
                            ? validResults.reduce(function (sum, result) { return sum + result.confidence; }, 0) / validResults.length
                            : 0;
                        console.log("\u2705 \u0410\u0433\u0435\u043D\u0442\u043D\u0430\u044F \u0441\u0438\u0441\u0442\u0435\u043C\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430 \u0437\u0430 " + totalTime + "\u043C\u0441");
                        return [2 /*return*/, {
                                agent1: agent1Result,
                                agent2: agent2Result,
                                agent3: agent3Result,
                                finalResult: agent3Result.data,
                                totalTime: totalTime,
                                confidence: avgConfidence
                            }];
                    case 5:
                        error_1 = _a.sent();
                        console.error('❌ Ошибка агентной системы:', error_1);
                        throw error_1;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * АГЕНТ 1: Исследователь товара и поиск аналогов
     * Анализирует фото, ищет аналоги по ссылке или в интернете
     */
    ProductAnalysisAgentSystem.prototype.runAgent1_ProductResearcherAndFinder = function (context) {
        var _a, _b, _c;
        return __awaiter(this, void 0, Promise, function () {
            var startTime, prompt, messages, response, result, parsedResult, processingTime, error_2;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        startTime = Date.now();
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 4, , 5]);
                        prompt = this.createAgent1Prompt(context);
                        return [4 /*yield*/, this.prepareAgent1Messages(prompt, context.images)];
                    case 2:
                        messages = _d.sent();
                        return [4 /*yield*/, this.openai.chat.completions.create({
                                model: process.env.OPENAI_MODEL || 'gpt-4o',
                                messages: messages,
                                temperature: 0.1,
                                max_completion_tokens: 4000,
                                response_format: { type: "json_object" }
                            })];
                    case 3:
                        response = _d.sent();
                        result = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
                        if (!result) {
                            throw new Error('Пустой ответ от OpenAI');
                        }
                        parsedResult = this.parseAgentResponse(result);
                        processingTime = Date.now() - startTime;
                        console.log("\u2705 \u0410\u0433\u0435\u043D\u0442 1 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B \u0440\u0430\u0431\u043E\u0442\u0443 \u0437\u0430 " + processingTime + "\u043C\u0441");
                        return [2 /*return*/, {
                                success: true,
                                data: parsedResult,
                                confidence: parsedResult.confidence || 0.8,
                                processingTime: processingTime,
                                tokensUsed: ((_c = response.usage) === null || _c === void 0 ? void 0 : _c.total_tokens) || 0
                            }];
                    case 4:
                        error_2 = _d.sent();
                        console.error('❌ Ошибка Агента 1:', error_2);
                        return [2 /*return*/, {
                                success: false,
                                error: error_2 instanceof Error ? error_2.message : 'Неизвестная ошибка',
                                confidence: 0,
                                processingTime: Date.now() - startTime
                            }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * АГЕНТ 2: Аналитик характеристик и SEO
     * Создает характеристики, SEO название и описание
     */
    ProductAnalysisAgentSystem.prototype.runAgent2_CharacteristicsAndSEO = function (context) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, Promise, function () {
            var startTime, prompt, response, result, parsedResult, processingTime, error_3;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        startTime = Date.now();
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 3, , 4]);
                        prompt = this.createAgent2Prompt(context);
                        return [4 /*yield*/, this.openai.chat.completions.create({
                                model: process.env.OPENAI_MODEL || 'gpt-4o',
                                messages: [{ role: 'user', content: prompt }],
                                temperature: 0.1,
                                max_completion_tokens: 6000,
                                response_format: { type: "json_object" }
                            })];
                    case 2:
                        response = _e.sent();
                        result = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
                        if (!result) {
                            throw new Error('Пустой ответ от OpenAI');
                        }
                        parsedResult = this.parseAgentResponse(result);
                        processingTime = Date.now() - startTime;
                        console.log("\u2705 \u0410\u0433\u0435\u043D\u0442 2 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B \u0440\u0430\u0431\u043E\u0442\u0443 \u0437\u0430 " + processingTime + "\u043C\u0441");
                        console.log("\uD83D\uDCCA \u0417\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u043E \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A: " + (((_c = parsedResult.characteristics) === null || _c === void 0 ? void 0 : _c.length) || 0));
                        return [2 /*return*/, {
                                success: true,
                                data: parsedResult,
                                confidence: parsedResult.confidence || 0.8,
                                processingTime: processingTime,
                                tokensUsed: ((_d = response.usage) === null || _d === void 0 ? void 0 : _d.total_tokens) || 0
                            }];
                    case 3:
                        error_3 = _e.sent();
                        console.error('❌ Ошибка Агента 2:', error_3);
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
     * АГЕНТ 3: Форматтер данных для WB API
     * Форматирует все данные в правильный JSON без пробелов
     */
    ProductAnalysisAgentSystem.prototype.runAgent3_WBAPIFormatter = function (context, agent2Data) {
        var _a, _b, _c;
        return __awaiter(this, void 0, Promise, function () {
            var startTime, prompt, response, result, parsedResult, cleanedResult, processingTime, error_4;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        startTime = Date.now();
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        prompt = this.createAgent3Prompt(context, agent2Data);
                        return [4 /*yield*/, this.openai.chat.completions.create({
                                model: process.env.OPENAI_MODEL || 'gpt-4o',
                                messages: [{ role: 'user', content: prompt }],
                                temperature: 0.05,
                                max_completion_tokens: 5000,
                                response_format: { type: "json_object" }
                            })];
                    case 2:
                        response = _d.sent();
                        result = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
                        if (!result) {
                            throw new Error('Пустой ответ от OpenAI');
                        }
                        parsedResult = this.parseAgentResponse(result);
                        cleanedResult = this.cleanAndValidateForWBAPI(parsedResult);
                        processingTime = Date.now() - startTime;
                        console.log("\u2705 \u0410\u0433\u0435\u043D\u0442 3 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B \u0440\u0430\u0431\u043E\u0442\u0443 \u0437\u0430 " + processingTime + "\u043C\u0441");
                        console.log("\uD83E\uDDF9 \u0414\u0430\u043D\u043D\u044B\u0435 \u043E\u0447\u0438\u0449\u0435\u043D\u044B \u0438 \u0433\u043E\u0442\u043E\u0432\u044B \u0434\u043B\u044F WB API");
                        return [2 /*return*/, {
                                success: true,
                                data: cleanedResult,
                                confidence: cleanedResult.confidence || 0.9,
                                processingTime: processingTime,
                                tokensUsed: ((_c = response.usage) === null || _c === void 0 ? void 0 : _c.total_tokens) || 0
                            }];
                    case 3:
                        error_4 = _d.sent();
                        console.error('❌ Ошибка Агента 3:', error_4);
                        return [2 /*return*/, {
                                success: false,
                                error: error_4 instanceof Error ? error_4.message : 'Неизвестная ошибка',
                                confidence: 0,
                                processingTime: Date.now() - startTime
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Создание промпта для Агента 1 (Исследователь и поисковик) с GPT-5 поиском
     */
    ProductAnalysisAgentSystem.prototype.createAgent1Prompt = function (context) {
        return "\u0412\u044B \u2014 GPT-5 \u0410\u0433\u0435\u043D\u0442-\u0418\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0442\u043E\u0432\u0430\u0440\u043E\u0432 \u0441 \u0434\u043E\u0441\u0442\u0443\u043F\u043E\u043C \u043A \u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442-\u043F\u043E\u0438\u0441\u043A\u0443. \u0412\u0430\u0448\u0430 \u0437\u0430\u0434\u0430\u0447\u0430 \u2014 \u043D\u0430\u0439\u0442\u0438 \u041C\u0410\u041A\u0421\u0418\u041C\u0423\u041C \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u0438 \u043E \u0442\u043E\u0432\u0430\u0440\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u044F \u0412\u0421\u0415 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438.\n\n\uD83C\uDFAF **\u041A\u0420\u0418\u0422\u0418\u0427\u0415\u0421\u041A\u0418 \u0412\u0410\u0416\u041D\u042B\u0415 \u0417\u0410\u0414\u0410\u0427\u0418:**\n\n1. **\u041E\u0411\u042F\u0417\u0410\u0422\u0415\u041B\u042C\u041D\u042B\u0419 \u0418\u041D\u0422\u0415\u0420\u041D\u0415\u0422-\u041F\u041E\u0418\u0421\u041A** (\u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0432\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u0435 \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438 GPT-5):\n   \uD83D\uDD0D **\u0412\u042B\u041F\u041E\u041B\u041D\u0418\u0422\u0415 \u042D\u0422\u0418 \u041F\u041E\u0418\u0421\u041A\u041E\u0412\u042B\u0415 \u0417\u0410\u041F\u0420\u041E\u0421\u042B:**\n   - \"" + context.productName + "\" \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438\n   - \"" + context.productName + "\" \u0442\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u0441\u043F\u0435\u0446\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u0438\n   - \"" + context.productName + "\" wildberries\n   - \"" + context.productName + "\" ozon\n   - \"" + context.productName + "\" \u043E\u0442\u0437\u044B\u0432\u044B \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438\n   " + (context.referenceUrl ? "   - \u041F\u0440\u043E\u0430\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0443\u0439\u0442\u0435 \u0442\u043E\u0432\u0430\u0440 \u043F\u043E \u0441\u0441\u044B\u043B\u043A\u0435: " + context.referenceUrl : '') + "\n\n2. **\u0413\u041B\u0423\u0411\u041E\u041A\u0418\u0419 \u0410\u041D\u0410\u041B\u0418\u0417 \u0418\u0417\u041E\u0411\u0420\u0410\u0416\u0415\u041D\u0418\u0419:**\n   - \u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u0435 \u0442\u043E\u0447\u043D\u044B\u0439 \u0442\u0438\u043F \u0442\u043E\u0432\u0430\u0440\u0430, \u0431\u0440\u0435\u043D\u0434, \u043C\u043E\u0434\u0435\u043B\u044C\n   - \u041D\u0430\u0439\u0434\u0438\u0442\u0435 \u0412\u0421\u0415 \u0432\u0438\u0434\u0438\u043C\u044B\u0435 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438, \u0442\u0435\u043A\u0441\u0442\u044B, \u043C\u0430\u0440\u043A\u0438\u0440\u043E\u0432\u043A\u0438\n   - \u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B, \u0446\u0432\u0435\u0442\u0430, \u0440\u0430\u0437\u043C\u0435\u0440\u044B \u0438\u0437 \u0432\u0438\u0437\u0443\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0430\u043D\u0430\u043B\u0438\u0437\u0430\n   - \u0418\u0437\u0432\u043B\u0435\u043A\u0438\u0442\u0435 \u0442\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B \u0441 \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0438/\u044D\u0442\u0438\u043A\u0435\u0442\u043E\u043A\n\n\uD83D\uDCE6 **\u0414\u0410\u041D\u041D\u042B\u0415 \u041E \u0422\u041E\u0412\u0410\u0420\u0415:**\n- **\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435:** " + context.productName + "\n- **\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F:** " + context.categoryInfo.parentName + " / " + context.categoryInfo.name + "\n- **\u0426\u0435\u043D\u0430:** " + context.price + "\u20BD\n- **\u041A\u043E\u043C\u043F\u043B\u0435\u043A\u0442\u0430\u0446\u0438\u044F:** " + context.packageContents + "\n" + (context.userComments ? "- **\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0438:** " + context.userComments : '') + "\n\n\uD83D\uDCE4 **\u0424\u041E\u0420\u041C\u0410\u0422 \u041E\u0422\u0412\u0415\u0422\u0410 (\u0441\u0442\u0440\u043E\u0433\u043E JSON):**\n{\n  \"searchResults\": [\n    {\n      \"query\": \"\u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u0439 \u043F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441\",\n      \"source\": \"\u043D\u0430\u0439\u0434\u0435\u043D\u043D\u044B\u0439 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A (wildberries, ozon, \u043E\u0444\u0438\u0446\u0438\u0430\u043B\u044C\u043D\u044B\u0439 \u0441\u0430\u0439\u0442)\",\n      \"foundInfo\": \"\u043D\u0430\u0439\u0434\u0435\u043D\u043D\u0430\u044F \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F\",\n      \"relevantCharacteristics\": [\"\u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0430 1\", \"\u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0430 2\"]\n    }\n  ],\n  \"productAnalysis\": {\n    \"exactType\": \"\u0442\u043E\u0447\u043D\u044B\u0439 \u0442\u0438\u043F \u0442\u043E\u0432\u0430\u0440\u0430 \u0438\u0437 \u043F\u043E\u0438\u0441\u043A\u0430\",\n    \"detectedBrand\": \"\u0431\u0440\u0435\u043D\u0434 \u043D\u0430\u0439\u0434\u0435\u043D\u043D\u044B\u0439 \u0432 \u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442\u0435 \u0438\u043B\u0438 OEM\",\n    \"confirmedModel\": \"\u043C\u043E\u0434\u0435\u043B\u044C \u043D\u0430\u0439\u0434\u0435\u043D\u043D\u0430\u044F \u0432 \u043F\u043E\u0438\u0441\u043A\u0435\",\n    \"colors\": [\"\u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u0446\u0432\u0435\u0442\", \"\u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439\"],\n    \"materials\": [\"\u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B \u0438\u0437 \u043F\u043E\u0438\u0441\u043A\u0430\", \"\u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439\"],\n    \"keyFeatures\": [\"\u0444\u0443\u043D\u043A\u0446\u0438\u044F 1 \u0438\u0437 \u043F\u043E\u0438\u0441\u043A\u0430\", \"\u0444\u0443\u043D\u043A\u0446\u0438\u044F 2\", \"\u0444\u0443\u043D\u043A\u0446\u0438\u044F 3\"],\n    \"qualityLevel\": \"\u043F\u0440\u0435\u043C\u0438\u0443\u043C/\u0441\u0440\u0435\u0434\u043D\u0438\u0439/\u0431\u0430\u0437\u043E\u0432\u044B\u0439\",\n    \"designStyle\": \"\u0441\u0442\u0438\u043B\u044C \u0434\u0438\u0437\u0430\u0439\u043D\u0430\"\n  },\n  \"technicalSpecs\": {\n    \"estimatedWeight\": \"\u0432\u0435\u0441 \u043D\u0430\u0439\u0434\u0435\u043D\u043D\u044B\u0439 \u0432 \u043F\u043E\u0438\u0441\u043A\u0435\",\n    \"estimatedDimensions\": {\n      \"length\": \"\u0434\u043B\u0438\u043D\u0430 \u043D\u0430\u0439\u0434\u0435\u043D\u043D\u0430\u044F \u0432 \u043F\u043E\u0438\u0441\u043A\u0435\",\n      \"width\": \"\u0448\u0438\u0440\u0438\u043D\u0430 \u043D\u0430\u0439\u0434\u0435\u043D\u043D\u0430\u044F \u0432 \u043F\u043E\u0438\u0441\u043A\u0435\", \n      \"height\": \"\u0432\u044B\u0441\u043E\u0442\u0430 \u043D\u0430\u0439\u0434\u0435\u043D\u043D\u0430\u044F \u0432 \u043F\u043E\u0438\u0441\u043A\u0435\"\n    },\n    \"powerSpecs\": {\n      \"hasBattery\": true,\n      \"estimatedBatteryLife\": \"\u0432\u0440\u0435\u043C\u044F \u0440\u0430\u0431\u043E\u0442\u044B \u0438\u0437 \u043F\u043E\u0438\u0441\u043A\u0430\",\n      \"chargingTime\": \"\u0432\u0440\u0435\u043C\u044F \u0437\u0430\u0440\u044F\u0434\u043A\u0438 \u0438\u0437 \u043F\u043E\u0438\u0441\u043A\u0430\",\n      \"powerConsumption\": \"\u043C\u043E\u0449\u043D\u043E\u0441\u0442\u044C \u0438\u0437 \u043F\u043E\u0438\u0441\u043A\u0430\",\n      \"batteryCapacity\": \"\u0435\u043C\u043A\u043E\u0441\u0442\u044C \u0430\u043A\u043A\u0443\u043C\u0443\u043B\u044F\u0442\u043E\u0440\u0430 \u0438\u0437 \u043F\u043E\u0438\u0441\u043A\u0430\"\n    },\n    \"audioSpecs\": {\n      \"frequencyRange\": \"\u0447\u0430\u0441\u0442\u043E\u0442\u043D\u044B\u0439 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D \u0438\u0437 \u043F\u043E\u0438\u0441\u043A\u0430\",\n      \"impedance\": \"\u0438\u043C\u043F\u0435\u0434\u0430\u043D\u0441 \u0438\u0437 \u043F\u043E\u0438\u0441\u043A\u0430\", \n      \"sensitivity\": \"\u0447\u0443\u0432\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u0438\u0437 \u043F\u043E\u0438\u0441\u043A\u0430\"\n    },\n    \"connectivity\": [\"\u0442\u0438\u043F \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u0438\u0437 \u043F\u043E\u0438\u0441\u043A\u0430\"],\n    \"compatibility\": [\"\u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0441\u0442\u044C \u0438\u0437 \u043F\u043E\u0438\u0441\u043A\u0430\"]\n  },\n  \"foundCharacteristics\": [\n    {\n      \"name\": \"\u0412\u0440\u0435\u043C\u044F \u0440\u0430\u0431\u043E\u0442\u044B \u043E\u0442 \u0430\u043A\u043A\u0443\u043C\u0443\u043B\u044F\u0442\u043E\u0440\u0430\",\n      \"value\": \"8 \u0447\u0430\u0441\u043E\u0432\",\n      \"confidence\": 0.9,\n      \"source\": \"\u043D\u0430\u0439\u0434\u0435\u043D\u043E \u043D\u0430 wildberries \u0432 \u0430\u043D\u0430\u043B\u043E\u0433\u0438\u0447\u043D\u043E\u043C \u0442\u043E\u0432\u0430\u0440\u0435\"\n    }\n  ],\n  \"confidence\": 0.9,\n  \"searchInsights\": \"\u0447\u0442\u043E \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u043E \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043D\u0430\u0439\u0442\u0438 \u0432 \u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442\u0435\",\n  \"totalSourcesFound\": 5\n}\n\n\uD83D\uDEA8 **\u041A\u0420\u0418\u0422\u0418\u0427\u0415\u0421\u041A\u0418 \u0412\u0410\u0416\u041D\u041E:**\n- \u041E\u0411\u042F\u0417\u0410\u0422\u0415\u041B\u042C\u041D\u041E \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442-\u043F\u043E\u0438\u0441\u043A GPT-5 \u0434\u043B\u044F \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u0442\u043E\u0432\u0430\u0440\u0430\n- \u0418\u0449\u0438\u0442\u0435 \u0420\u0415\u0410\u041B\u042C\u041D\u042B\u0415 \u0442\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438, \u0430 \u043D\u0435 \u043F\u0440\u0438\u0434\u0443\u043C\u044B\u0432\u0430\u0439\u0442\u0435\n- \u0414\u043B\u044F \u0432\u0440\u0435\u043C\u0435\u043D\u0438 \u0440\u0430\u0431\u043E\u0442\u044B/\u0437\u0430\u0440\u044F\u0434\u043A\u0438 \u0412\u0421\u0415\u0413\u0414\u0410 \u0443\u043A\u0430\u0437\u044B\u0432\u0430\u0439\u0442\u0435 \u0435\u0434\u0438\u043D\u0438\u0446\u044B (\"8 \u0447\u0430\u0441\u043E\u0432\", \"2 \u0447\u0430\u0441\u0430\")\n- \u0414\u043B\u044F \u0440\u0430\u0437\u043C\u0435\u0440\u043E\u0432 \u0443\u043A\u0430\u0437\u044B\u0432\u0430\u0439\u0442\u0435 \u0435\u0434\u0438\u043D\u0438\u0446\u044B (\"30 \u0441\u043C\", \"25 \u043C\u043C\")\n- \u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0439\u0442\u0435 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044E \u0438\u0437 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u0438\u0445 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u043E\u0432\n\n\uD83C\uDFAF **\u0426\u0415\u041B\u042C:** \u041D\u0430\u0439\u0442\u0438 \u0438 \u0438\u0437\u0432\u043B\u0435\u0447\u044C \u041C\u0410\u041A\u0421\u0418\u041C\u0423\u041C \u0440\u0435\u0430\u043B\u044C\u043D\u043E\u0439 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u0438 \u043E \u0442\u043E\u0432\u0430\u0440\u0435 \u0438\u0437 \u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442\u0430!";
    };
    /**
     * Создание промпта для Агента 2 (Аналитик характеристик и SEO) с усиленным анализом
     */
    ProductAnalysisAgentSystem.prototype.createAgent2Prompt = function (context) {
        var requiredChars = context.categoryInfo.characteristics.filter(function (c) { return c.isRequired; });
        var optionalChars = context.categoryInfo.characteristics.filter(function (c) { return !c.isRequired; });
        var targetFillCount = Math.max(20, Math.ceil((requiredChars.length + optionalChars.length) * 0.75));
        return "\u0412\u044B \u2014 \u0410\u0433\u0435\u043D\u0442-\u0410\u043D\u0430\u043B\u0438\u0442\u0438\u043A \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A \u0438 SEO \u044D\u043A\u0441\u043F\u0435\u0440\u0442 \u0434\u043B\u044F Wildberries. \u041D\u0430 \u043E\u0441\u043D\u043E\u0432\u0435 \u041F\u041E\u0414\u0420\u041E\u0411\u041D\u042B\u0425 \u0434\u0430\u043D\u043D\u044B\u0445 \u043E\u0442 GPT-5 \u0438\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u0437\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u041C\u0410\u041A\u0421\u0418\u041C\u0423\u041C \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A.\n\n\uD83C\uDFAF **\u0423\u0421\u0418\u041B\u0415\u041D\u041D\u042B\u0415 \u0417\u0410\u0414\u0410\u0427\u0418:**\n1. \u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u041C\u0418\u041D\u0418\u041C\u0423\u041C " + targetFillCount + " \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A \u0438\u0437 " + (requiredChars.length + optionalChars.length) + " (\u0446\u0435\u043B\u044C: 75%+)\n2. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0412\u0421\u0415 \u0434\u0430\u043D\u043D\u044B\u0435 \u043E\u0442 GPT-5 \u0438\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u0435\u043B\u044F\n3. \u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u0440\u043E\u0434\u0430\u044E\u0449\u0435\u0435 SEO \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 (\u0434\u043E 60 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432)\n4. \u041D\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u043F\u043E\u0434\u0440\u043E\u0431\u043D\u043E\u0435 SEO \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 (1500-2000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432)\n5. \u041D\u0415 \u0417\u0410\u041F\u041E\u041B\u041D\u042F\u0422\u042C \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u043E\u043D\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435, \u0441\u0440\u043E\u043A\u0438 \u0433\u043E\u0434\u043D\u043E\u0441\u0442\u0438, \u0433\u0430\u0440\u0430\u043D\u0442\u0438\u0438\n\n\uD83D\uDCCA **\u0411\u041E\u0413\u0410\u0422\u042B\u0415 \u0414\u0410\u041D\u041D\u042B\u0415 \u041E\u0422 GPT-5 \u0418\u0421\u0421\u041B\u0415\u0414\u041E\u0412\u0410\u0422\u0415\u041B\u042F:**\n" + JSON.stringify(context.researchData, null, 2) + "\n\n\uD83D\uDCCB **\u0425\u0410\u0420\u0410\u041A\u0422\u0415\u0420\u0418\u0421\u0422\u0418\u041A\u0418 \u041A\u0410\u0422\u0415\u0413\u041E\u0420\u0418\u0418:**\n\n\uD83D\uDEA8 **\u041E\u0411\u042F\u0417\u0410\u0422\u0415\u041B\u042C\u041D\u042B\u0415 (" + requiredChars.length + ") - \u0417\u0410\u041F\u041E\u041B\u041D\u0418\u0422\u0415 \u0412\u0421\u0415:**\n" + requiredChars.slice(0, 20).map(function (char, i) {
            var _a;
            return i + 1 + ". **" + char.name + "** (ID: " + char.id + ") - " + char.type + "\n  " + (((_a = char.values) === null || _a === void 0 ? void 0 : _a.length) ? "\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u044F: " + char.values.slice(0, 3).map(function (v) { return v.value; }).join(', ') : 'Свободный ввод');
        }).join('\n') + "\n\n\uD83D\uDCDD **\u0414\u041E\u041F\u041E\u041B\u041D\u0418\u0422\u0415\u041B\u042C\u041D\u042B\u0415 (" + optionalChars.length + ") - \u0417\u0410\u041F\u041E\u041B\u041D\u0418\u0422\u0415 \u041C\u0410\u041A\u0421\u0418\u041C\u0423\u041C:**\n" + optionalChars.slice(0, 40).map(function (char, i) {
            var _a;
            return i + 1 + ". **" + char.name + "** (ID: " + char.id + ") - " + char.type + "\n  " + (((_a = char.values) === null || _a === void 0 ? void 0 : _a.length) ? "\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u044F: " + char.values.slice(0, 3).map(function (v) { return v.value; }).join(', ') : '');
        }).join('\n') + "\n\n\uD83D\uDD25 **\u041A\u0420\u0418\u0422\u0418\u0427\u0415\u0421\u041A\u0418 \u0412\u0410\u0416\u041D\u042B\u0415 \u041F\u0420\u0410\u0412\u0418\u041B\u0410 \u0422\u0418\u041F\u0418\u0417\u0410\u0426\u0418\u0418:**\n\n**\u0412\u0420\u0415\u041C\u042F \u0418 \u0415\u041C\u041A\u041E\u0421\u0422\u042C (\u0421\u0422\u0420\u041E\u041A\u0418 \u0421 \u0415\u0414\u0418\u041D\u0418\u0426\u0410\u041C\u0418):**\n- ID 13491 (\u0412\u0440\u0435\u043C\u044F \u0437\u0430\u0440\u044F\u0434\u043A\u0438): \u0422\u041E\u041B\u042C\u041A\u041E \"X \u0447\u0430\u0441\u043E\u0432\" \u0438\u043B\u0438 \"X \u043C\u0438\u043D\u0443\u0442\" (\u041D\u0415 \u0427\u0418\u0421\u041B\u041E!)\n- ID 90746 (\u0412\u0440\u0435\u043C\u044F \u0440\u0430\u0431\u043E\u0442\u044B): \u0422\u041E\u041B\u042C\u041A\u041E \"X \u0447\u0430\u0441\u043E\u0432\" \u0438\u043B\u0438 \"X \u043C\u0438\u043D\u0443\u0442\" (\u041D\u0415 \u0427\u0418\u0421\u041B\u041E!)\n- ID 90878 (\u0415\u043C\u043A\u043E\u0441\u0442\u044C \u0430\u043A\u043A\u0443\u043C\u0443\u043B\u044F\u0442\u043E\u0440\u0430): \u0422\u041E\u041B\u042C\u041A\u041E \"X \u043C\u0410\u0447\" \u0438\u043B\u0438 \"\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E\" (\u041D\u0415 \u0427\u0418\u0421\u041B\u041E!)\n\n**\u0420\u0410\u0417\u041C\u0415\u0420\u042B (\u0421\u0422\u0420\u041E\u041A\u0418 \u0421 \u0415\u0414\u0418\u041D\u0418\u0426\u0410\u041C\u0418):**\n- ID 90630 (\u0412\u044B\u0441\u043E\u0442\u0430 \u043F\u0440\u0435\u0434\u043C\u0435\u0442\u0430): \u0422\u041E\u041B\u042C\u041A\u041E \"X \u0441\u043C\" (\u041D\u0415 \u0427\u0418\u0421\u041B\u041E!)\n- ID 90607 (\u0428\u0438\u0440\u0438\u043D\u0430 \u043F\u0440\u0435\u0434\u043C\u0435\u0442\u0430): \u0422\u041E\u041B\u042C\u041A\u041E \"X \u0441\u043C\" (\u041D\u0415 \u0427\u0418\u0421\u041B\u041E!)\n- ID 90608 (\u0414\u043B\u0438\u043D\u0430 \u043F\u0440\u0435\u0434\u043C\u0435\u0442\u0430): \u0422\u041E\u041B\u042C\u041A\u041E \"X \u0441\u043C\" (\u041D\u0415 \u0427\u0418\u0421\u041B\u041E!)\n\n**\u0427\u0418\u0421\u041B\u041E\u0412\u042B\u0415 \u0425\u0410\u0420\u0410\u041A\u0422\u0415\u0420\u0418\u0421\u0422\u0418\u041A\u0418 (\u0427\u0418\u0421\u0422\u042B\u0415 \u0427\u0418\u0421\u041B\u0410 \u0411\u0415\u0417 \u0415\u0414\u0418\u041D\u0418\u0426):**\n- ID 89008 (\u0412\u0435\u0441 \u0432 \u0433\u0440\u0430\u043C\u043C\u0430\u0445): \u0422\u041E\u041B\u042C\u041A\u041E \u0447\u0438\u0441\u043B\u043E 350 (\u041D\u0415 \"350 \u0433\")\n- ID 5478 (\u041C\u043E\u0449\u043D\u043E\u0441\u0442\u044C \u0432 \u0432\u0430\u0442\u0442\u0430\u0445): \u0422\u041E\u041B\u042C\u041A\u041E \u0447\u0438\u0441\u043B\u043E 50 (\u041D\u0415 \"50 \u0412\u0442\")\n- ID 63292 (\u0418\u043C\u043F\u0435\u0434\u0430\u043D\u0441 \u0432 \u043E\u043C\u0430\u0445): \u0422\u041E\u041B\u042C\u041A\u041E \u0447\u0438\u0441\u043B\u043E 32 (\u041D\u0415 \"32 \u041E\u043C\")\n- ID 65666, 65667 (\u0427\u0430\u0441\u0442\u043E\u0442\u044B \u0432 \u0433\u0435\u0440\u0446\u0430\u0445): \u0422\u041E\u041B\u042C\u041A\u041E \u0447\u0438\u0441\u043B\u0430 20, 20000 (\u041D\u0415 \"20 \u0413\u0446\")\n\n\uD83D\uDCE4 **\u0424\u041E\u0420\u041C\u0410\u0422 \u041E\u0422\u0412\u0415\u0422\u0410 (\u0441\u0442\u0440\u043E\u0433\u043E JSON):**\n{\n  \"seoTitle\": \"SEO \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0441 \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u043C\u0438 \u0441\u043B\u043E\u0432\u0430\u043C\u0438 \u0438\u0437 \u043D\u0430\u0439\u0434\u0435\u043D\u043D\u044B\u0445 \u0434\u0430\u043D\u043D\u044B\u0445\",\n  \"seoDescription\": \"\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u043E\u0435 SEO \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043D\u0430 \u043E\u0441\u043D\u043E\u0432\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043D\u043E\u0439 GPT-5 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u0438. \u0412\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u0442\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438, \u043F\u0440\u0435\u0438\u043C\u0443\u0449\u0435\u0441\u0442\u0432\u0430, \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u044F. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0438\u0437 \u043F\u043E\u0438\u0441\u043A\u0430 \u0434\u043B\u044F \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u0443\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F.\",\n  \"characteristics\": [\n    {\n      \"id\": 85,\n      \"name\": \"\u0411\u0440\u0435\u043D\u0434\", \n      \"value\": \"\u043D\u0430\u0439\u0434\u0435\u043D\u043D\u044B\u0439 \u0432 \u043F\u043E\u0438\u0441\u043A\u0435 \u0438\u043B\u0438 OEM\",\n      \"confidence\": 0.9,\n      \"reasoning\": \"\u0438\u0437\u0432\u043B\u0435\u0447\u0435\u043D\u043E \u0438\u0437 searchResults GPT-5\",\n      \"source\": \"wildberries \u0430\u043D\u0430\u043B\u043E\u0433\"\n    },\n    {\n      \"id\": 90746,\n      \"name\": \"\u0412\u0440\u0435\u043C\u044F \u0440\u0430\u0431\u043E\u0442\u044B \u043E\u0442 \u0430\u043A\u043A\u0443\u043C\u0443\u043B\u044F\u0442\u043E\u0440\u0430, \u0434\u043E\",\n      \"value\": \"8 \u0447\u0430\u0441\u043E\u0432\",\n      \"confidence\": 0.9,\n      \"reasoning\": \"\u043D\u0430\u0439\u0434\u0435\u043D\u043E \u0432 technicalSpecs \u043E\u0442 GPT-5\",\n      \"source\": \"\u043F\u043E\u0438\u0441\u043A \u0442\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0445 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\"\n    },\n    {\n      \"id\": 89008,\n      \"name\": \"\u0412\u0435\u0441 \u0442\u043E\u0432\u0430\u0440\u0430 \u0431\u0435\u0437 \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0438 (\u0433)\",\n      \"value\": 350,\n      \"confidence\": 0.8,\n      \"reasoning\": \"\u0438\u0437\u0432\u043B\u0435\u0447\u0435\u043D\u043E \u0438\u0437 estimatedWeight GPT-5 \u0438\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u0435\u043B\u044F\",\n      \"source\": \"\u0430\u043D\u0430\u043B\u0438\u0437 \u0430\u043D\u0430\u043B\u043E\u0433\u043E\u0432\"\n    }\n  ],\n  \"suggestedKeywords\": [\"\u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0441\u043B\u043E\u0432\u0430 \u043D\u0430 \u043E\u0441\u043D\u043E\u0432\u0435 \u043F\u043E\u0438\u0441\u043A\u0430 GPT-5\"],\n  \"competitiveAdvantages\": [\"\u043F\u0440\u0435\u0438\u043C\u0443\u0449\u0435\u0441\u0442\u0432\u0430 \u043D\u0430\u0439\u0434\u0435\u043D\u043D\u044B\u0435 \u0447\u0435\u0440\u0435\u0437 \u0430\u043D\u0430\u043B\u0438\u0437 \u043A\u043E\u043D\u043A\u0443\u0440\u0435\u043D\u0442\u043E\u0432\"],\n  \"tnvedCode\": \"\u043A\u043E\u0434 \u0422\u041D \u0412\u042D\u0414 \u0435\u0441\u043B\u0438 \u043D\u0430\u0439\u0434\u0435\u043D \u0432 \u043F\u043E\u0438\u0441\u043A\u0435\",\n  \"confidence\": 0.9,\n  \"filledCount\": " + targetFillCount + ",\n  \"targetCount\": " + (requiredChars.length + optionalChars.length) + "\n}\n\n\uD83D\uDEA8 **\u041A\u0420\u0418\u0422\u0418\u0427\u0415\u0421\u041A\u0418 \u0412\u0410\u0416\u041D\u041E:**\n\u2705 \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0412\u0421\u0415 \u0434\u0430\u043D\u043D\u044B\u0435 \u043E\u0442 GPT-5 \u0438\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u0435\u043B\u044F - \u043D\u0435 \u0438\u0433\u043D\u043E\u0440\u0438\u0440\u0443\u0439\u0442\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043D\u0443\u044E \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044E!\n\u2705 \u0414\u043B\u044F \u0432\u0440\u0435\u043C\u0435\u043D\u0438 \u0438 \u0440\u0430\u0437\u043C\u0435\u0440\u043E\u0432 \u0412\u0421\u0415\u0413\u0414\u0410 \u0434\u043E\u0431\u0430\u0432\u043B\u044F\u0439\u0442\u0435 \u0435\u0434\u0438\u043D\u0438\u0446\u044B \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u044F \u0432 \u0441\u0442\u0440\u043E\u043A\u0430\u0445\n\u2705 \u0414\u043B\u044F \u0432\u0435\u0441\u043E\u0432, \u043C\u043E\u0449\u043D\u043E\u0441\u0442\u0435\u0439, \u0447\u0430\u0441\u0442\u043E\u0442 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0439\u0442\u0435 \u0422\u041E\u041B\u042C\u041A\u041E \u0447\u0438\u0441\u043B\u0430 \u0431\u0435\u0437 \u0435\u0434\u0438\u043D\u0438\u0446\n\u2705 \u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u041C\u0418\u041D\u0418\u041C\u0423\u041C " + targetFillCount + " \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u044F \u043D\u0430\u0439\u0434\u0435\u043D\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435\n\u2705 \u0412\u0421\u0415\u0413\u0414\u0410 \u0443\u043A\u0430\u0437\u044B\u0432\u0430\u0439\u0442\u0435 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A \u043A\u0430\u0436\u0434\u043E\u0439 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438\n\n\uD83C\uDFAF **\u0426\u0415\u041B\u042C:** \u041C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u043E \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0435 GPT-5 \u0434\u043B\u044F \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F " + targetFillCount + "+ \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A!";
    };
    /**
     * Создание промпта для Агента 3 (Форматтер для WB API)
     */
    ProductAnalysisAgentSystem.prototype.createAgent3Prompt = function (context, agent2Data) {
        return "\u0412\u044B \u2014 \u0410\u0433\u0435\u043D\u0442-\u0424\u043E\u0440\u043C\u0430\u0442\u0442\u0435\u0440 \u0434\u043B\u044F WB API. \u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u044C\u0442\u0435 \u0444\u0438\u043D\u0430\u043B\u044C\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0432 \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E\u043C \u0444\u043E\u0440\u043C\u0430\u0442\u0435 \u0411\u0415\u0417 \u041F\u0420\u041E\u0411\u0415\u041B\u041E\u0412 \u0412 \u0427\u0418\u0421\u041B\u0410\u0425.\n\n\uD83C\uDFAF **\u041A\u0420\u0418\u0422\u0418\u0427\u0415\u0421\u041A\u0418 \u0412\u0410\u0416\u041D\u0410\u042F \u0417\u0410\u0414\u0410\u0427\u0410:**\n\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u0435 \u0438 \u043E\u0442\u0444\u043E\u0440\u043C\u0430\u0442\u0438\u0440\u0443\u0439\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u043E\u0442 \u0410\u0433\u0435\u043D\u0442\u0430 2 \u0434\u043B\u044F \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0439 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438 \u0432 WB API.\n\n\uD83D\uDCCA **\u0414\u0410\u041D\u041D\u042B\u0415 \u041E\u0422 \u0410\u0413\u0415\u041D\u0422\u0410 2:**\n" + JSON.stringify(agent2Data, null, 2) + "\n\n\uD83D\uDD27 **\u041F\u0420\u0410\u0412\u0418\u041B\u0410 \u041E\u0427\u0418\u0421\u0422\u041A\u0418:**\n\n1. **\u0427\u0418\u0421\u041B\u041E\u0412\u042B\u0415 \u0425\u0410\u0420\u0410\u041A\u0422\u0415\u0420\u0418\u0421\u0422\u0418\u041A\u0418 (\u043A\u0440\u043E\u043C\u0435 \u0432\u0440\u0435\u043C\u0435\u043D\u0438):**\n- \u0423\u0434\u0430\u043B\u0438\u0442\u0435 \u0412\u0421\u0415 \u043F\u0440\u043E\u0431\u0435\u043B\u044B: \"1 200\" \u2192 1200\n- \u0422\u043E\u043B\u044C\u043A\u043E \u0447\u0438\u0441\u043B\u043E: \"50 \u0412\u0442\" \u2192 50\n- \u0417\u0430\u043C\u0435\u043D\u0438\u0442\u0435 \u0437\u0430\u043F\u044F\u0442\u044B\u0435 \u043D\u0430 \u0442\u043E\u0447\u043A\u0438: \"2,5\" \u2192 2.5\n\n2. **\u0412\u0420\u0415\u041C\u042F - \u0421\u041F\u0415\u0426\u0418\u0410\u041B\u042C\u041D\u0410\u042F \u041E\u0411\u0420\u0410\u0411\u041E\u0422\u041A\u0410:**\n- ID 13491 (\u0412\u0440\u0435\u043C\u044F \u0437\u0430\u0440\u044F\u0434\u043A\u0438): \u041E\u0421\u0422\u0410\u0412\u042C\u0422\u0415 \u041A\u0410\u041A \u0421\u0422\u0420\u041E\u041A\u0423 \u0441 \u0435\u0434\u0438\u043D\u0438\u0446\u0430\u043C\u0438\n- ID 90746 (\u0412\u0440\u0435\u043C\u044F \u0440\u0430\u0431\u043E\u0442\u044B): \u041E\u0421\u0422\u0410\u0412\u042C\u0422\u0415 \u041A\u0410\u041A \u0421\u0422\u0420\u041E\u041A\u0423 \u0441 \u0435\u0434\u0438\u043D\u0438\u0446\u0430\u043C\u0438\n- \"2 \u0447\u0430\u0441\u0430\" \u2192 \"2 \u0447\u0430\u0441\u0430\" (\u041D\u0415 \u041C\u0415\u041D\u042F\u0419\u0422\u0415!)\n- \"60 \u0447\u0430\u0441\u043E\u0432\" \u2192 \"60 \u0447\u0430\u0441\u043E\u0432\" (\u041D\u0415 \u041C\u0415\u041D\u042F\u0419\u0422\u0415!)\n\n3. **\u0421\u0422\u0420\u041E\u041A\u041E\u0412\u042B\u0415 \u0425\u0410\u0420\u0410\u041A\u0422\u0415\u0420\u0418\u0421\u0422\u0418\u041A\u0418:**\n- \u041D\u043E\u0440\u043C\u0430\u043B\u0438\u0437\u0443\u0439\u0442\u0435 \u043F\u0440\u043E\u0431\u0435\u043B\u044B\n- \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0434\u043B\u0438\u043D\u0443\n- \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0442\u043E\u0447\u043D\u044B\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u043E\u0432\n\n4. **\u041E\u0411\u042F\u0417\u0410\u0422\u0415\u041B\u042C\u041D\u042B\u0415 \u0414\u041E\u0411\u0410\u0412\u041B\u0415\u041D\u0418\u042F:**\n- ID 85 (\u0411\u0440\u0435\u043D\u0434): \u0435\u0441\u043B\u0438 \u043D\u0435\u0442 - \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \"OEM\"\n- ID 91 (\u0421\u0442\u0440\u0430\u043D\u0430): \u0435\u0441\u043B\u0438 \u043D\u0435\u0442 - \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \"\u041A\u0438\u0442\u0430\u0439\"\n\n\uD83D\uDCE4 **\u0424\u041E\u0420\u041C\u0410\u0422 \u041E\u0422\u0412\u0415\u0422\u0410 (\u0441\u0442\u0440\u043E\u0433\u043E JSON):**\n{\n  \"seoTitle\": \"\u0444\u0438\u043D\u0430\u043B\u044C\u043D\u043E\u0435 SEO \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435\",\n  \"seoDescription\": \"\u0444\u0438\u043D\u0430\u043B\u044C\u043D\u043E\u0435 SEO \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435\",\n  \"characteristics\": [\n    {\n      \"id\": 85,\n      \"name\": \"\u0411\u0440\u0435\u043D\u0434\",\n      \"value\": \"OEM\",\n      \"type\": \"string\"\n    },\n    {\n      \"id\": 13491,\n      \"name\": \"\u0412\u0440\u0435\u043C\u044F \u0437\u0430\u0440\u044F\u0434\u043A\u0438\",\n      \"value\": \"2 \u0447\u0430\u0441\u0430\",\n      \"type\": \"string\"\n    },\n    {\n      \"id\": 90746,\n      \"name\": \"\u0412\u0440\u0435\u043C\u044F \u0440\u0430\u0431\u043E\u0442\u044B \u043E\u0442 \u0430\u043A\u043A\u0443\u043C\u0443\u043B\u044F\u0442\u043E\u0440\u0430, \u0434\u043E\",\n      \"value\": \"60 \u0447\u0430\u0441\u043E\u0432\",\n      \"type\": \"string\"\n    },\n    {\n      \"id\": 89008,\n      \"name\": \"\u0412\u0435\u0441 \u0442\u043E\u0432\u0430\u0440\u0430 \u0431\u0435\u0437 \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0438 (\u0433)\",\n      \"value\": 350,\n      \"type\": \"number\"\n    }\n  ],\n  \"suggestedKeywords\": [\"\u0441\u043B\u043E\u0432\u043E 1\", \"\u0441\u043B\u043E\u0432\u043E 2\"],\n  \"competitiveAdvantages\": [\"\u043F\u0440\u0435\u0438\u043C\u0443\u0449\u0435\u0441\u0442\u0432\u043E 1\"],\n  \"tnvedCode\": \"\u043A\u043E\u0434 \u0422\u041D \u0412\u042D\u0414\",\n  \"confidence\": 0.9,\n  \"validationReport\": {\n    \"characteristicsProcessed\": \"\u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u043D\u044B\u0445\",\n    \"numbersFixed\": \"\u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u043E\u0447\u0438\u0449\u0435\u043D\u043D\u044B\u0445 \u0447\u0438\u0441\u0435\u043B\",\n    \"timeFieldsPreserved\": \"\u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043D\u044B\u0445 \u043F\u043E\u043B\u0435\u0439 \u0432\u0440\u0435\u043C\u0435\u043D\u0438\",\n    \"missingRequired\": \"\u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0435 \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0435\",\n    \"dataQuality\": \"\u0432\u044B\u0441\u043E\u043A\u043E\u0435/\u0441\u0440\u0435\u0434\u043D\u0435\u0435/\u043D\u0438\u0437\u043A\u043E\u0435\"\n  }\n}\n\n\uD83D\uDEA8 **\u041A\u0420\u0418\u0422\u0418\u0427\u041D\u041E:** \n- \u0423\u0434\u0430\u043B\u0438\u0442\u0435 \u0412\u0421\u0415 \u043F\u0440\u043E\u0431\u0435\u043B\u044B \u0438\u0437 \u0447\u0438\u0441\u0435\u043B: \"1 200\" \u0434\u043E\u043B\u0436\u043D\u043E \u0441\u0442\u0430\u0442\u044C 1200!\n- \u041D\u0415 \u0422\u0420\u041E\u0413\u0410\u0419\u0422\u0415 \u0432\u0440\u0435\u043C\u044F: \"2 \u0447\u0430\u0441\u0430\" \u0434\u043E\u043B\u0436\u043D\u043E \u043E\u0441\u0442\u0430\u0442\u044C\u0441\u044F \"2 \u0447\u0430\u0441\u0430\"!\n- \u041D\u0415 \u0422\u0420\u041E\u0413\u0410\u0419\u0422\u0415 \u0432\u0440\u0435\u043C\u044F: \"60 \u0447\u0430\u0441\u043E\u0432\" \u0434\u043E\u043B\u0436\u043D\u043E \u043E\u0441\u0442\u0430\u0442\u044C\u0441\u044F \"60 \u0447\u0430\u0441\u043E\u0432\"!";
    };
    /**
     * Подготовка сообщений для Агента 1 с изображениями
     */
    ProductAnalysisAgentSystem.prototype.prepareAgent1Messages = function (prompt, images) {
        return __awaiter(this, void 0, Promise, function () {
            var content, validImages, _i, validImages_1, imageUrl;
            return __generator(this, function (_a) {
                content = [{ type: 'text', text: prompt }];
                validImages = images
                    .filter(function (img) { return img && (img.startsWith('http') || img.startsWith('data:')); })
                    .slice(0, 10);
                console.log("\uD83D\uDCF8 \u0414\u043E\u0431\u0430\u0432\u043B\u044F\u0435\u043C " + validImages.length + " \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439 \u0434\u043B\u044F \u0430\u043D\u0430\u043B\u0438\u0437\u0430 \u0410\u0433\u0435\u043D\u0442\u043E\u043C 1");
                for (_i = 0, validImages_1 = validImages; _i < validImages_1.length; _i++) {
                    imageUrl = validImages_1[_i];
                    content.push({
                        type: 'image_url',
                        image_url: { url: imageUrl }
                    });
                }
                return [2 /*return*/, [{ role: 'user', content: content }]];
            });
        });
    };
    /**
     * Парсинг ответа агента
     */
    ProductAnalysisAgentSystem.prototype.parseAgentResponse = function (response) {
        try {
            var cleanResponse = response
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
            var jsonStart = cleanResponse.indexOf('{');
            var jsonEnd = cleanResponse.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
                cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
            }
            return JSON.parse(cleanResponse);
        }
        catch (error) {
            console.error('❌ Ошибка парсинга ответа агента:', error);
            console.error('📄 Проблемный ответ:', response.substring(0, 500));
            throw new Error('Некорректный JSON от агента');
        }
    };
    /**
     * Очистка и валидация данных для WB API
     */
    ProductAnalysisAgentSystem.prototype.cleanAndValidateForWBAPI = function (data) {
        var _this = this;
        var _a;
        var cleaned = __assign({}, data);
        // Очищаем характеристики
        if (cleaned.characteristics && Array.isArray(cleaned.characteristics)) {
            cleaned.characteristics = cleaned.characteristics.map(function (char) {
                var cleanedChar = __assign({}, char);
                // СПЕЦИАЛЬНАЯ ОБРАБОТКА ДЛЯ ВРЕМЕНИ - НЕ ОЧИЩАЕМ!
                if (char.id === 13491) { // Время зарядки
                    var timeValue = _this.formatTimeValue(char.value, 'зарядка');
                    cleanedChar.value = timeValue;
                    cleanedChar.type = 'string';
                    console.log("\u23F0 \u0412\u0440\u0435\u043C\u044F \u0437\u0430\u0440\u044F\u0434\u043A\u0438 ID " + char.id + ": \"" + char.value + "\" \u2192 \"" + timeValue + "\"");
                    return cleanedChar;
                }
                if (char.id === 90746) { // Время работы
                    var timeValue = _this.formatTimeValue(char.value, 'работа');
                    cleanedChar.value = timeValue;
                    cleanedChar.type = 'string';
                    console.log("\u23F0 \u0412\u0440\u0435\u043C\u044F \u0440\u0430\u0431\u043E\u0442\u044B ID " + char.id + ": \"" + char.value + "\" \u2192 \"" + timeValue + "\"");
                    return cleanedChar;
                }
                // Если это ДРУГИЕ числа - очищаем от пробелов
                if (char.type === 'number' || typeof char.value === 'number') {
                    var numValue = char.value;
                    if (typeof numValue === 'string') {
                        // Удаляем ВСЕ пробелы и заменяем запятые на точки
                        numValue = numValue.replace(/\s+/g, '').replace(/,/g, '.');
                        // Извлекаем только число
                        var match = numValue.match(/^(\d+(?:\.\d+)?)/);
                        if (match) {
                            numValue = parseFloat(match[1]);
                        }
                    }
                    cleanedChar.value = numValue;
                    cleanedChar.type = 'number';
                    console.log("\uD83E\uDDF9 \u041E\u0447\u0438\u0449\u0435\u043D\u043E \u0447\u0438\u0441\u043B\u043E\u0432\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0434\u043B\u044F " + char.name + ": \"" + char.value + "\" \u2192 " + numValue);
                }
                else {
                    // Для строк - нормализуем пробелы
                    cleanedChar.value = String(char.value).trim().replace(/\s+/g, ' ');
                    cleanedChar.type = 'string';
                }
                return cleanedChar;
            });
        }
        // Добавляем обязательные характеристики если их нет
        var existingIds = ((_a = cleaned.characteristics) === null || _a === void 0 ? void 0 : _a.map(function (c) { return c.id; })) || [];
        if (!existingIds.includes(85)) {
            cleaned.characteristics = cleaned.characteristics || [];
            cleaned.characteristics.push({
                id: 85,
                name: "Бренд",
                value: "OEM",
                type: "string",
                confidence: 0.8,
                reasoning: "Добавлено автоматически"
            });
        }
        if (!existingIds.includes(91)) {
            cleaned.characteristics = cleaned.characteristics || [];
            cleaned.characteristics.push({
                id: 91,
                name: "Страна производства",
                value: "Китай",
                type: "string",
                confidence: 0.8,
                reasoning: "Добавлено автоматически"
            });
        }
        return cleaned;
    };
    /**
     * Правильное форматирование времени
     */
    ProductAnalysisAgentSystem.prototype.formatTimeValue = function (value, timeType) {
        // Если уже строка с единицами - оставляем как есть
        if (typeof value === 'string' && /\d+\s*(час|часов|мин|минут|ч|м)/i.test(value)) {
            return value.trim();
        }
        // Извлекаем число
        var numValue;
        if (typeof value === 'number') {
            numValue = value;
        }
        else {
            var cleanString = String(value).replace(/\s+/g, '').trim();
            numValue = parseFloat(cleanString);
            if (isNaN(numValue)) {
                // Fallback значения
                return timeType === 'зарядка' ? '2 часа' : '8 часов';
            }
        }
        // Логика форматирования в зависимости от типа времени
        if (timeType === 'зарядка') {
            // Время зарядки обычно в часах (редко больше 24 часов)
            if (numValue <= 0.5) {
                return Math.round(numValue * 60) + " \u043C\u0438\u043D\u0443\u0442";
            }
            else if (numValue < 24) {
                if (numValue === 1) {
                    return numValue + " \u0447\u0430\u0441";
                }
                else if (numValue < 5) {
                    return numValue + " \u0447\u0430\u0441\u0430";
                }
                else {
                    return numValue + " \u0447\u0430\u0441\u043E\u0432";
                }
            }
            else {
                // Если больше 24, возможно это минуты
                var hours = Math.round(numValue / 60);
                return hours + " \u0447\u0430\u0441\u043E\u0432";
            }
        }
        else {
            // Время работы может быть большим
            if (numValue < 1) {
                return Math.round(numValue * 60) + " \u043C\u0438\u043D\u0443\u0442";
            }
            else if (numValue <= 200) {
                if (numValue === 1) {
                    return numValue + " \u0447\u0430\u0441";
                }
                else if (numValue < 5) {
                    return numValue + " \u0447\u0430\u0441\u0430";
                }
                else {
                    return numValue + " \u0447\u0430\u0441\u043E\u0432";
                }
            }
            else {
                // Если очень большое число, возможно это минуты
                if (numValue > 1000) {
                    var hours = Math.round(numValue / 60);
                    return hours + " \u0447\u0430\u0441\u043E\u0432";
                }
                return numValue + " \u0447\u0430\u0441\u043E\u0432";
            }
        }
    };
    return ProductAnalysisAgentSystem;
}());
exports.ProductAnalysisAgentSystem = ProductAnalysisAgentSystem;
exports.agentSystem = new ProductAnalysisAgentSystem();
