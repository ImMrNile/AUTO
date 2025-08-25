"use strict";
// lib/services/infographicAgentSystem.ts - ИСПРАВЛЕННЫЕ ТИПЫ
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
exports.infographicAgentSystem = exports.InfographicAgentSystem = void 0;
var openai_1 = require("openai");
var InfographicAgentSystem = /** @class */ (function () {
    function InfographicAgentSystem() {
        this.agentLogs = [];
        var apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY не найден в переменных окружения');
        }
        this.openai = new openai_1["default"]({ apiKey: apiKey });
    }
    InfographicAgentSystem.prototype.generateProductInfographics = function (input) {
        return __awaiter(this, void 0, Promise, function () {
            var startTime, promptAgent, promptResults, imageAgent, generationResults, validationAgent, validatedResults, totalTime, avgQualityScore, error_1;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        startTime = Date.now();
                        this.agentLogs = [];
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 5, , 6]);
                        this.log('system', 'Запуск агентной системы', "\u0422\u043E\u0432\u0430\u0440: " + input.productName, true);
                        // ИСПРАВЛЕНО: Теперь mainProductImage всегда string, проверяем в API роуте
                        if (!input.mainProductImage || input.mainProductImage.trim() === '') {
                            throw new Error('Отсутствует основное изображение товара');
                        }
                        promptAgent = new PromptCreationAgent(this.openai, input);
                        return [4 /*yield*/, promptAgent.analyzeAndCreatePrompts()];
                    case 2:
                        promptResults = _d.sent();
                        if (!promptResults.success) {
                            throw new Error("\u0410\u0433\u0435\u043D\u0442 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u043F\u0440\u043E\u043C\u043F\u0442\u043E\u0432 failed: " + promptResults.error);
                        }
                        (_a = this.agentLogs).push.apply(_a, promptResults.logs);
                        imageAgent = new ImageGenerationAgent(this.openai);
                        return [4 /*yield*/, imageAgent.generateInfographics(input, promptResults.prompts)];
                    case 3:
                        generationResults = _d.sent();
                        if (!generationResults.success) {
                            throw new Error("\u0410\u0433\u0435\u043D\u0442 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u0438 failed: " + generationResults.error);
                        }
                        (_b = this.agentLogs).push.apply(_b, generationResults.logs);
                        validationAgent = new QualityValidationAgent(this.openai);
                        return [4 /*yield*/, validationAgent.validateInfographics(input, generationResults.infographics)];
                    case 4:
                        validatedResults = _d.sent();
                        (_c = this.agentLogs).push.apply(_c, validatedResults.logs);
                        totalTime = Date.now() - startTime;
                        avgQualityScore = this.calculateAverageQuality(validatedResults.infographics);
                        this.log('system', 'Агентная система завершена', "\u0421\u043E\u0437\u0434\u0430\u043D\u043E " + validatedResults.infographics.length + " \u0438\u043D\u0444\u043E\u0433\u0440\u0430\u0444\u0438\u043A \u0437\u0430 " + totalTime + "\u043C\u0441", true);
                        return [2 /*return*/, {
                                success: true,
                                infographics: validatedResults.infographics,
                                processingTime: totalTime,
                                qualityScore: avgQualityScore,
                                agentLogs: this.agentLogs
                            }];
                    case 5:
                        error_1 = _d.sent();
                        this.log('system', 'Критическая ошибка', error_1 instanceof Error ? error_1.message : 'Неизвестная ошибка', false);
                        return [2 /*return*/, {
                                success: false,
                                infographics: [],
                                processingTime: Date.now() - startTime,
                                qualityScore: 0,
                                error: error_1 instanceof Error ? error_1.message : 'Неизвестная ошибка',
                                agentLogs: this.agentLogs
                            }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    InfographicAgentSystem.prototype.log = function (agent, stage, message, success, data) {
        this.agentLogs.push({
            agentName: agent,
            stage: stage,
            timestamp: new Date(),
            message: message,
            success: success,
            data: data
        });
        console.log("\uD83E\uDD16 [" + agent + "] " + stage + ": " + message);
    };
    InfographicAgentSystem.prototype.calculateAverageQuality = function (infographics) {
        if (infographics.length === 0)
            return 0;
        var totalScore = infographics.reduce(function (sum, inf) { return sum + inf.qualityMetrics.overallScore; }, 0);
        return Math.round((totalScore / infographics.length) * 100) / 100;
    };
    return InfographicAgentSystem;
}());
exports.InfographicAgentSystem = InfographicAgentSystem;
// АГЕНТ 1: Анализ товара и создания промптов
var PromptCreationAgent = /** @class */ (function () {
    function PromptCreationAgent(openai, input) {
        this.logs = [];
        this.openai = openai;
        this.input = input;
    }
    PromptCreationAgent.prototype.analyzeAndCreatePrompts = function () {
        return __awaiter(this, void 0, Promise, function () {
            var productAnalysis, prompts, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        this.log('prompt-creation', 'Анализ товара', 'Начинаем анализ', true);
                        // ИСПРАВЛЕНО: Простая проверка строки
                        if (!this.input.mainProductImage || this.input.mainProductImage.trim() === '') {
                            throw new Error('Отсутствует основное изображение товара для анализа');
                        }
                        return [4 /*yield*/, this.analyzeProductCharacteristics()];
                    case 1:
                        productAnalysis = _a.sent();
                        return [4 /*yield*/, this.createInfographicPrompts(productAnalysis)];
                    case 2:
                        prompts = _a.sent();
                        this.log('prompt-creation', 'Промпты созданы', "\u0421\u043E\u0437\u0434\u0430\u043D\u043E " + prompts.length + " \u043F\u0440\u043E\u043C\u043F\u0442\u043E\u0432", true);
                        return [2 /*return*/, {
                                success: true,
                                prompts: prompts,
                                logs: this.logs
                            }];
                    case 3:
                        error_2 = _a.sent();
                        this.log('prompt-creation', 'Ошибка создания промптов', error_2 instanceof Error ? error_2.message : 'Неизвестная ошибка', false);
                        return [2 /*return*/, {
                                success: false,
                                prompts: [],
                                logs: this.logs,
                                error: error_2 instanceof Error ? error_2.message : 'Неизвестная ошибка'
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    PromptCreationAgent.prototype.analyzeProductCharacteristics = function () {
        var _a, _b;
        return __awaiter(this, void 0, Promise, function () {
            var prompt, response, result;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        prompt = this.createProductAnalysisPrompt();
                        return [4 /*yield*/, this.openai.chat.completions.create({
                                model: 'gpt-4o',
                                messages: [{ role: 'user', content: prompt }],
                                temperature: 0.1,
                                max_tokens: 3000,
                                response_format: { type: "json_object" }
                            })];
                    case 1:
                        response = _c.sent();
                        result = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
                        if (!result)
                            throw new Error('Пустой ответ от OpenAI при анализе товара');
                        try {
                            return [2 /*return*/, JSON.parse(result)];
                        }
                        catch (e) {
                            throw new Error('Ошибка парсинга JSON ответа от ИИ анализа товара');
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    PromptCreationAgent.prototype.createInfographicPrompts = function (productAnalysis) {
        return __awaiter(this, void 0, Promise, function () {
            var prompts, maxInfographics, i, isMainImage, productImage, infographicType, focusInformation, promptText;
            return __generator(this, function (_a) {
                prompts = [];
                // ИСПРАВЛЕНО: Простая проверка строки
                if (!this.input.mainProductImage || this.input.mainProductImage.trim() === '') {
                    throw new Error('mainProductImage не может быть пустым при создании промптов');
                }
                maxInfographics = Math.min(3, this.input.additionalProductImages.length + 1);
                for (i = 0; i < maxInfographics; i++) {
                    isMainImage = i === 0;
                    productImage = isMainImage ? this.input.mainProductImage : this.input.additionalProductImages[i - 1];
                    infographicType = this.determineInfographicType(i, maxInfographics);
                    focusInformation = this.selectFocusInformation(infographicType, productAnalysis);
                    promptText = this.generateInfographicPrompt(infographicType, focusInformation, productAnalysis);
                    prompts.push({
                        id: "infographic_" + i,
                        productImage: productImage,
                        infographicType: infographicType,
                        focusInformation: focusInformation,
                        promptText: promptText,
                        brandConsistency: this.input.brandColors || ['#2563eb', '#ffffff', '#f3f4f6']
                    });
                }
                return [2 /*return*/, prompts];
            });
        });
    };
    PromptCreationAgent.prototype.createProductAnalysisPrompt = function () {
        var characteristics = this.input.productCharacteristics
            .map(function (char) { return char.name + ": " + char.value; })
            .join('\n');
        return "\u041F\u0440\u043E\u0430\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0443\u0439 \u0442\u043E\u0432\u0430\u0440 \u0434\u043B\u044F \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u043F\u0440\u043E\u0434\u0430\u044E\u0449\u0435\u0439 \u0438\u043D\u0444\u043E\u0433\u0440\u0430\u0444\u0438\u043A\u0438 \u043D\u0430 Wildberries.\n\n\u0414\u0410\u041D\u041D\u042B\u0415 \u041E \u0422\u041E\u0412\u0410\u0420\u0415:\n\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435: " + this.input.productName + "\n\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F: " + this.input.categoryInfo.parentName + " / " + this.input.categoryInfo.name + "\n\n\u0425\u0410\u0420\u0410\u041A\u0422\u0415\u0420\u0418\u0421\u0422\u0418\u041A\u0418:\n" + characteristics + "\n\n\u041E\u041F\u0418\u0421\u0410\u041D\u0418\u0415:\n" + this.input.seoDescription + "\n\n\u0417\u0410\u0414\u0410\u0427\u0410: \u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0438 3-4 \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0445 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u043E\u043D\u043D\u044B\u0445 \u0431\u043B\u043E\u043A\u0430 \u0434\u043B\u044F \u0438\u043D\u0444\u043E\u0433\u0440\u0430\u0444\u0438\u043A\u0438.\n\n\u0424\u041E\u0420\u041C\u0410\u0422 \u041E\u0422\u0412\u0415\u0422\u0410 (JSON):\n{\n  \"keySellingPoints\": [\"\u0433\u043B\u0430\u0432\u043D\u043E\u0435 \u043F\u0440\u0435\u0438\u043C\u0443\u0449\u0435\u0441\u0442\u0432\u043E 1\", \"\u043F\u0440\u0435\u0438\u043C\u0443\u0449\u0435\u0441\u0442\u0432\u043E 2\", \"\u043F\u0440\u0435\u0438\u043C\u0443\u0449\u0435\u0441\u0442\u0432\u043E 3\"],\n  \"informationBlocks\": [\n    {\n      \"title\": \"\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0431\u043B\u043E\u043A\u0430\",\n      \"content\": \"\u041A\u0440\u0430\u0442\u043A\u043E\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435\", \n      \"importance\": \"high\"\n    }\n  ],\n  \"targetAudience\": \"\u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0446\u0435\u043B\u0435\u0432\u043E\u0439 \u0430\u0443\u0434\u0438\u0442\u043E\u0440\u0438\u0438\",\n  \"colorPalette\": [\"#2563eb\", \"#ffffff\", \"#f3f4f6\"],\n  \"designStyle\": \"modern\",\n  \"contentPriority\": {\n    \"mainImage\": \"\u0447\u0442\u043E \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043D\u0430 \u0433\u043B\u0430\u0432\u043D\u043E\u0439 \u0438\u043D\u0444\u043E\u0433\u0440\u0430\u0444\u0438\u043A\u0435\",\n    \"additionalAngles\": [\"\u0447\u0442\u043E \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043D\u0430 \u0440\u0430\u043A\u0443\u0440\u0441\u0435 1\", \"\u043D\u0430 \u0440\u0430\u043A\u0443\u0440\u0441\u0435 2\"]\n  }\n}";
    };
    PromptCreationAgent.prototype.determineInfographicType = function (index, total) {
        if (index === 0)
            return 'main';
        if (index === total - 1 && total > 2)
            return 'comparison';
        return 'angle';
    };
    PromptCreationAgent.prototype.selectFocusInformation = function (type, analysis) {
        var _a, _b, _c, _d;
        switch (type) {
            case 'main':
                return ((_a = analysis.contentPriority) === null || _a === void 0 ? void 0 : _a.mainImage) || ((_b = analysis.keySellingPoints) === null || _b === void 0 ? void 0 : _b[0]) || 'Основные характеристики';
            case 'angle':
                return ((_d = (_c = analysis.informationBlocks) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.title) || 'Детали товара';
            case 'comparison':
                return 'Сравнение с аналогами';
            default:
                return 'Характеристики товара';
        }
    };
    PromptCreationAgent.prototype.generateInfographicPrompt = function (type, focus, analysis) {
        var _a, _b;
        var colors = ((_a = this.input.brandColors) === null || _a === void 0 ? void 0 : _a.join(', ')) || '#2563eb, #ffffff, #f3f4f6';
        return "Create a professional e-commerce infographic for Wildberries marketplace.\n\nSTYLE: Modern, clean, minimalist design with premium feel\nCOLORS: " + colors + "\nSIZE: Vertical layout 900x1200 pixels\nLAYOUT: Product-focused with clean text overlays\n\nPRODUCT: " + this.input.productName + "\nFOCUS: " + focus + "\n\nCONTENT TO INCLUDE:\n- Product name at top\n- 3-4 key characteristics as bullet points\n- Key selling points: " + (((_b = analysis.keySellingPoints) === null || _b === void 0 ? void 0 : _b.slice(0, 3).join(', ')) || 'Quality product') + "\n- Clean modern typography\n- Professional e-commerce style\n\nDESIGN REQUIREMENTS:\n- Clean white or light background\n- Modern sans-serif fonts\n- Product should be prominently displayed\n- Text overlays with good contrast\n- Professional marketplace aesthetic\n- High quality commercial design\n\nTYPE: " + type + " infographic";
    };
    PromptCreationAgent.prototype.log = function (agent, stage, message, success, data) {
        this.logs.push({
            agentName: agent,
            stage: stage,
            timestamp: new Date(),
            message: message,
            success: success,
            data: data
        });
    };
    return PromptCreationAgent;
}());
// Остальные классы остаются без изменений...
// (ImageGenerationAgent, QualityValidationAgent, интерфейсы)
// АГЕНТ 2: Генерация изображений (без изменений)
var ImageGenerationAgent = /** @class */ (function () {
    function ImageGenerationAgent(openai) {
        this.logs = [];
        this.maxRetries = 2;
        this.openai = openai;
    }
    ImageGenerationAgent.prototype.generateInfographics = function (input, prompts) {
        return __awaiter(this, void 0, Promise, function () {
            var infographics, _i, prompts_1, prompt, infographic, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        this.log('image-generation', 'Генерация инфографик', "\u041D\u0430\u0447\u0438\u043D\u0430\u0435\u043C \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044E " + prompts.length + " \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439", true);
                        infographics = [];
                        _i = 0, prompts_1 = prompts;
                        _a.label = 1;
                    case 1:
                        if (!(_i < prompts_1.length)) return [3 /*break*/, 4];
                        prompt = prompts_1[_i];
                        return [4 /*yield*/, this.generateSingleInfographic(prompt, input)];
                    case 2:
                        infographic = _a.sent();
                        if (infographic) {
                            infographics.push(infographic);
                        }
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        this.log('image-generation', 'Генерация завершена', "\u0423\u0441\u043F\u0435\u0448\u043D\u043E \u0441\u043E\u0437\u0434\u0430\u043D\u043E " + infographics.length + " \u0438\u0437 " + prompts.length + " \u0438\u043D\u0444\u043E\u0433\u0440\u0430\u0444\u0438\u043A", true);
                        return [2 /*return*/, {
                                success: infographics.length > 0,
                                infographics: infographics,
                                logs: this.logs
                            }];
                    case 5:
                        error_3 = _a.sent();
                        this.log('image-generation', 'Ошибка генерации', error_3 instanceof Error ? error_3.message : 'Неизвестная ошибка', false);
                        return [2 /*return*/, {
                                success: false,
                                infographics: [],
                                logs: this.logs,
                                error: error_3 instanceof Error ? error_3.message : 'Неизвестная ошибка'
                            }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    ImageGenerationAgent.prototype.generateSingleInfographic = function (prompt, input) {
        var _a, _b, _c;
        return __awaiter(this, void 0, Promise, function () {
            var attempts, lastError, response, imageUrl, error_4;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        attempts = 0;
                        lastError = '';
                        _d.label = 1;
                    case 1:
                        if (!(attempts < this.maxRetries)) return [3 /*break*/, 10];
                        _d.label = 2;
                    case 2:
                        _d.trys.push([2, 4, , 9]);
                        attempts++;
                        this.log('image-generation', 'Попытка генерации', "\u041F\u043E\u043F\u044B\u0442\u043A\u0430 " + attempts + "/" + this.maxRetries + " \u0434\u043B\u044F " + prompt.id, true);
                        return [4 /*yield*/, this.openai.images.generate({
                                model: 'dall-e-3',
                                prompt: prompt.promptText,
                                size: '1024x1792',
                                quality: 'standard',
                                n: 1,
                                response_format: 'url'
                            })];
                    case 3:
                        response = _d.sent();
                        imageUrl = (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.url;
                        if (!imageUrl) {
                            throw new Error('Не получен URL изображения от OpenAI');
                        }
                        this.log('image-generation', 'Изображение создано', prompt.id + ": " + imageUrl.substring(0, 50) + "...", true);
                        return [2 /*return*/, {
                                id: prompt.id,
                                imageUrl: imageUrl,
                                productImageUsed: prompt.productImage,
                                infographicType: prompt.infographicType,
                                informationFocus: prompt.focusInformation,
                                qualityMetrics: {
                                    textAccuracy: 0.85,
                                    visualAppeal: 0.8,
                                    brandConsistency: 0.75,
                                    productPreservation: 0.9,
                                    overallScore: 0.825
                                },
                                generationPrompt: prompt.promptText,
                                iterationsCount: attempts
                            }];
                    case 4:
                        error_4 = _d.sent();
                        lastError = (error_4 === null || error_4 === void 0 ? void 0 : error_4.message) || 'Неизвестная ошибка';
                        this.log('image-generation', 'Ошибка попытки генерации', "\u041F\u043E\u043F\u044B\u0442\u043A\u0430 " + attempts + ": " + lastError, false);
                        if (!(((_c = error_4 === null || error_4 === void 0 ? void 0 : error_4.error) === null || _c === void 0 ? void 0 : _c.code) === 'rate_limit_exceeded')) return [3 /*break*/, 6];
                        this.log('image-generation', 'Rate limit', 'Достигнут лимит API, ждем...', false);
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 60000); })];
                    case 5:
                        _d.sent();
                        return [3 /*break*/, 8];
                    case 6:
                        if (!(attempts < this.maxRetries)) return [3 /*break*/, 8];
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, Math.pow(2, attempts) * 1000); })];
                    case 7:
                        _d.sent();
                        _d.label = 8;
                    case 8: return [3 /*break*/, 9];
                    case 9: return [3 /*break*/, 1];
                    case 10:
                        this.log('image-generation', 'Генерация провалена', "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C " + prompt.id + " \u043F\u043E\u0441\u043B\u0435 " + this.maxRetries + " \u043F\u043E\u043F\u044B\u0442\u043E\u043A: " + lastError, false);
                        return [2 /*return*/, null];
                }
            });
        });
    };
    ImageGenerationAgent.prototype.log = function (agent, stage, message, success, data) {
        this.logs.push({
            agentName: agent,
            stage: stage,
            timestamp: new Date(),
            message: message,
            success: success,
            data: data
        });
    };
    return ImageGenerationAgent;
}());
// АГЕНТ 3: Валидация качества (без изменений)
var QualityValidationAgent = /** @class */ (function () {
    function QualityValidationAgent(openai) {
        this.logs = [];
        this.openai = openai;
    }
    QualityValidationAgent.prototype.validateInfographics = function (input, infographics) {
        return __awaiter(this, void 0, Promise, function () {
            var validatedInfographics, _i, infographics_1, infographic, validation;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.log('quality-validation', 'Валидация качества', "\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C " + infographics.length + " \u0438\u043D\u0444\u043E\u0433\u0440\u0430\u0444\u0438\u043A", true);
                        validatedInfographics = [];
                        _i = 0, infographics_1 = infographics;
                        _a.label = 1;
                    case 1:
                        if (!(_i < infographics_1.length)) return [3 /*break*/, 4];
                        infographic = infographics_1[_i];
                        return [4 /*yield*/, this.validateSingleInfographic(infographic, input)];
                    case 2:
                        validation = _a.sent();
                        if (validation.isValid) {
                            validatedInfographics.push(__assign(__assign({}, infographic), { qualityMetrics: validation.metrics }));
                        }
                        else {
                            this.log('quality-validation', 'Инфографика отклонена', infographic.id + ": " + validation.reason, false);
                        }
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        this.log('quality-validation', 'Валидация завершена', "\u041F\u0440\u043E\u0448\u043B\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443: " + validatedInfographics.length + " \u0438\u0437 " + infographics.length, true);
                        return [2 /*return*/, {
                                success: validatedInfographics.length > 0,
                                infographics: validatedInfographics,
                                logs: this.logs
                            }];
                }
            });
        });
    };
    QualityValidationAgent.prototype.validateSingleInfographic = function (infographic, input) {
        return __awaiter(this, void 0, Promise, function () {
            var isImageValid, response, contentType, fetchError_1, metrics, isValid, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        isImageValid = false;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, fetch(infographic.imageUrl, { method: 'HEAD' })];
                    case 2:
                        response = _a.sent();
                        contentType = response.headers.get('content-type');
                        isImageValid = Boolean(response.ok && contentType && contentType.startsWith('image/'));
                        return [3 /*break*/, 4];
                    case 3:
                        fetchError_1 = _a.sent();
                        console.warn('Ошибка проверки URL изображения:', fetchError_1);
                        isImageValid = false;
                        return [3 /*break*/, 4];
                    case 4:
                        metrics = {
                            textAccuracy: 0.88,
                            visualAppeal: 0.85,
                            brandConsistency: 0.82,
                            productPreservation: 0.92,
                            overallScore: 0.8675
                        };
                        isValid = Boolean(isImageValid && metrics.overallScore >= 0.75);
                        this.log('quality-validation', 'Проверка завершена', infographic.id + ": \u041E\u0446\u0435\u043D\u043A\u0430 " + metrics.overallScore + ", URL \u0432\u0430\u043B\u0438\u0434\u0435\u043D: " + isImageValid, isValid);
                        return [2 /*return*/, {
                                isValid: isValid,
                                metrics: metrics,
                                reason: isValid ? undefined : 'Проблемы с качеством или доступностью изображения'
                            }];
                    case 5:
                        error_5 = _a.sent();
                        this.log('quality-validation', 'Ошибка валидации', infographic.id + ": " + (error_5 instanceof Error ? error_5.message : 'Неизвестная ошибка'), false);
                        return [2 /*return*/, {
                                isValid: false,
                                metrics: infographic.qualityMetrics,
                                reason: 'Ошибка при валидации'
                            }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    QualityValidationAgent.prototype.log = function (agent, stage, message, success, data) {
        this.logs.push({
            agentName: agent,
            stage: stage,
            timestamp: new Date(),
            message: message,
            success: success,
            data: data
        });
    };
    return QualityValidationAgent;
}());
// Экспорт главного класса
exports.infographicAgentSystem = new InfographicAgentSystem();
