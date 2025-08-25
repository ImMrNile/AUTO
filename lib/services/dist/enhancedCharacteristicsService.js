"use strict";
// lib/services/enhancedCharacteristicsService.ts
// ИСПРАВЛЕННАЯ ВЕРСИЯ - защищает пользовательские данные
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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.enhancedCharacteristicsIntegrationService = exports.EnhancedCharacteristicsIntegrationService = void 0;
var optimizedGPT5MiniSystem_1 = require("./optimizedGPT5MiniSystem");
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
/** ---------- Константы и хелперы ---------- */
/** Габаритные/ручные характеристики — ИИ их не заполняет */
var USER_INPUT_CHARACTERISTICS = new Set([
    89008, 90630, 90607, 90608, 90652, 90653, 11001, 11002, 72739, 90654, 90655
]);
/** Цвет — WB определяет сам, не отправляем */
var COLOR_CHAR_IDS = new Set([14177449]); // "Цвет"
/** Характеристики, которые может изменять только пользователь */
var PROTECTED_USER_CHARACTERISTICS = new Set([
    14177441,
]);
/** Лимиты title по WB subjectId */
var TITLE_LIMITS = {
    593: 60
};
/** УЛУЧШЕННЫЙ санитайзер текста */
function sanitizeText(input) {
    var s = String(input !== null && input !== void 0 ? input : '');
    // заменить неразрывные пробелы/табы/переводы на пробел
    s = s.replace(/[\u00A0\t\r\n]+/g, ' ');
    // убрать повторяющиеся пробелы
    s = s.replace(/\s{2,}/g, ' ');
    // нормализовать пробелы вокруг пунктуации
    s = s.replace(/\s*([,.:;!?])\s*/g, '$1 ');
    // заменить ё→е
    s = s.replace(/ё/g, 'е').replace(/Ё/g, 'Е');
    // финальный trim
    s = s.trim();
    return s;
}
/** НОВАЯ ФУНКЦИЯ: Определение единиц измерения веса */
function normalizeWeight(weight) {
    var numericValue = parseFloat(String(weight).replace(/[^\d.,]/g, '').replace(',', '.'));
    if (isNaN(numericValue)) {
        console.warn("\u26A0\uFE0F \u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0432\u0435\u0441: \"" + weight + "\", \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u043C 0.5 \u043A\u0433");
        return 0.5; // Дефолтное значение в кг
    }
    // Если вес меньше 10, скорее всего это килограммы
    if (numericValue <= 10) {
        console.log("\uD83D\uDCD0 \u0412\u0435\u0441 \u0438\u043D\u0442\u0435\u0440\u043F\u0440\u0435\u0442\u0438\u0440\u043E\u0432\u0430\u043D \u043A\u0430\u043A \u043A\u0438\u043B\u043E\u0433\u0440\u0430\u043C\u043C\u044B: " + numericValue + " \u043A\u0433");
        return numericValue;
    }
    // Если больше 10, скорее всего граммы - конвертируем в кг
    else {
        var weightInKg = numericValue / 1000;
        console.log("\uD83D\uDCD0 \u0412\u0435\u0441 \u043A\u043E\u043D\u0432\u0435\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D \u0438\u0437 \u0433\u0440\u0430\u043C\u043C\u043E\u0432: " + numericValue + " \u0433 \u2192 " + weightInKg + " \u043A\u0433");
        return weightInKg;
    }
}
/** ---------- ИСПРАВЛЕННЫЙ Класс сервиса ---------- */
var EnhancedCharacteristicsIntegrationService = /** @class */ (function () {
    function EnhancedCharacteristicsIntegrationService() {
    }
    /** ГЛАВНЫЙ МЕТОД с защитой пользовательских данных */
    EnhancedCharacteristicsIntegrationService.prototype.analyzeProductWithEnhancedSystem = function (input) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
        return __awaiter(this, void 0, Promise, function () {
            var startedAt, protectedData, categoryCharacteristics, categoryInfo, agentContext, analysisResult, processed, validation, totalProcessingTime, overallScore, sourceReliability, subjectId, titleLimit, safeTitle, safeDescription, final, err_1;
            return __generator(this, function (_s) {
                switch (_s.label) {
                    case 0:
                        startedAt = Date.now();
                        _s.label = 1;
                    case 1:
                        _s.trys.push([1, 5, , 6]);
                        console.log("\n\uD83D\uDE80 ENHANCED SYSTEM: \u0410\u043D\u0430\u043B\u0438\u0437 \"" + input.productName + "\" / cat=" + input.categoryId);
                        protectedData = this.extractAndProtectUserData(input);
                        console.log('🛡️ Защищенные пользовательские данные:', {
                            packageContents: protectedData.packageContents,
                            weight: protectedData.normalizedWeight,
                            dimensions: protectedData.dimensions
                        });
                        return [4 /*yield*/, this.loadCategoryCharacteristicsFromDB(input.categoryId)];
                    case 2:
                        categoryCharacteristics = _s.sent();
                        if (categoryCharacteristics.length === 0) {
                            throw new Error("\u0425\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438 \u0434\u043B\u044F \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438 " + input.categoryId + " \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B \u0432 \u0411\u0414");
                        }
                        return [4 /*yield*/, this.getCategoryInfoFromDB(input.categoryId)];
                    case 3:
                        categoryInfo = _s.sent();
                        agentContext = {
                            productId: "temp-" + Date.now(),
                            productName: input.productName,
                            categoryId: input.categoryId,
                            categoryInfo: {
                                id: categoryInfo.id,
                                name: categoryInfo.name,
                                parentName: categoryInfo.parentName,
                                characteristics: categoryCharacteristics
                            },
                            images: input.productImages || [],
                            referenceUrl: input.referenceUrl || '',
                            price: input.price,
                            // 🛡️ ЗАЩИЩЕННЫЕ РАЗМЕРЫ (нормализованный вес)
                            dimensions: protectedData.dimensions,
                            // 🛡️ ЗАЩИЩЕННАЯ КОМПЛЕКТАЦИЯ
                            packageContents: protectedData.packageContents,
                            userComments: input.aiPromptComment || '',
                            additionalData: {
                                hasVariantSizes: !!input.hasVariantSizes,
                                variantSizes: input.variantSizes || [],
                                additionalCharacteristics: input.additionalCharacteristics || [],
                                // 🛡️ ИНСТРУКЦИИ ДЛЯ ИИ О ЗАЩИТЕ ДАННЫХ
                                protectedFields: {
                                    packageContents: protectedData.packageContents,
                                    dimensions: protectedData.dimensions,
                                    instructions: "\n              \u041A\u0420\u0418\u0422\u0418\u0427\u0415\u0421\u041A\u0418 \u0412\u0410\u0416\u041D\u041E:\n              1. \u041D\u0415 \u0438\u0437\u043C\u0435\u043D\u044F\u0439 \u043A\u043E\u043C\u043F\u043B\u0435\u043A\u0442\u0430\u0446\u0438\u044E: \"" + protectedData.packageContents + "\"\n              2. \u041D\u0415 \u0438\u0437\u043C\u0435\u043D\u044F\u0439 \u0440\u0430\u0437\u043C\u0435\u0440\u044B: " + JSON.stringify(protectedData.dimensions) + "\n              3. \u0412\u0435\u0441 \u0443\u0436\u0435 \u0443\u043A\u0430\u0437\u0430\u043D \u0432 \u041A\u0418\u041B\u041E\u0413\u0420\u0410\u041C\u041C\u0410\u0425: " + protectedData.normalizedWeight + " \u043A\u0433\n              4. \u0417\u0430\u043F\u043E\u043B\u043D\u044F\u0439 \u0422\u041E\u041B\u042C\u041A\u041E \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438 \u0442\u043E\u0432\u0430\u0440\u0430 (\u0431\u0440\u0435\u043D\u0434, \u0446\u0432\u0435\u0442, \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B \u0438 \u0442.\u0434.)\n            "
                                }
                            }
                        };
                        return [4 /*yield*/, optimizedGPT5MiniSystem_1.optimizedGPT5MiniSystem.analyzeProduct(agentContext)];
                    case 4:
                        analysisResult = _s.sent();
                        if (!(analysisResult === null || analysisResult === void 0 ? void 0 : analysisResult.finalResult)) {
                            throw new Error('Система не вернула финальный результат');
                        }
                        processed = this.processAIResultsWithProtection(analysisResult.finalResult, categoryCharacteristics, protectedData);
                        validation = this.validateCharacteristics(processed.characteristics, categoryCharacteristics);
                        totalProcessingTime = Date.now() - startedAt;
                        overallScore = this.calculateQualityScore(processed, analysisResult);
                        sourceReliability = 90;
                        subjectId = categoryInfo.wbSubjectId;
                        titleLimit = subjectId && TITLE_LIMITS[subjectId] ? TITLE_LIMITS[subjectId] : 120;
                        safeTitle = sanitizeText(processed.seoTitle || analysisResult.finalResult.seoTitle || '');
                        if (safeTitle.length > titleLimit)
                            safeTitle = safeTitle.slice(0, titleLimit).trim();
                        safeDescription = sanitizeText(processed.seoDescription || analysisResult.finalResult.seoDescription || '');
                        // 9) ФИНАЛЬНАЯ ПРОВЕРКА - убеждаемся что пользовательские данные не изменились
                        this.validateUserDataIntegrity(processed, protectedData);
                        final = {
                            characteristics: processed.characteristics.map(function (ch) { return ({
                                id: ch.id,
                                name: ch.name,
                                value: ch.value,
                                confidence: ch.confidence,
                                reasoning: ch.reasoning,
                                detectedType: ch.dbType,
                                source: ch.source
                            }); }),
                            seoTitle: safeTitle,
                            seoDescription: safeDescription,
                            suggestedKeywords: analysisResult.finalResult.keywords || [],
                            competitiveAdvantages: ((_a = analysisResult.finalResult.marketingInsights) === null || _a === void 0 ? void 0 : _a.competitiveAdvantages) || [],
                            tnvedCode: analysisResult.finalResult.tnvedCode || undefined,
                            confidence: processed.confidence,
                            fillPercentage: processed.fillPercentage,
                            qualityMetrics: {
                                overallScore: overallScore,
                                fillRate: processed.fillPercentage,
                                sourceReliability: sourceReliability,
                                dataCompleteness: processed.fillPercentage,
                                wbCompliance: ((_c = (_b = analysisResult.finalResult.qualityMetrics) === null || _b === void 0 ? void 0 : _b.wbCompliance) === null || _c === void 0 ? void 0 : _c.isCompliant) ? 100 : 70
                            },
                            analysisReport: {
                                totalSearchQueries: 0,
                                totalSources: 5,
                                totalProcessingTime: totalProcessingTime,
                                totalCost: analysisResult.totalCost,
                                systemUsed: 'gpt5_mini_gpt41_protected',
                                modelDetails: {
                                    phase1: (_d = analysisResult.phase1) === null || _d === void 0 ? void 0 : _d.modelUsed,
                                    phase2: (_e = analysisResult.phase2) === null || _e === void 0 ? void 0 : _e.modelUsed,
                                    phase3: (_f = analysisResult.phase3) === null || _f === void 0 ? void 0 : _f.modelUsed
                                },
                                phase1Results: {
                                    processingTime: (_g = analysisResult.phase1) === null || _g === void 0 ? void 0 : _g.processingTime,
                                    tokensUsed: ((_h = analysisResult.phase1) === null || _h === void 0 ? void 0 : _h.tokensUsed) || 0,
                                    cost: ((_j = analysisResult.phase1) === null || _j === void 0 ? void 0 : _j.cost) || 0
                                },
                                phase2Results: {
                                    processingTime: (_k = analysisResult.phase2) === null || _k === void 0 ? void 0 : _k.processingTime,
                                    tokensUsed: ((_l = analysisResult.phase2) === null || _l === void 0 ? void 0 : _l.tokensUsed) || 0,
                                    cost: ((_m = analysisResult.phase2) === null || _m === void 0 ? void 0 : _m.cost) || 0
                                },
                                phase3Results: {
                                    processingTime: (_o = analysisResult.phase3) === null || _o === void 0 ? void 0 : _o.processingTime,
                                    tokensUsed: ((_p = analysisResult.phase3) === null || _p === void 0 ? void 0 : _p.tokensUsed) || 0,
                                    cost: ((_q = analysisResult.phase3) === null || _q === void 0 ? void 0 : _q.cost) || 0
                                }
                            },
                            wbCompliance: (_r = analysisResult.finalResult.qualityMetrics) === null || _r === void 0 ? void 0 : _r.wbCompliance,
                            gabaritInfo: {
                                note: 'Габаритные характеристики требуют ручного измерения',
                                gabaritCharacteristics: this.getGabaritCharacteristics(categoryCharacteristics),
                                needsManualInput: true
                            },
                            warnings: __spreadArrays(processed.warnings, validation.warnings).map(sanitizeText).filter(Boolean),
                            recommendations: this.generateEnhancedRecommendations(processed, validation, this.normalizeRecommendations(analysisResult.finalResult.recommendations), protectedData).map(sanitizeText).filter(Boolean)
                        };
                        return [2 /*return*/, final];
                    case 5:
                        err_1 = _s.sent();
                        console.error('❌ Ошибка Enhanced System:', err_1);
                        throw new Error("Enhanced System failed: " + err_1.message);
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /** 🛡️ НОВАЯ ФУНКЦИЯ: Извлечение и защита пользовательских данных */
    EnhancedCharacteristicsIntegrationService.prototype.extractAndProtectUserData = function (input) {
        var _a, _b, _c, _d;
        // Защищаем комплектацию
        var packageContents = sanitizeText(input.packageContents || '');
        // Нормализуем вес (ИСПРАВЛЕНИЕ проблемы с граммами)
        var originalWeight = (_a = input.dimensions) === null || _a === void 0 ? void 0 : _a.weight;
        var normalizedWeight = normalizeWeight(originalWeight);
        // Защищаем размеры с исправленным весом
        var dimensions = {
            length: Math.max(1, Number((_b = input.dimensions) === null || _b === void 0 ? void 0 : _b.length) || 30),
            width: Math.max(1, Number((_c = input.dimensions) === null || _c === void 0 ? void 0 : _c.width) || 20),
            height: Math.max(1, Number((_d = input.dimensions) === null || _d === void 0 ? void 0 : _d.height) || 10),
            weight: normalizedWeight // ✅ Вес в килограммах
        };
        console.log("\uD83D\uDCD0 \u041D\u043E\u0440\u043C\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F \u0440\u0430\u0437\u043C\u0435\u0440\u043E\u0432:");
        console.log("   - \u0414\u043B\u0438\u043D\u0430: " + dimensions.length + " \u0441\u043C");
        console.log("   - \u0428\u0438\u0440\u0438\u043D\u0430: " + dimensions.width + " \u0441\u043C");
        console.log("   - \u0412\u044B\u0441\u043E\u0442\u0430: " + dimensions.height + " \u0441\u043C");
        console.log("   - \u0412\u0435\u0441: " + originalWeight + " \u2192 " + normalizedWeight + " \u043A\u0433");
        return {
            packageContents: packageContents,
            dimensions: dimensions,
            normalizedWeight: normalizedWeight
        };
    };
    /** 🛡️ НОВАЯ ФУНКЦИЯ: Обработка результатов ИИ с защитой пользовательских данных */
    EnhancedCharacteristicsIntegrationService.prototype.processAIResultsWithProtection = function (aiResults, categoryCharacteristics, protectedData) {
        var _a;
        var byId = new Map();
        var byWB = new Map();
        var byName = new Map();
        for (var _i = 0, categoryCharacteristics_1 = categoryCharacteristics; _i < categoryCharacteristics_1.length; _i++) {
            var c = categoryCharacteristics_1[_i];
            byId.set(c.id, c);
            if (c.wbCharacteristicId)
                byWB.set(c.wbCharacteristicId, c);
            byName.set(c.name.toLowerCase(), c);
        }
        var processed = [];
        var warnings = [];
        var confSum = 0;
        var items = Array.isArray(aiResults === null || aiResults === void 0 ? void 0 : aiResults.characteristics) ? aiResults.characteristics : [];
        for (var _b = 0, items_1 = items; _b < items_1.length; _b++) {
            var it = items_1[_b];
            // сопоставление: по WB id → лок id → имени
            var dbChar = (typeof it.id === 'number' && byWB.get(it.id)) ||
                (typeof it.id === 'number' && byId.get(it.id)) ||
                (it.name && byName.get(String(it.name).toLowerCase())) ||
                undefined;
            if (!dbChar) {
                warnings.push("\u0425\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0430 \"" + ((_a = it === null || it === void 0 ? void 0 : it.name) !== null && _a !== void 0 ? _a : it === null || it === void 0 ? void 0 : it.id) + "\" \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u0432 \u0411\u0414 \u2014 \u043F\u0440\u043E\u043F\u0443\u0441\u043A");
                continue;
            }
            // 🛡️ ЗАЩИТА: Исключить характеристики, которые может изменять только пользователь
            if (PROTECTED_USER_CHARACTERISTICS.has(dbChar.id)) {
                warnings.push("\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u0441\u043A\u0430\u044F \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0430 \"" + dbChar.name + "\" \u0437\u0430\u0449\u0438\u0449\u0435\u043D\u0430 \u043E\u0442 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439 \u0418\u0418");
                // Добавляем ОРИГИНАЛЬНОЕ значение пользователя
                if (dbChar.name.toLowerCase().includes('комплект')) {
                    processed.push({
                        id: dbChar.id,
                        name: dbChar.name,
                        value: protectedData.packageContents,
                        confidence: 1.0,
                        reasoning: 'Значение указано пользователем (защищено от изменений ИИ)',
                        source: 'user_input',
                        dbType: (dbChar.type === 'number' ? 'number' : 'string'),
                        isRequired: !!dbChar.isRequired
                    });
                    confSum += 1.0;
                }
                continue;
            }
            // исключить цвет полностью
            if (COLOR_CHAR_IDS.has(dbChar.id)) {
                warnings.push("\u0425\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0430 \"\u0426\u0432\u0435\u0442\" (" + dbChar.name + ") \u0438\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u0430: \u043D\u0430 WB \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438");
                continue;
            }
            // исключить габаритные/ручные поля
            if (USER_INPUT_CHARACTERISTICS.has(dbChar.id)) {
                warnings.push("\u0420\u0443\u0447\u043D\u0430\u044F (\u0433\u0430\u0431\u0430\u0440\u0438\u0442\u043D\u0430\u044F) \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0430 \"" + dbChar.name + "\" \u2014 \u0438\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u0430 \u0438\u0437 \u0430\u0432\u0442\u043E\u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F");
                continue;
            }
            // приведение типов
            var typedValue = it.value;
            if (dbChar.type === 'number' && typeof typedValue !== 'number') {
                var num = parseFloat(String(typedValue).replace(/[^\d.-]/g, ''));
                if (Number.isFinite(num))
                    typedValue = num;
            }
            else if (dbChar.type === 'string' && typeof typedValue !== 'string') {
                typedValue = String(typedValue);
            }
            // чистка строковых значений
            if (dbChar.type === 'string' && typeof typedValue === 'string') {
                typedValue = sanitizeText(typedValue);
            }
            // валидация по ограничениям БД
            var v = this.validateCharacteristicValue(typedValue, dbChar);
            if (!v.isValid) {
                warnings.push("\"" + dbChar.name + "\": " + v.error);
                continue;
            }
            var confidence = typeof it.confidence === 'number' ? it.confidence : 0.8;
            processed.push({
                id: dbChar.id,
                name: dbChar.name,
                value: typedValue,
                confidence: confidence,
                reasoning: it.reasoning || 'Определено ИИ анализом',
                source: it.source || 'ИИ система',
                dbType: (dbChar.type === 'number' ? 'number' : 'string'),
                isRequired: !!dbChar.isRequired
            });
            confSum += confidence;
        }
        var avgConf = processed.length ? confSum / processed.length : 0;
        var availableForAI = categoryCharacteristics.filter(function (c) {
            return !USER_INPUT_CHARACTERISTICS.has(c.id) &&
                !PROTECTED_USER_CHARACTERISTICS.has(c.id);
        }).length || 1;
        var fillPercentage = Math.round((processed.length / availableForAI) * 100);
        var seoTitle = sanitizeText((aiResults === null || aiResults === void 0 ? void 0 : aiResults.seoTitle) || '');
        var seoDescription = sanitizeText((aiResults === null || aiResults === void 0 ? void 0 : aiResults.seoDescription) || '');
        return {
            characteristics: processed,
            confidence: avgConf,
            fillPercentage: fillPercentage,
            warnings: warnings,
            seoTitle: seoTitle,
            seoDescription: seoDescription
        };
    };
    /** 🛡️ НОВАЯ ФУНКЦИЯ: Проверка целостности пользовательских данных */
    EnhancedCharacteristicsIntegrationService.prototype.validateUserDataIntegrity = function (processed, protectedData) {
        console.log('🔍 Финальная проверка целостности пользовательских данных...');
        // Проверяем комплектацию
        var packageContentChar = processed.characteristics.find(function (char) {
            return PROTECTED_USER_CHARACTERISTICS.has(char.id) ||
                char.name.toLowerCase().includes('комплект');
        });
        if (packageContentChar) {
            if (packageContentChar.value !== protectedData.packageContents) {
                console.warn('⚠️ КРИТИЧЕСКАЯ ОШИБКА: ИИ изменил защищенную комплектацию!');
                console.warn("   \u0417\u0430\u0449\u0438\u0449\u0435\u043D\u043E: \"" + protectedData.packageContents + "\"");
                console.warn("   \u0418\u0418: \"" + packageContentChar.value + "\"");
                // Восстанавливаем защищенное значение
                packageContentChar.value = protectedData.packageContents;
                packageContentChar.source = 'user_input_restored';
                packageContentChar.reasoning = 'Восстановлено из защищенных пользовательских данных';
                packageContentChar.confidence = 1.0;
            }
        }
        console.log('✅ Проверка целостности пользовательских данных завершена');
    };
    /** Загрузка характеристик категории */
    EnhancedCharacteristicsIntegrationService.prototype.loadCategoryCharacteristicsFromDB = function (categoryId) {
        return __awaiter(this, void 0, Promise, function () {
            var subcategory;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.wbSubcategory.findFirst({
                            where: {
                                OR: [{ id: categoryId }, { wbSubjectId: categoryId }]
                            },
                            include: {
                                characteristics: {
                                    include: {
                                        values: {
                                            where: { isActive: true },
                                            orderBy: { sortOrder: 'asc' }
                                        }
                                    },
                                    orderBy: [{ isRequired: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }]
                                },
                                parentCategory: true
                            }
                        })];
                    case 1:
                        subcategory = _a.sent();
                        if (!subcategory)
                            return [2 /*return*/, []];
                        return [2 /*return*/, subcategory.characteristics.map(function (ch) {
                                var _a, _b, _c, _d;
                                return ({
                                    id: ch.wbCharacteristicId || ch.id,
                                    wbCharacteristicId: ch.wbCharacteristicId || undefined,
                                    name: ch.name,
                                    type: (ch.type === 'number' ? 'number' : 'string'),
                                    isRequired: !!ch.isRequired,
                                    maxLength: (_a = ch.maxLength) !== null && _a !== void 0 ? _a : null,
                                    minValue: (_b = ch.minValue) !== null && _b !== void 0 ? _b : null,
                                    maxValue: (_c = ch.maxValue) !== null && _c !== void 0 ? _c : null,
                                    description: (_d = ch.description) !== null && _d !== void 0 ? _d : null,
                                    values: (ch.values || []).map(function (v) { return ({
                                        id: v.wbValueId || v.id,
                                        wbValueId: v.wbValueId || undefined,
                                        value: v.value,
                                        displayName: v.displayName || v.value
                                    }); })
                                });
                            })];
                }
            });
        });
    };
    /** Информация о категории */
    EnhancedCharacteristicsIntegrationService.prototype.getCategoryInfoFromDB = function (categoryId) {
        var _a, _b;
        return __awaiter(this, void 0, Promise, function () {
            var subcategory;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, prisma.wbSubcategory.findFirst({
                            where: { OR: [{ id: categoryId }, { wbSubjectId: categoryId }] },
                            include: { parentCategory: true }
                        })];
                    case 1:
                        subcategory = _c.sent();
                        if (subcategory) {
                            return [2 /*return*/, {
                                    id: subcategory.id,
                                    name: subcategory.name,
                                    parentName: ((_a = subcategory.parentCategory) === null || _a === void 0 ? void 0 : _a.name) || 'Родительская категория',
                                    wbSubjectId: (_b = subcategory.wbSubjectId) !== null && _b !== void 0 ? _b : undefined
                                }];
                        }
                        return [2 /*return*/, { id: categoryId, name: 'Категория', parentName: 'Родительская категория', wbSubjectId: undefined }];
                }
            });
        });
    };
    /** Валидация значения характеристики */
    EnhancedCharacteristicsIntegrationService.prototype.validateCharacteristicValue = function (value, dbChar) {
        var _a;
        var t = dbChar.type === 'number' ? 'number' : 'string';
        if (t === 'number' && typeof value !== 'number') {
            return { isValid: false, error: 'Ожидается числовое значение' };
        }
        if (t === 'string' && typeof value !== 'string') {
            return { isValid: false, error: 'Ожидается строковое значение' };
        }
        if (t === 'number') {
            if (dbChar.minValue != null && value < dbChar.minValue) {
                return { isValid: false, error: "\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043C\u0435\u043D\u044C\u0448\u0435 \u043C\u0438\u043D\u0438\u043C\u0430\u043B\u044C\u043D\u043E\u0433\u043E (" + dbChar.minValue + ")" };
            }
            if (dbChar.maxValue != null && value > dbChar.maxValue) {
                return { isValid: false, error: "\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 \u043C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u043E\u0433\u043E (" + dbChar.maxValue + ")" };
            }
        }
        if (t === 'string' && dbChar.maxLength != null && String(value).length > dbChar.maxLength) {
            return { isValid: false, error: "\u0414\u043B\u0438\u043D\u0430 \u043F\u0440\u0435\u0432\u044B\u0448\u0430\u0435\u0442 \u043C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u0443\u044E (" + dbChar.maxLength + ")" };
        }
        if ((_a = dbChar.values) === null || _a === void 0 ? void 0 : _a.length) {
            var allowed = new Set(dbChar.values.map(function (v) { return v.value; }));
            if (!allowed.has(String(value))) {
                return { isValid: false, error: 'Значение вне допустимого списка' };
            }
        }
        return { isValid: true };
    };
    /** Валидация набора характеристик */
    EnhancedCharacteristicsIntegrationService.prototype.validateCharacteristics = function (characteristics, categoryCharacteristics) {
        var warnings = [];
        var errors = [];
        // обязательные без габаритов и защищенных
        var required = categoryCharacteristics.filter(function (c) { return c.isRequired &&
            !USER_INPUT_CHARACTERISTICS.has(c.id) &&
            !PROTECTED_USER_CHARACTERISTICS.has(c.id); });
        var filledIds = new Set(characteristics.map(function (c) { return c.id; }));
        for (var _i = 0, required_1 = required; _i < required_1.length; _i++) {
            var req = required_1[_i];
            if (!filledIds.has(req.id)) {
                warnings.push("\u041D\u0435 \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u0430 \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u0430\u044F \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0430: " + req.name);
            }
        }
        // низкая уверенность
        var LOW_CONF = 0.7;
        var lowCount = characteristics.reduce(function (acc, c) { return acc + (c.confidence < LOW_CONF ? 1 : 0); }, 0);
        if (lowCount > 0) {
            warnings.push(lowCount + " \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A \u0441 \u043D\u0438\u0437\u043A\u043E\u0439 \u0443\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0441\u0442\u044C\u044E (< " + Math.round(LOW_CONF * 100) + "%)");
        }
        return { warnings: warnings, errors: errors };
    };
    /** Общая оценка качества */
    EnhancedCharacteristicsIntegrationService.prototype.calculateQualityScore = function (processed, analysisResult) {
        var _a;
        var score = 0;
        score += (processed.fillPercentage / 100) * 40;
        score += (processed.confidence) * 30;
        var analysisQuality = (_a = analysisResult === null || analysisResult === void 0 ? void 0 : analysisResult.confidence) !== null && _a !== void 0 ? _a : 0.8;
        score += analysisQuality * 30;
        return Math.min(100, Math.round(score));
    };
    /** Габариты для подсветки в UI */
    EnhancedCharacteristicsIntegrationService.prototype.getGabaritCharacteristics = function (categoryCharacteristics) {
        return categoryCharacteristics
            .filter(function (c) { return USER_INPUT_CHARACTERISTICS.has(c.id); })
            .map(function (c) { return ({
            id: c.id,
            name: c.name,
            type: c.type === 'number' ? 'number' : 'string',
            isRequired: !!c.isRequired,
            needsManualMeasurement: true
        }); });
    };
    /** Нормализация рекомендаций */
    EnhancedCharacteristicsIntegrationService.prototype.normalizeRecommendations = function (input) {
        if (Array.isArray(input))
            return input.filter(function (x) { return typeof x === 'string'; });
        if (typeof input === 'string')
            return [input];
        if (input && typeof input === 'object') {
            var out = [];
            for (var _i = 0, _a = Object.entries(input); _i < _a.length; _i++) {
                var _b = _a[_i], k = _b[0], v = _b[1];
                if (typeof v === 'string')
                    out.push(k + ": " + v);
                else if (Array.isArray(v))
                    for (var _c = 0, v_1 = v; _c < v_1.length; _c++) {
                        var i = v_1[_c];
                        if (typeof i === 'string')
                            out.push(k + ": " + i);
                    }
            }
            return out;
        }
        return [];
    };
    /** 🛡️ ОБНОВЛЕННАЯ ФУНКЦИЯ: Генерация рекомендаций с учетом защиты данных */
    EnhancedCharacteristicsIntegrationService.prototype.generateEnhancedRecommendations = function (processed, validation, systemRecommendations, protectedData) {
        var base = this.normalizeRecommendations(systemRecommendations);
        var recs = __spreadArrays(base);
        // Стандартные рекомендации
        if (processed.fillPercentage < 60) {
            recs.push('Низкий процент заполнения характеристик — улучшите качество входных данных/референсов.');
        }
        if (processed.confidence < 0.7) {
            recs.push('Низкая средняя уверенность — проверьте ключевые характеристики вручную.');
        }
        if (validation.warnings.length > 5) {
            recs.push('Много предупреждений валидации — требуется внимательная проверка данных.');
        }
        // 🛡️ НОВЫЕ РЕКОМЕНДАЦИИ по защите данных
        recs.push('✅ Комплектация товара сохранена согласно пользовательскому вводу.');
        recs.push("\u2705 \u0412\u0435\u0441 \u0442\u043E\u0432\u0430\u0440\u0430 \u043D\u043E\u0440\u043C\u0430\u043B\u0438\u0437\u043E\u0432\u0430\u043D: " + protectedData.normalizedWeight + " \u043A\u0433.");
        recs.push('✅ Размеры упаковки защищены от изменений ИИ системой.');
        // Общие рекомендации системы
        recs.push('🤖 Использована защищенная система GPT-5-mini + GPT-4.1.');
        recs.push('📐 Габаритные характеристики заполняются вручную по факту измерений.');
        recs.push('🛡️ Пользовательские данные защищены от переопределения ИИ.');
        recs.push('🔍 Перед публикацией проверьте соответствие характеристик реальному товару.');
        return recs;
    };
    /** Преобразование в формат WB API */
    EnhancedCharacteristicsIntegrationService.prototype.formatForWildberries = function (result) {
        return __awaiter(this, void 0, Promise, function () {
            var filtered;
            return __generator(this, function (_a) {
                filtered = result.characteristics.filter(function (c) { return !COLOR_CHAR_IDS.has(c.id); });
                return [2 /*return*/, filtered.map(function (c) {
                        if (c.detectedType === 'number') {
                            return { id: c.id, value: Number(c.value) };
                        }
                        if (Array.isArray(c.value)) {
                            return { id: c.id, value: c.value.map(function (v) { return sanitizeText(v); }) };
                        }
                        return { id: c.id, value: sanitizeText(c.value) };
                    })];
            });
        });
    };
    /** 🛡️ НОВАЯ ФУНКЦИЯ: Проверка защищенных полей перед анализом */
    EnhancedCharacteristicsIntegrationService.prototype.validateProtectedFields = function (input) {
        var errors = [];
        var warnings = [];
        // Проверка комплектации
        if (!input.packageContents || input.packageContents.trim() === '') {
            errors.push('Комплектация товара обязательна для заполнения');
        }
        else if (input.packageContents.length > 1000) {
            warnings.push('Комплектация слишком длинная (рекомендуется до 1000 символов)');
        }
        // Проверка размеров
        var dimensions = input.dimensions || {};
        if (!dimensions.weight) {
            warnings.push('Не указан вес товара, будет использовано значение по умолчанию (0.5 кг)');
        }
        // Нормализация данных
        var normalizedData = this.extractAndProtectUserData(input);
        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings,
            normalizedData: normalizedData
        };
    };
    /** 🛡️ НОВАЯ ФУНКЦИЯ: Получение статистики защиты данных */
    EnhancedCharacteristicsIntegrationService.prototype.getDataProtectionStats = function () {
        return {
            protectedCharacteristics: Array.from(PROTECTED_USER_CHARACTERISTICS),
            protectedFieldsCount: PROTECTED_USER_CHARACTERISTICS.size,
            userInputCharacteristics: Array.from(USER_INPUT_CHARACTERISTICS),
            colorCharacteristics: Array.from(COLOR_CHAR_IDS),
            totalProtected: PROTECTED_USER_CHARACTERISTICS.size + USER_INPUT_CHARACTERISTICS.size + COLOR_CHAR_IDS.size
        };
    };
    /** 🛡️ НОВАЯ ФУНКЦИЯ: Создание отчета по защите данных */
    EnhancedCharacteristicsIntegrationService.prototype.createDataProtectionReport = function (input, result) {
        var _a, _b, _c;
        var protectedData = this.extractAndProtectUserData(input);
        // Проверяем, что комплектация в результате соответствует оригинальной
        var packageContentChar = result.characteristics.find(function (char) {
            return char.name.toLowerCase().includes('комплект') ||
                PROTECTED_USER_CHARACTERISTICS.has(char.id);
        });
        var packageContentsProtected = !packageContentChar ||
            packageContentChar.value === protectedData.packageContents;
        var protectionLog = [
            "\uD83D\uDEE1\uFE0F \u0421\u0438\u0441\u0442\u0435\u043C\u0430 \u0437\u0430\u0449\u0438\u0442\u044B \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u0441\u043A\u0438\u0445 \u0434\u0430\u043D\u043D\u044B\u0445 \u0430\u043A\u0442\u0438\u0432\u0438\u0440\u043E\u0432\u0430\u043D\u0430",
            "\uD83D\uDCE6 \u041A\u043E\u043C\u043F\u043B\u0435\u043A\u0442\u0430\u0446\u0438\u044F: " + (packageContentsProtected ? 'ЗАЩИЩЕНА' : 'ИЗМЕНЕНА'),
            "\u2696\uFE0F \u0412\u0435\u0441 \u043D\u043E\u0440\u043C\u0430\u043B\u0438\u0437\u043E\u0432\u0430\u043D: " + ((_a = input.dimensions) === null || _a === void 0 ? void 0 : _a.weight) + " \u2192 " + protectedData.normalizedWeight + " \u043A\u0433",
            "\uD83D\uDCD0 \u0420\u0430\u0437\u043C\u0435\u0440\u044B \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B: " + JSON.stringify(protectedData.dimensions),
            "\uD83D\uDD12 \u0417\u0430\u0449\u0438\u0449\u0435\u043D\u043D\u044B\u0445 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A: " + PROTECTED_USER_CHARACTERISTICS.size,
            "\uD83D\uDEAB \u0418\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u043D\u044B\u0445 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A: " + (USER_INPUT_CHARACTERISTICS.size + COLOR_CHAR_IDS.size)
        ];
        return {
            originalData: {
                packageContents: input.packageContents || '',
                weight: (_b = input.dimensions) === null || _b === void 0 ? void 0 : _b.weight,
                dimensions: input.dimensions
            },
            processedData: {
                packageContents: protectedData.packageContents,
                normalizedWeight: protectedData.normalizedWeight,
                protectedDimensions: protectedData.dimensions
            },
            protectionStatus: {
                packageContentsProtected: packageContentsProtected,
                weightNormalized: protectedData.normalizedWeight !== ((_c = input.dimensions) === null || _c === void 0 ? void 0 : _c.weight),
                dimensionsProtected: true,
                allDataIntact: packageContentsProtected
            },
            protectionLog: protectionLog
        };
    };
    /** 🛡️ НОВАЯ ФУНКЦИЯ: Экстренное восстановление пользовательских данных */
    EnhancedCharacteristicsIntegrationService.prototype.emergencyRestoreUserData = function (characteristics, originalInput) {
        var protectedData = this.extractAndProtectUserData(originalInput);
        var restored = characteristics.map(function (char) { return (__assign({}, char)); });
        console.log('🚨 ЭКСТРЕННОЕ ВОССТАНОВЛЕНИЕ пользовательских данных...');
        for (var _i = 0, restored_1 = restored; _i < restored_1.length; _i++) {
            var char = restored_1[_i];
            // Восстановление комплектации
            if (PROTECTED_USER_CHARACTERISTICS.has(char.id) ||
                char.name.toLowerCase().includes('комплект')) {
                if (char.value !== protectedData.packageContents) {
                    console.log("\uD83D\uDD27 \u0412\u043E\u0441\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0435\u043C \"" + char.name + "\": \"" + char.value + "\" \u2192 \"" + protectedData.packageContents + "\"");
                    char.value = protectedData.packageContents;
                    char.source = 'emergency_restore';
                    char.restored = true;
                }
            }
        }
        console.log('✅ Экстренное восстановление завершено');
        return restored;
    };
    return EnhancedCharacteristicsIntegrationService;
}());
exports.EnhancedCharacteristicsIntegrationService = EnhancedCharacteristicsIntegrationService;
/** Экспорт инстанса */
exports.enhancedCharacteristicsIntegrationService = new EnhancedCharacteristicsIntegrationService();
