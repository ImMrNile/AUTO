"use strict";
// lib/services/wbApiService.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ С ПРАВИЛЬНЫМИ ИМПОРТАМИ
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
exports.wbApiService = exports.WbApiService = void 0;
var wbApiConfig_1 = require("../config/wbApiConfig");
var wbCharacteristicsUtils_1 = require("../utils/wbCharacteristicsUtils");
// ИСКЛЮЧЕННЫЕ ХАРАКТЕРИСТИКИ (системные)
var EXCLUDED_CHARACTERISTICS_IDS = new Set([
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
// FALLBACK для числовых характеристик (если нет в БД)
var FALLBACK_NUMERIC_IDS = new Set([
    89008, 13491, 90746, 72739, 90878, 63292, 65667, 65666, 75146,
    89064, 90630, 90652, 90607, 90608, 11001, 11002, 90653, 90654, 90655,
    15003008, 15003011, 5478, 5479, 5480, 5481, 5482, 6234, 6235, 6236, 6237,
    7891, 7894, 7895, 7896, 8456, 8457, 8458, 9123, 9124, 9125,
    10234, 10235, 10236, 10237, 11003, 12001, 12002, 12003,
    13001, 13002, 13003, 14001, 14002, 14003, 15001, 15002, 15003
]);
var WbApiService = /** @class */ (function () {
    function WbApiService() {
        this.BASE_URL = wbApiConfig_1.WB_API_CONFIG.BASE_URLS.CONTENT;
        this.TIMEOUT = wbApiConfig_1.WB_API_CONFIG.TIMEOUTS.DEFAULT;
        // Кеш типов характеристик из БД
        this.characteristicTypesCache = new Map();
        // Кеш категорий и характеристик
        this.categoriesCache = new Map();
        this.characteristicsCache = new Map();
    }
    /**
     * Валидация токена WB
     */
    WbApiService.prototype.validateToken = function (token) {
        try {
            var segments = token.split('.');
            if (segments.length !== 3) {
                console.error('❌ Токен должен содержать 3 сегмента, получено:', segments.length);
                return false;
            }
            var payload = JSON.parse(atob(segments[1]));
            if (!payload.sid || !payload.exp) {
                console.error('❌ Отсутствуют обязательные поля в токене');
                return false;
            }
            if (Date.now() > payload.exp * 1000) {
                console.error('❌ Токен истек');
                return false;
            }
            console.log('✅ Токен валиден, ID продавца:', payload.sid);
            return true;
        }
        catch (error) {
            console.error('❌ Ошибка валидации токена:', error);
            return false;
        }
    };
    /**
     * Универсальный метод для запросов к WB API
     */
    WbApiService.prototype.makeRequest = function (endpoint, apiToken, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, Promise, function () {
            var url, headers, controller_1, timeoutId, response, responseClone, errorData, responseText, parseError_1, formattedError, data, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.validateToken(apiToken)) {
                            throw new Error('Недействительный токен API. Проверьте формат и срок действия.');
                        }
                        url = "" + this.BASE_URL + endpoint;
                        headers = __assign({ 'Authorization': apiToken, 'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': 'WB-AI-Assistant/2.0' }, options.headers);
                        console.log("\uD83C\uDF10 \u041E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u043C \u0437\u0430\u043F\u0440\u043E\u0441 \u0432 WB API: " + url);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 9, , 10]);
                        controller_1 = new AbortController();
                        timeoutId = setTimeout(function () { return controller_1.abort(); }, this.TIMEOUT);
                        return [4 /*yield*/, fetch(url, __assign(__assign({}, options), { headers: headers, signal: controller_1.signal }))];
                    case 2:
                        response = _a.sent();
                        clearTimeout(timeoutId);
                        responseClone = response.clone();
                        if (!!response.ok) return [3 /*break*/, 7];
                        errorData = null;
                        responseText = '';
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, responseClone.text()];
                    case 4:
                        responseText = _a.sent();
                        console.log('📥 Полный текст ответа от WB API:', responseText);
                        if (responseText) {
                            errorData = JSON.parse(responseText);
                        }
                        return [3 /*break*/, 6];
                    case 5:
                        parseError_1 = _a.sent();
                        console.warn('⚠️ Не удалось распарсить ответ как JSON, используем текст');
                        errorData = { message: responseText || 'Пустой ответ от сервера' };
                        return [3 /*break*/, 6];
                    case 6:
                        formattedError = this.formatWBApiError(response.status, errorData, responseText);
                        throw new Error(formattedError);
                    case 7: return [4 /*yield*/, response.json()];
                    case 8:
                        data = _a.sent();
                        console.log('✅ Успешный ответ от WB API');
                        return [2 /*return*/, data];
                    case 9:
                        error_1 = _a.sent();
                        if (error_1 instanceof Error) {
                            if (error_1.name === 'AbortError') {
                                throw new Error('Превышено время ожидания ответа от WB API');
                            }
                            throw error_1;
                        }
                        throw new Error('Неизвестная ошибка при запросе к WB API');
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Форматирование ошибок WB API
     */
    WbApiService.prototype.formatWBApiError = function (status, errorData, responseText) {
        switch (status) {
            case 400:
                console.error('❌ Ошибка 400 - Неверные данные запроса:', errorData);
                var detailedError = (errorData === null || errorData === void 0 ? void 0 : errorData.errors) ?
                    "\u041E\u0448\u0438\u0431\u043A\u0438 \u0432\u0430\u043B\u0438\u0434\u0430\u0446\u0438\u0438: " + JSON.stringify(errorData.errors) :
                    "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435: " + ((errorData === null || errorData === void 0 ? void 0 : errorData.message) || (errorData === null || errorData === void 0 ? void 0 : errorData.detail) || responseText);
                return detailedError;
            case 401:
                console.error('❌ Ошибка авторизации WB API:', errorData);
                return "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0442\u043E\u043A\u0435\u043D API: " + ((errorData === null || errorData === void 0 ? void 0 : errorData.detail) || (errorData === null || errorData === void 0 ? void 0 : errorData.message) || 'Проверьте токен в личном кабинете');
            case 403:
                console.error('❌ Ошибка доступа WB API:', errorData);
                return "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u043F\u0440\u0430\u0432 \u0434\u043E\u0441\u0442\u0443\u043F\u0430: " + ((errorData === null || errorData === void 0 ? void 0 : errorData.detail) || (errorData === null || errorData === void 0 ? void 0 : errorData.message) || 'Проверьте права токена');
            case 404:
                console.error('❌ Ресурс не найден WB API:', errorData);
                return "\u0420\u0435\u0441\u0443\u0440\u0441 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D: " + ((errorData === null || errorData === void 0 ? void 0 : errorData.detail) || (errorData === null || errorData === void 0 ? void 0 : errorData.message) || 'Проверьте правильность запроса');
            case 409:
                console.error('❌ Конфликт данных WB API:', errorData);
                return "\u041A\u043E\u043D\u0444\u043B\u0438\u043A\u0442 \u0434\u0430\u043D\u043D\u044B\u0445: " + ((errorData === null || errorData === void 0 ? void 0 : errorData.detail) || (errorData === null || errorData === void 0 ? void 0 : errorData.message) || 'Возможно, артикул уже существует');
            case 422:
                console.error('❌ Ошибка валидации WB API:', errorData);
                return "\u041E\u0448\u0438\u0431\u043A\u0430 \u0432\u0430\u043B\u0438\u0434\u0430\u0446\u0438\u0438 \u0434\u0430\u043D\u043D\u044B\u0445: " + ((errorData === null || errorData === void 0 ? void 0 : errorData.detail) || (errorData === null || errorData === void 0 ? void 0 : errorData.message) || 'Проверьте корректность данных');
            case 429:
                console.error('❌ Превышен лимит запросов WB API');
                return 'Превышен лимит запросов. Повторите через минуту.';
            case 500:
            case 502:
            case 503:
            case 504:
                console.error('❌ Серверная ошибка WB API:', errorData);
                return "\u0412\u0440\u0435\u043C\u0435\u043D\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430 WB (" + status + "). \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u043E\u0437\u0436\u0435.";
            default:
                var errorText = (errorData === null || errorData === void 0 ? void 0 : errorData.detail) || (errorData === null || errorData === void 0 ? void 0 : errorData.message) || responseText || 'Неизвестная ошибка';
                return "\u041E\u0448\u0438\u0431\u043A\u0430 WB API (" + status + "): " + errorText;
        }
    };
    /**
     * ОБНОВЛЕННАЯ ФУНКЦИЯ: Создание карточки товара с поддержкой двух цен
     */
    WbApiService.prototype.createProductCard = function (cardData, apiToken, categoryCharacteristics) {
        var _a;
        return __awaiter(this, void 0, Promise, function () {
            var variant, correctedCardData, cardValidation, pricingStats, response, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        console.log('📦 Создаем карточку товара через WB API v2 с поддержкой двух цен...');
                        if (!cardData.subjectID) {
                            throw new Error('Не указан ID категории (subjectID)');
                        }
                        if (!cardData.variants || cardData.variants.length === 0) {
                            throw new Error('Не указаны варианты товара');
                        }
                        variant = cardData.variants[0];
                        if (!variant.vendorCode) {
                            throw new Error('Не указан артикул товара');
                        }
                        // Валидация артикула
                        if (!wbApiConfig_1.WBApiUtils.validateVendorCode(variant.vendorCode)) {
                            throw new Error('Некорректный формат артикула');
                        }
                        // Кешируем типы характеристик если переданы
                        if (categoryCharacteristics && categoryCharacteristics.length > 0) {
                            this.cacheCharacteristicTypes(categoryCharacteristics);
                        }
                        correctedCardData = this.createCorrectedCardData(cardData);
                        wbCharacteristicsUtils_1.logCardStructure(correctedCardData, 'ИСПРАВЛЕННЫЕ данные карточки с ценами');
                        cardValidation = this.validateCardData(correctedCardData);
                        if (!cardValidation.isValid) {
                            console.error('❌ Ошибки валидации карточки:', cardValidation.errors);
                            throw new Error("\u041E\u0448\u0438\u0431\u043A\u0438 \u0432\u0430\u043B\u0438\u0434\u0430\u0446\u0438\u0438: " + cardValidation.errors.join('; '));
                        }
                        pricingStats = this.analyzePricingStructure(correctedCardData.variants[0].sizes);
                        this.logPricingStats(pricingStats);
                        return [4 /*yield*/, this.makeRequest(wbApiConfig_1.WB_API_CONFIG.ENDPOINTS.CREATE_CARDS, apiToken, {
                                method: 'POST',
                                body: JSON.stringify([correctedCardData])
                            })];
                    case 1:
                        response = _b.sent();
                        console.log('📥 Полный ответ от WB API:', JSON.stringify(response, null, 2));
                        if (response.error) {
                            console.error('❌ Ошибка в ответе WB API:', response.error);
                            return [2 /*return*/, {
                                    success: false,
                                    error: wbApiConfig_1.WBApiUtils.formatApiError(response.error)
                                }];
                        }
                        if (Array.isArray(response) && response.length > 0 && response[0].error) {
                            console.error('❌ Ошибка в массиве ответов:', response[0].error);
                            return [2 /*return*/, {
                                    success: false,
                                    error: wbApiConfig_1.WBApiUtils.formatApiError(response[0].error)
                                }];
                        }
                        console.log('✅ Карточка с поддержкой двух цен успешно создана');
                        console.log("\uD83D\uDCB0 \u041E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E \u0440\u0430\u0437\u043C\u0435\u0440\u043E\u0432 \u0441 \u0446\u0435\u043D\u043E\u0432\u043E\u0439 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u0435\u0439: " + pricingStats.totalSizes);
                        console.log("\uD83D\uDCCA \u0420\u0430\u0437\u043C\u0435\u0440\u043E\u0432 \u0441\u043E \u0441\u043A\u0438\u0434\u043A\u043E\u0439: " + pricingStats.sizesWithDiscount);
                        return [2 /*return*/, {
                                success: true,
                                data: response,
                                taskId: response.taskId || (Array.isArray(response) ? (_a = response[0]) === null || _a === void 0 ? void 0 : _a.taskId : null)
                            }];
                    case 2:
                        error_2 = _b.sent();
                        console.error('❌ Ошибка создания карточки с двумя ценами:', error_2);
                        return [2 /*return*/, {
                                success: false,
                                error: error_2 instanceof Error ? error_2.message : 'Неизвестная ошибка'
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Кеширование типов характеристик из БД
     */
    WbApiService.prototype.cacheCharacteristicTypes = function (characteristics) {
        console.log('💾 Кеширование типов характеристик из БД...');
        for (var _i = 0, characteristics_1 = characteristics; _i < characteristics_1.length; _i++) {
            var char = characteristics_1[_i];
            var id = char.wbCharacteristicId || char.id;
            var type = char.type || 'string';
            this.characteristicTypesCache.set(id, type);
            console.log("\uD83D\uDCCB \u041A\u0435\u0448: ID " + id + " \u2192 \u0442\u0438\u043F \"" + type + "\"");
        }
        console.log("\u2705 \u0417\u0430\u043A\u0435\u0448\u0438\u0440\u043E\u0432\u0430\u043D\u043E " + this.characteristicTypesCache.size + " \u0442\u0438\u043F\u043E\u0432 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A");
    };
    /**
     * Определение типа характеристики (БД → fallback)
     */
    WbApiService.prototype.getCharacteristicType = function (characteristicId) {
        // Сначала проверяем кеш из БД
        var cachedType = this.characteristicTypesCache.get(characteristicId);
        if (cachedType) {
            console.log("\uD83D\uDCCB \u0422\u0438\u043F \u0438\u0437 \u0411\u0414: ID " + characteristicId + " \u2192 " + cachedType);
            return cachedType === 'number' ? 'number' : 'string';
        }
        // Fallback для старых данных
        var isNumeric = FALLBACK_NUMERIC_IDS.has(characteristicId);
        console.log("\uD83D\uDCCB \u0422\u0438\u043F fallback: ID " + characteristicId + " \u2192 " + (isNumeric ? 'number' : 'string'));
        return isNumeric ? 'number' : 'string';
    };
    /**
     * ОБНОВЛЕННАЯ ФУНКЦИЯ: Создание корректной структуры данных для WB API с двумя ценами
     */
    WbApiService.prototype.createCorrectedCardData = function (originalData) {
        var variant = originalData.variants[0];
        // Обработка характеристик с типами из БД
        var correctedCharacteristics = this.correctCharacteristicsWithDbTypes(variant.characteristics || []);
        // ОБНОВЛЕННАЯ корректировка размеров с поддержкой двух цен
        var correctedSizes = this.correctSizesWithDualPricing(variant.sizes || []);
        // Валидация и коррекция размеров упаковки
        var dimensions = this.validateAndCorrectDimensions(variant.dimensions);
        var correctedData = {
            subjectID: originalData.subjectID,
            variants: [{
                    vendorCode: variant.vendorCode,
                    title: wbApiConfig_1.WBApiUtils.truncateText(variant.title || 'Товар', 120),
                    description: wbApiConfig_1.WBApiUtils.truncateText(variant.description || 'Описание товара', 5000),
                    brand: variant.brand || wbApiConfig_1.DEFAULT_VALUES.BRAND || 'Нет бренда',
                    dimensions: dimensions,
                    characteristics: correctedCharacteristics,
                    sizes: correctedSizes // Теперь с поддержкой discountedPrice
                }]
        };
        return correctedData;
    };
    /**
     * Валидация и коррекция размеров упаковки
     */
    WbApiService.prototype.validateAndCorrectDimensions = function (dimensions) {
        var defaultDims = wbApiConfig_1.EXTENDED_DEFAULT_VALUES.DIMENSIONS;
        // 🛡️ ИСПРАВЛЕННАЯ ЛОГИКА ОБРАБОТКИ ВЕСА
        var userWeight = Number((dimensions === null || dimensions === void 0 ? void 0 : dimensions.weightBrutto) || (dimensions === null || dimensions === void 0 ? void 0 : dimensions.weight));
        var weightInGrams;
        console.log("\uD83D\uDCD0 \u0418\u0441\u0445\u043E\u0434\u043D\u044B\u0439 \u0432\u0435\u0441 \u043E\u0442 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F: " + userWeight + " (\u0442\u0438\u043F: " + typeof userWeight + ")");
        if (userWeight && !isNaN(userWeight)) {
            // ✅ НОВАЯ ЛОГИКА: Определяем единицы измерения
            if (userWeight <= 10) {
                // Если значение ≤ 10, скорее всего это килограммы
                weightInGrams = Math.round(userWeight * 1000);
                console.log("\uD83D\uDCD0 \u0412\u0435\u0441 \u0438\u043D\u0442\u0435\u0440\u043F\u0440\u0435\u0442\u0438\u0440\u043E\u0432\u0430\u043D \u043A\u0430\u043A \u043A\u0438\u043B\u043E\u0433\u0440\u0430\u043C\u043C\u044B: " + userWeight + " \u043A\u0433 \u2192 " + weightInGrams + " \u0433");
            }
            else if (userWeight >= 1000) {
                // Если значение ≥ 1000, скорее всего уже граммы
                weightInGrams = Math.round(userWeight);
                console.log("\uD83D\uDCD0 \u0412\u0435\u0441 \u043F\u0440\u0438\u043D\u044F\u0442 \u043A\u0430\u043A \u0433\u0440\u0430\u043C\u043C\u044B: " + weightInGrams + " \u0433");
            }
            else {
                // Промежуточные значения (10-1000) - неопределенность
                // Проверяем контекст или используем умную логику
                if (userWeight < 100) {
                    // Вероятно килограммы (10-100 кг - разумный диапазон для товаров)
                    weightInGrams = Math.round(userWeight * 1000);
                    console.log("\uD83D\uDCD0 \u0412\u0435\u0441 \u0438\u043D\u0442\u0435\u0440\u043F\u0440\u0435\u0442\u0438\u0440\u043E\u0432\u0430\u043D \u043A\u0430\u043A \u043A\u0438\u043B\u043E\u0433\u0440\u0430\u043C\u043C\u044B (\u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D 10-100): " + userWeight + " \u043A\u0433 \u2192 " + weightInGrams + " \u0433");
                }
                else {
                    // Вероятно граммы (100-1000 г - тоже разумный диапазон)
                    weightInGrams = Math.round(userWeight);
                    console.log("\uD83D\uDCD0 \u0412\u0435\u0441 \u043F\u0440\u0438\u043D\u044F\u0442 \u043A\u0430\u043A \u0433\u0440\u0430\u043C\u043C\u044B (\u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D 100-1000): " + weightInGrams + " \u0433");
                }
            }
        }
        else {
            // Дефолтное значение если вес не указан или некорректен
            weightInGrams = defaultDims.WEIGHT || 500;
            console.log("\uD83D\uDCD0 \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D \u0434\u0435\u0444\u043E\u043B\u0442\u043D\u044B\u0439 \u0432\u0435\u0441: " + weightInGrams + " \u0433");
        }
        // ✅ ВАЛИДАЦИЯ: WB требует вес в граммах от 1 до 1000000
        weightInGrams = Math.max(1, Math.min(1000000, weightInGrams));
        var corrected = {
            length: Math.max(1, Math.round(Number(dimensions === null || dimensions === void 0 ? void 0 : dimensions.length) || defaultDims.LENGTH)),
            width: Math.max(1, Math.round(Number(dimensions === null || dimensions === void 0 ? void 0 : dimensions.width) || defaultDims.WIDTH)),
            height: Math.max(1, Math.round(Number(dimensions === null || dimensions === void 0 ? void 0 : dimensions.height) || defaultDims.HEIGHT)),
            weightBrutto: weightInGrams // ✅ Вес в граммах для WB API
        };
        // Валидация размеров
        var validationErrors = wbApiConfig_1.WBApiUtils.validateDimensions({
            length: corrected.length,
            width: corrected.width,
            height: corrected.height,
            weight: corrected.weightBrutto / 1000 // Передаем в кг для валидации
        });
        if (validationErrors.length > 0) {
            console.warn('⚠️ Ошибки валидации размеров:', validationErrors);
        }
        console.log("\uD83D\uDCD0 \u0424\u0438\u043D\u0430\u043B\u044C\u043D\u044B\u0435 \u0440\u0430\u0437\u043C\u0435\u0440\u044B \u0434\u043B\u044F WB API:");
        console.log("   - \u0414\u043B\u0438\u043D\u0430: " + corrected.length + " \u0441\u043C");
        console.log("   - \u0428\u0438\u0440\u0438\u043D\u0430: " + corrected.width + " \u0441\u043C");
        console.log("   - \u0412\u044B\u0441\u043E\u0442\u0430: " + corrected.height + " \u0441\u043C");
        console.log("   - \u0412\u0435\u0441: " + corrected.weightBrutto + " \u0433 (" + (corrected.weightBrutto / 1000).toFixed(2) + " \u043A\u0433)");
        return corrected;
    };
    /**
     * 🛡️ НОВАЯ ФУНКЦИЯ: Умная нормализация веса
     */
    WbApiService.prototype.smartWeightNormalization = function (inputWeight, context) {
        var weight = parseFloat(String(inputWeight).replace(/[^\d.,]/g, '').replace(',', '.'));
        if (isNaN(weight) || weight <= 0) {
            console.warn("\u26A0\uFE0F \u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0432\u0435\u0441: \"" + inputWeight + "\", \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u043C 500\u0433");
            return 500;
        }
        // Контекстная логика определения единиц
        var contextHints = {
            hasKgIndicator: String(inputWeight).toLowerCase().includes('кг'),
            hasGramIndicator: String(inputWeight).toLowerCase().includes('г'),
            hasDecimalPoint: String(inputWeight).includes('.') || String(inputWeight).includes(',')
        };
        console.log("\uD83D\uDD0D \u0410\u043D\u0430\u043B\u0438\u0437 \u0432\u0435\u0441\u0430 \"" + inputWeight + "\":", __assign({ numericValue: weight }, contextHints));
        // Если есть явные указатели единиц
        if (contextHints.hasKgIndicator) {
            var result_1 = Math.round(weight * 1000);
            console.log("\u2705 \u042F\u0432\u043D\u044B\u0439 \u0438\u043D\u0434\u0438\u043A\u0430\u0442\u043E\u0440 \"\u043A\u0433\": " + weight + " \u043A\u0433 \u2192 " + result_1 + " \u0433");
            return result_1;
        }
        if (contextHints.hasGramIndicator) {
            var result_2 = Math.round(weight);
            console.log("\u2705 \u042F\u0432\u043D\u044B\u0439 \u0438\u043D\u0434\u0438\u043A\u0430\u0442\u043E\u0440 \"\u0433\": " + result_2 + " \u0433");
            return result_2;
        }
        // Логика по численному значению
        if (weight <= 0.001) {
            // Очень маленькие значения - вероятно килограммы в десятичной записи
            var result_3 = Math.round(weight * 1000000); // микрограммы → граммы
            console.log("\uD83D\uDD2C \u041C\u0438\u043A\u0440\u043E\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: " + weight + " \u2192 " + result_3 + " \u0433");
            return Math.max(1, result_3);
        }
        if (weight <= 10) {
            // 0.001 - 10: вероятно килограммы
            var result_4 = Math.round(weight * 1000);
            console.log("\u2696\uFE0F \u0418\u043D\u0442\u0435\u0440\u043F\u0440\u0435\u0442\u0430\u0446\u0438\u044F \u043A\u0430\u043A \u043A\u0433: " + weight + " \u043A\u0433 \u2192 " + result_4 + " \u0433");
            return result_4;
        }
        if (weight <= 100) {
            // 10 - 100: неопределенность, используем контекст
            if (contextHints.hasDecimalPoint) {
                // Если есть десятичная точка, вероятно килограммы
                var result_5 = Math.round(weight * 1000);
                console.log("\uD83D\uDCCA \u0414\u0435\u0441\u044F\u0442\u0438\u0447\u043D\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043A\u0430\u043A \u043A\u0433: " + weight + " \u043A\u0433 \u2192 " + result_5 + " \u0433");
                return result_5;
            }
            else {
                // Целое число - вероятно граммы
                var result_6 = Math.round(weight);
                console.log("\uD83D\uDD22 \u0426\u0435\u043B\u043E\u0435 \u0447\u0438\u0441\u043B\u043E \u043A\u0430\u043A \u0433\u0440\u0430\u043C\u043C\u044B: " + result_6 + " \u0433");
                return result_6;
            }
        }
        if (weight <= 1000) {
            // 100 - 1000: скорее всего граммы
            var result_7 = Math.round(weight);
            console.log("\uD83D\uDCE6 \u0421\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u044B\u0439 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D \u0433\u0440\u0430\u043C\u043C\u043E\u0432: " + result_7 + " \u0433");
            return result_7;
        }
        // > 1000: точно граммы
        var result = Math.round(weight);
        console.log("\uD83D\uDCC8 \u0411\u043E\u043B\u044C\u0448\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043A\u0430\u043A \u0433\u0440\u0430\u043C\u043C\u044B: " + result + " \u0433");
        return result;
    };
    /**
     * 🛡️ НОВАЯ ФУНКЦИЯ: Валидация веса для WB
     */
    WbApiService.prototype.validateWeightForWB = function (weightInGrams) {
        var warnings = [];
        var correctedWeight = weightInGrams;
        // WB ограничения: 1г - 1000кг (1,000,000г)
        var MIN_WEIGHT = 1;
        var MAX_WEIGHT = 1000000;
        if (weightInGrams < MIN_WEIGHT) {
            warnings.push("\u0412\u0435\u0441 " + weightInGrams + "\u0433 \u043C\u0435\u043D\u044C\u0448\u0435 \u043C\u0438\u043D\u0438\u043C\u0430\u043B\u044C\u043D\u043E\u0433\u043E (" + MIN_WEIGHT + "\u0433)");
            correctedWeight = MIN_WEIGHT;
        }
        if (weightInGrams > MAX_WEIGHT) {
            warnings.push("\u0412\u0435\u0441 " + weightInGrams + "\u0433 \u0431\u043E\u043B\u044C\u0448\u0435 \u043C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u043E\u0433\u043E (" + MAX_WEIGHT + "\u0433 = 1000\u043A\u0433)");
            correctedWeight = MAX_WEIGHT;
        }
        // Проверка на разумность
        if (weightInGrams > 50000) { // > 50 кг
            warnings.push("\u0412\u0435\u0441 " + weightInGrams + "\u0433 (" + (weightInGrams / 1000).toFixed(1) + "\u043A\u0433) \u043A\u0430\u0436\u0435\u0442\u0441\u044F \u043E\u0447\u0435\u043D\u044C \u0431\u043E\u043B\u044C\u0448\u0438\u043C \u0434\u043B\u044F \u043E\u0431\u044B\u0447\u043D\u043E\u0433\u043E \u0442\u043E\u0432\u0430\u0440\u0430");
        }
        if (weightInGrams < 10) { // < 10 г
            warnings.push("\u0412\u0435\u0441 " + weightInGrams + "\u0433 \u043A\u0430\u0436\u0435\u0442\u0441\u044F \u043E\u0447\u0435\u043D\u044C \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u0438\u043C \u0434\u043B\u044F \u043E\u0431\u044B\u0447\u043D\u043E\u0433\u043E \u0442\u043E\u0432\u0430\u0440\u0430");
        }
        return {
            isValid: warnings.length === 0,
            correctedWeight: correctedWeight,
            warnings: warnings
        };
    };
    /**
     * 🛡️ ФУНКЦИЯ ДЛЯ ОТЛАДКИ: Лог всех преобразований веса
     */
    WbApiService.prototype.logWeightConversion = function (originalInput, finalWeight) {
        console.log("\n\uD83D\uDCCA \u041E\u0422\u0427\u0415\u0422 \u041E \u041F\u0420\u0415\u041E\u0411\u0420\u0410\u0417\u041E\u0412\u0410\u041D\u0418\u0418 \u0412\u0415\u0421\u0410:");
        console.log("   \uD83D\uDD22 \u0418\u0441\u0445\u043E\u0434\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435: " + JSON.stringify(originalInput));
        console.log("   \u2696\uFE0F \u0424\u0438\u043D\u0430\u043B\u044C\u043D\u044B\u0439 \u0432\u0435\u0441: " + finalWeight + " \u0433 (" + (finalWeight / 1000).toFixed(3) + " \u043A\u0433)");
        console.log("   \uD83D\uDCC8 \u041A\u043E\u044D\u0444\u0444\u0438\u0446\u0438\u0435\u043D\u0442: " + ((originalInput === null || originalInput === void 0 ? void 0 : originalInput.weight) ? (finalWeight / Number(originalInput.weight)).toFixed(2) : 'N/A'));
        console.log("   \u2705 \u0421\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u0435\u0442 WB API: " + (finalWeight >= 1 && finalWeight <= 1000000 ? 'ДА' : 'НЕТ'));
    };
    /**
     * Корректировка характеристик с типами из БД
     */
    WbApiService.prototype.correctCharacteristicsWithDbTypes = function (characteristics) {
        var corrected = [];
        console.log('🔧 Обрабатываем характеристики с типами из БД:', characteristics.length);
        for (var _i = 0, characteristics_2 = characteristics; _i < characteristics_2.length; _i++) {
            var char = characteristics_2[_i];
            // Проверяем исключенные характеристики
            if (EXCLUDED_CHARACTERISTICS_IDS.has(char.id)) {
                console.log("\uD83D\uDEAB \u041F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u0435\u043C \u0438\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u043D\u0443\u044E \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0443 ID " + char.id);
                continue;
            }
            // Определяем тип характеристики
            var characteristicType = this.getCharacteristicType(char.id);
            if (characteristicType === 'number') {
                // ЧИСЛОВЫЕ характеристики - отправляем как ЧИСТОЕ ЧИСЛО
                var numericValue = this.extractNumericValue(char.value);
                if (numericValue !== null) {
                    corrected.push({
                        id: char.id,
                        value: numericValue
                    });
                    console.log("\u2705 \u0427\u0418\u0421\u041B\u041E\u0412\u0410\u042F \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0430 ID " + char.id + ": \"" + char.value + "\" \u2192 " + numericValue + " (" + typeof numericValue + ")");
                }
                else {
                    console.warn("\u26A0\uFE0F \u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0438\u0437\u0432\u043B\u0435\u0447\u044C \u0447\u0438\u0441\u043B\u043E \u0438\u0437 \"" + char.value + "\" \u0434\u043B\u044F \u0447\u0438\u0441\u043B\u043E\u0432\u043E\u0439 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438 " + char.id);
                    corrected.push({
                        id: char.id,
                        value: 1
                    });
                    console.log("\uD83D\uDD27 \u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E \u0434\u0435\u0444\u043E\u043B\u0442\u043D\u043E\u0435 \u0447\u0438\u0441\u043B\u043E\u0432\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 1 \u0434\u043B\u044F \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438 " + char.id);
                }
            }
            else {
                // СТРОКОВЫЕ характеристики - отправляем как массив строк
                var value = Array.isArray(char.value) ? char.value[0] : char.value;
                if (value && String(value).trim() !== '') {
                    corrected.push({
                        id: char.id,
                        value: [String(value).trim()]
                    });
                    console.log("\u2705 \u0421\u0422\u0420\u041E\u041A\u041E\u0412\u0410\u042F \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0430 ID " + char.id + ": [" + String(value).trim() + "]");
                }
            }
        }
        // Добавляем обязательные характеристики
        this.addRequiredCharacteristics(corrected);
        console.log("\u2705 \u0418\u0442\u043E\u0433\u043E \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u043E \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A: " + corrected.length);
        return corrected;
    };
    /**
     * Добавление обязательных характеристик
     */
    WbApiService.prototype.addRequiredCharacteristics = function (characteristics) {
        var existingIds = characteristics.map(function (c) { return c.id; });
        if (!existingIds.includes(85)) {
            characteristics.push({
                id: 85,
                value: [wbApiConfig_1.DEFAULT_VALUES.BRAND || "Нет бренда"]
            });
            console.log('➕ Добавлена обязательная характеристика ID 85: [Нет бренда]');
        }
        if (!existingIds.includes(91)) {
            characteristics.push({
                id: 91,
                value: [wbApiConfig_1.DEFAULT_VALUES.COUNTRY || "Россия"]
            });
            console.log('➕ Добавлена обязательная характеристика ID 91: [Россия]');
        }
    };
    /**
     * Извлечение числового значения
     */
    WbApiService.prototype.extractNumericValue = function (value) {
        if (value === null || value === undefined) {
            return null;
        }
        if (typeof value === 'number') {
            return value;
        }
        var stringValue = String(value).replace(/\s+/g, '').trim();
        if (stringValue === '') {
            return null;
        }
        // Простое число
        var match = stringValue.match(/^(\d+(?:[.,]\d+)?)$/);
        if (match) {
            return parseFloat(match[1].replace(',', '.'));
        }
        // Число с единицами измерения
        match = stringValue.match(/^(\d+(?:[.,]\d+)?)/);
        if (match) {
            return parseFloat(match[1].replace(',', '.'));
        }
        console.warn("\u26A0\uFE0F \u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0438\u0437\u0432\u043B\u0435\u0447\u044C \u0447\u0438\u0441\u043B\u043E \u0438\u0437: \"" + stringValue + "\"");
        return null;
    };
    /**
     * НОВАЯ ФУНКЦИЯ: Корректировка размеров с поддержкой двух цен
     */
    WbApiService.prototype.correctSizesWithDualPricing = function (originalSizes) {
        if (!originalSizes || originalSizes.length === 0) {
            console.error('❌ Отсутствуют размеры товара');
            throw new Error('Размеры товара обязательны для создания карточки');
        }
        var firstSize = originalSizes[0];
        var isSizeless = !firstSize.techSize && !firstSize.wbSize;
        console.log("\uD83D\uDCCF \u041A\u043E\u0440\u0440\u0435\u043A\u0442\u0438\u0440\u043E\u0432\u043A\u0430 \u0440\u0430\u0437\u043C\u0435\u0440\u043E\u0432 (" + originalSizes.length + " \u0448\u0442.) \u0441 \u0446\u0435\u043D\u043E\u0432\u043E\u0439 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u0435\u0439:");
        if (isSizeless) {
            console.log('📦 Безразмерный товар - создаем размер без techSize/wbSize');
            var correctedSize = {
                price: Math.max(1, Math.round(Number(firstSize.price) || 1000)),
                skus: firstSize.skus || []
            };
            // Валидация цены
            if (!wbApiConfig_1.WBApiUtils.validatePrice(correctedSize.price)) {
                throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u0446\u0435\u043D\u0430: " + correctedSize.price + ". \u0414\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D: 1-999999 \u0440\u0443\u0431\u043B\u0435\u0439");
            }
            // Добавляем цену со скидкой если есть
            if (firstSize.discountedPrice && firstSize.discountedPrice < firstSize.price) {
                correctedSize.discountedPrice = Math.max(1, Math.round(Number(firstSize.discountedPrice)));
                if (!wbApiConfig_1.WBApiUtils.validatePrice(correctedSize.discountedPrice)) {
                    throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u0446\u0435\u043D\u0430 \u0441\u043E \u0441\u043A\u0438\u0434\u043A\u043E\u0439: " + correctedSize.discountedPrice);
                }
                var discountPercent = Math.round(((correctedSize.price - correctedSize.discountedPrice) / correctedSize.price) * 100);
                console.log("   \uD83D\uDCB0 \u0411\u0435\u0437\u0440\u0430\u0437\u043C\u0435\u0440\u043D\u044B\u0439: " + correctedSize.price + "\u20BD \u2192 " + correctedSize.discountedPrice + "\u20BD (-" + discountPercent + "%)");
            }
            else {
                console.log("   \uD83D\uDCB0 \u0411\u0435\u0437\u0440\u0430\u0437\u043C\u0435\u0440\u043D\u044B\u0439: " + correctedSize.price + "\u20BD");
            }
            return [correctedSize];
        }
        else {
            console.log("\uD83D\uDC55 \u0422\u043E\u0432\u0430\u0440 \u0441 \u0440\u0430\u0437\u043C\u0435\u0440\u0430\u043C\u0438 - \u043E\u0431\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u0435\u043C " + originalSizes.length + " \u0440\u0430\u0437\u043C\u0435\u0440\u043E\u0432");
            return originalSizes.map(function (size, index) {
                var correctedSize = {
                    techSize: size.techSize || wbApiConfig_1.EXTENDED_DEFAULT_VALUES.TECH_SIZE,
                    wbSize: size.wbSize || wbApiConfig_1.EXTENDED_DEFAULT_VALUES.WB_SIZE,
                    price: Math.max(1, Math.round(Number(size.price) || 1000)),
                    skus: size.skus || []
                };
                // Валидация цены
                if (!wbApiConfig_1.WBApiUtils.validatePrice(correctedSize.price)) {
                    throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u0446\u0435\u043D\u0430 \u0432 \u0440\u0430\u0437\u043C\u0435\u0440\u0435 " + (index + 1) + ": " + correctedSize.price);
                }
                // Добавляем цену со скидкой если есть
                if (size.discountedPrice && size.discountedPrice < size.price) {
                    correctedSize.discountedPrice = Math.max(1, Math.round(Number(size.discountedPrice)));
                    if (!wbApiConfig_1.WBApiUtils.validatePrice(correctedSize.discountedPrice)) {
                        throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u0446\u0435\u043D\u0430 \u0441\u043E \u0441\u043A\u0438\u0434\u043A\u043E\u0439 \u0432 \u0440\u0430\u0437\u043C\u0435\u0440\u0435 " + (index + 1) + ": " + correctedSize.discountedPrice);
                    }
                    var discountPercent = Math.round(((correctedSize.price - correctedSize.discountedPrice) / correctedSize.price) * 100);
                    console.log("   \uD83D\uDCCF \u0420\u0430\u0437\u043C\u0435\u0440 \"" + correctedSize.techSize + "\": " + correctedSize.price + "\u20BD \u2192 " + correctedSize.discountedPrice + "\u20BD (-" + discountPercent + "%)");
                }
                else {
                    console.log("   \uD83D\uDCCF \u0420\u0430\u0437\u043C\u0435\u0440 \"" + correctedSize.techSize + "\": " + correctedSize.price + "\u20BD");
                }
                return correctedSize;
            });
        }
    };
    /**
     * НОВАЯ ФУНКЦИЯ: Валидация карточки с проверкой цен
     */
    WbApiService.prototype.validateCardData = function (cardData) {
        var errors = [];
        if (!cardData.subjectID) {
            errors.push('Отсутствует ID категории (subjectID)');
        }
        if (!cardData.variants || cardData.variants.length === 0) {
            errors.push('Отсутствуют варианты товара');
            return { isValid: false, errors: errors };
        }
        var variant = cardData.variants[0];
        if (!variant.vendorCode) {
            errors.push('Отсутствует артикул товара');
        }
        else if (!wbApiConfig_1.WBApiUtils.validateVendorCode(variant.vendorCode)) {
            errors.push('Некорректный формат артикула');
        }
        if (!variant.title || variant.title.length < 10) {
            errors.push('Название товара слишком короткое (минимум 10 символов)');
        }
        if (variant.title && variant.title.length > 120) {
            errors.push('Название товара слишком длинное (максимум 120 символов)');
        }
        if (!variant.sizes || variant.sizes.length === 0) {
            errors.push('Отсутствуют размеры товара');
        }
        else {
            // ОБНОВЛЕННАЯ ВАЛИДАЦИЯ размеров с проверкой цен
            for (var _i = 0, _a = variant.sizes.entries(); _i < _a.length; _i++) {
                var _b = _a[_i], index = _b[0], size = _b[1];
                if (!size.price || size.price < 1) {
                    errors.push("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u043E\u0441\u043D\u043E\u0432\u043D\u0430\u044F \u0446\u0435\u043D\u0430 \u0432 \u0440\u0430\u0437\u043C\u0435\u0440\u0435 " + (index + 1) + " (\u043C\u0438\u043D\u0438\u043C\u0443\u043C 1 \u0440\u0443\u0431\u043B\u044C)");
                }
                if (!wbApiConfig_1.WBApiUtils.validatePrice(size.price)) {
                    errors.push("\u0426\u0435\u043D\u0430 \u0432 \u0440\u0430\u0437\u043C\u0435\u0440\u0435 " + (index + 1) + " \u0432\u043D\u0435 \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E\u0433\u043E \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u0430: " + size.price);
                }
                // Проверка цены со скидкой
                if (size.discountedPrice) {
                    if (size.discountedPrice < 1) {
                        errors.push("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u0446\u0435\u043D\u0430 \u0441\u043E \u0441\u043A\u0438\u0434\u043A\u043E\u0439 \u0432 \u0440\u0430\u0437\u043C\u0435\u0440\u0435 " + (index + 1) + " (\u043C\u0438\u043D\u0438\u043C\u0443\u043C 1 \u0440\u0443\u0431\u043B\u044C)");
                    }
                    if (size.discountedPrice >= size.price) {
                        errors.push("\u0426\u0435\u043D\u0430 \u0441\u043E \u0441\u043A\u0438\u0434\u043A\u043E\u0439 \u0432 \u0440\u0430\u0437\u043C\u0435\u0440\u0435 " + (index + 1) + " \u0434\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u0442\u044C \u043C\u0435\u043D\u044C\u0448\u0435 \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u0446\u0435\u043D\u044B");
                    }
                    if (!wbApiConfig_1.WBApiUtils.validatePrice(size.discountedPrice)) {
                        errors.push("\u0426\u0435\u043D\u0430 \u0441\u043E \u0441\u043A\u0438\u0434\u043A\u043E\u0439 \u0432 \u0440\u0430\u0437\u043C\u0435\u0440\u0435 " + (index + 1) + " \u0432\u043D\u0435 \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E\u0433\u043E \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u0430: " + size.discountedPrice);
                    }
                }
                if (!size.skus || !Array.isArray(size.skus) || size.skus.length === 0) {
                    errors.push("\u041E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044E\u0442 \u0448\u0442\u0440\u0438\u0445\u043A\u043E\u0434\u044B \u0432 \u0440\u0430\u0437\u043C\u0435\u0440\u0435 " + (index + 1));
                }
            }
        }
        // Валидация характеристик
        if (!variant.characteristics || !Array.isArray(variant.characteristics)) {
            errors.push('Отсутствуют характеристики товара');
        }
        else if (variant.characteristics.length < 3) {
            errors.push('Слишком мало характеристик (рекомендуется минимум 3)');
        }
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    };
    /**
     * НОВАЯ ФУНКЦИЯ: Анализ ценовой структуры
     */
    WbApiService.prototype.analyzePricingStructure = function (sizes) {
        var sizesWithDiscount = sizes.filter(function (size) { return size.discountedPrice; });
        var sizesWithoutDiscount = sizes.filter(function (size) { return !size.discountedPrice; });
        var totalPrice = sizes.reduce(function (sum, size) { return sum + size.price; }, 0);
        var averagePrice = totalPrice / sizes.length;
        var averageDiscountedPrice = undefined;
        var averageDiscountPercent = undefined;
        var maxDiscount = undefined;
        var minDiscount = undefined;
        if (sizesWithDiscount.length > 0) {
            var totalDiscountedPrice = sizesWithDiscount.reduce(function (sum, size) { return sum + (size.discountedPrice || 0); }, 0);
            averageDiscountedPrice = totalDiscountedPrice / sizesWithDiscount.length;
            var discountPercents = sizesWithDiscount.map(function (size) {
                return ((size.price - (size.discountedPrice || 0)) / size.price) * 100;
            });
            averageDiscountPercent = discountPercents.reduce(function (sum, percent) { return sum + percent; }, 0) / discountPercents.length;
            maxDiscount = Math.max.apply(Math, discountPercents);
            minDiscount = Math.min.apply(Math, discountPercents);
        }
        return {
            totalSizes: sizes.length,
            sizesWithDiscount: sizesWithDiscount.length,
            sizesWithoutDiscount: sizesWithoutDiscount.length,
            averagePrice: averagePrice,
            averageDiscountedPrice: averageDiscountedPrice,
            averageDiscountPercent: averageDiscountPercent,
            maxDiscount: maxDiscount,
            minDiscount: minDiscount
        };
    };
    /**
     * НОВАЯ ФУНКЦИЯ: Логирование статистики цен
     */
    WbApiService.prototype.logPricingStats = function (stats) {
        var _a, _b;
        console.log("\uD83D\uDCB0 \u0426\u0435\u043D\u043E\u0432\u0430\u044F \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438:");
        console.log("   - \u0412\u0441\u0435\u0433\u043E \u0440\u0430\u0437\u043C\u0435\u0440\u043E\u0432: " + stats.totalSizes);
        console.log("   - \u0421 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u043E\u0439 \u0441\u043A\u0438\u0434\u043A\u0438: " + stats.sizesWithDiscount);
        console.log("   - \u0411\u0435\u0437 \u0441\u043A\u0438\u0434\u043A\u0438: " + stats.sizesWithoutDiscount);
        console.log("   - \u0421\u0440\u0435\u0434\u043D\u044F\u044F \u0446\u0435\u043D\u0430: " + stats.averagePrice.toFixed(2) + "\u20BD");
        if (stats.averageDiscountedPrice && stats.averageDiscountPercent) {
            console.log("   - \u0421\u0440\u0435\u0434\u043D\u044F\u044F \u0446\u0435\u043D\u0430 \u0441\u043E \u0441\u043A\u0438\u0434\u043A\u043E\u0439: " + stats.averageDiscountedPrice.toFixed(2) + "\u20BD");
            console.log("   - \u0421\u0440\u0435\u0434\u043D\u0438\u0439 \u0440\u0430\u0437\u043C\u0435\u0440 \u0441\u043A\u0438\u0434\u043A\u0438: " + stats.averageDiscountPercent.toFixed(1) + "%");
            console.log("   - \u041C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u0430\u044F \u0441\u043A\u0438\u0434\u043A\u0430: " + ((_a = stats.maxDiscount) === null || _a === void 0 ? void 0 : _a.toFixed(1)) + "%");
            console.log("   - \u041C\u0438\u043D\u0438\u043C\u0430\u043B\u044C\u043D\u0430\u044F \u0441\u043A\u0438\u0434\u043A\u0430: " + ((_b = stats.minDiscount) === null || _b === void 0 ? void 0 : _b.toFixed(1)) + "%");
        }
    };
    /**
     * НОВАЯ ФУНКЦИЯ: Валидация ценовой информации
     */
    WbApiService.prototype.validatePriceInfo = function (priceInfo) {
        var errors = [];
        var warnings = [];
        if (!priceInfo.original || priceInfo.original < 1) {
            errors.push('Оригинальная цена должна быть больше 0');
        }
        if (!wbApiConfig_1.WBApiUtils.validatePrice(priceInfo.original)) {
            errors.push("\u041E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u044C\u043D\u0430\u044F \u0446\u0435\u043D\u0430 \u0432\u043D\u0435 \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E\u0433\u043E \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u0430: " + priceInfo.original);
        }
        if (priceInfo.discount) {
            if (priceInfo.discount < 1) {
                errors.push('Цена со скидкой должна быть больше 0');
            }
            if (priceInfo.discount >= priceInfo.original) {
                errors.push('Цена со скидкой должна быть меньше оригинальной цены');
            }
            if (!wbApiConfig_1.WBApiUtils.validatePrice(priceInfo.discount)) {
                errors.push("\u0426\u0435\u043D\u0430 \u0441\u043E \u0441\u043A\u0438\u0434\u043A\u043E\u0439 \u0432\u043D\u0435 \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E\u0433\u043E \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u0430: " + priceInfo.discount);
            }
            var discountPercent = ((priceInfo.original - priceInfo.discount) / priceInfo.original) * 100;
            if (discountPercent > 90) {
                warnings.push('Слишком большая скидка (более 90%) может вызвать подозрения у покупателей');
            }
            if (discountPercent < 5) {
                warnings.push('Слишком маленькая скидка (менее 5%) может быть незаметна для покупателей');
            }
        }
        if (!priceInfo.final || priceInfo.final < 1) {
            errors.push('Финальная цена должна быть больше 0');
        }
        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    };
    /**
     * Получение характеристик категории с кешированием
     */
    WbApiService.prototype.getCategoryCharacteristics = function (subjectId, apiToken, locale) {
        if (locale === void 0) { locale = 'ru'; }
        return __awaiter(this, void 0, Promise, function () {
            var response, characteristics, formattedCharacteristics, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        // Проверяем кеш
                        if (this.characteristicsCache.has(subjectId)) {
                            console.log("\uD83D\uDCBE \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u043C \u043A\u0435\u0448\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438 \u0434\u043B\u044F \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438 " + subjectId);
                            return [2 /*return*/, this.characteristicsCache.get(subjectId)];
                        }
                        console.log("\uD83D\uDCCB \u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043C \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438 \u0434\u043B\u044F \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438 " + subjectId + "...");
                        return [4 /*yield*/, this.makeRequest(wbApiConfig_1.WB_API_CONFIG.ENDPOINTS.GET_CATEGORY_CHARACTERISTICS + "/" + subjectId + "?locale=" + locale, apiToken)];
                    case 1:
                        response = _a.sent();
                        characteristics = response.data || [];
                        console.log("\u2705 \u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E " + characteristics.length + " \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A");
                        formattedCharacteristics = characteristics.map(function (char) { return ({
                            id: char.id,
                            name: char.name,
                            required: char.required || false,
                            type: char.type || 'string',
                            maxLength: char.maxLength || null,
                            values: char.values || [],
                            dictionary: char.dictionary || null
                        }); });
                        // Кешируем результат
                        this.characteristicsCache.set(subjectId, formattedCharacteristics);
                        return [2 /*return*/, formattedCharacteristics];
                    case 2:
                        error_3 = _a.sent();
                        console.error("\u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u044F \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A \u0434\u043B\u044F \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438 " + subjectId + ":", error_3);
                        throw new Error("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438: " + (error_3 instanceof Error ? error_3.message : 'Неизвестная ошибка'));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Получение списка категорий с кешированием
     */
    WbApiService.prototype.getCategories = function (apiToken) {
        return __awaiter(this, void 0, Promise, function () {
            var response, categories, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        if (this.categoriesCache.has(0)) {
                            console.log("\uD83D\uDCBE \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u043C \u043A\u0435\u0448\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438");
                            return [2 /*return*/, this.categoriesCache.get(0)];
                        }
                        console.log("\uD83D\uDCC2 \u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043C \u0441\u043F\u0438\u0441\u043E\u043A \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0439...");
                        return [4 /*yield*/, this.makeRequest(wbApiConfig_1.WB_API_CONFIG.ENDPOINTS.GET_PARENT_CATEGORIES, apiToken)];
                    case 1:
                        response = _a.sent();
                        categories = response.data || [];
                        console.log("\u2705 \u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E " + categories.length + " \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0439");
                        // Кешируем результат
                        this.categoriesCache.set(0, categories);
                        return [2 /*return*/, categories];
                    case 2:
                        error_4 = _a.sent();
                        console.error("\u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u044F \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0439:", error_4);
                        throw new Error("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438: " + (error_4 instanceof Error ? error_4.message : 'Неизвестная ошибка'));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Проверка статуса задачи
     */
    WbApiService.prototype.checkTaskStatus = function (taskId, apiToken) {
        return __awaiter(this, void 0, Promise, function () {
            var response, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        console.log("\uD83D\uDCCB \u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u0441\u0442\u0430\u0442\u0443\u0441 \u0437\u0430\u0434\u0430\u0447\u0438: " + taskId);
                        return [4 /*yield*/, this.makeRequest(wbApiConfig_1.WB_API_CONFIG.ENDPOINTS.GET_ERRORS + "?taskId=" + taskId, apiToken)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                data: response.data || response
                            }];
                    case 2:
                        error_5 = _a.sent();
                        console.error('❌ Ошибка проверки статуса:', error_5);
                        return [2 /*return*/, {
                                success: false,
                                error: error_5 instanceof Error ? error_5.message : 'Неизвестная ошибка'
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Проверка здоровья API
     */
    WbApiService.prototype.checkApiHealth = function (apiToken) {
        return __awaiter(this, void 0, Promise, function () {
            var startTime, responseTime, error_6, responseTime;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startTime = Date.now();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.getCategoryCharacteristics(5581, apiToken)];
                    case 2:
                        _a.sent();
                        responseTime = Date.now() - startTime;
                        return [2 /*return*/, {
                                healthy: true,
                                message: "WB API \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u043D\u043E\u0440\u043C\u0430\u043B\u044C\u043D\u043E (" + responseTime + "\u043C\u0441)",
                                details: {
                                    responseTime: responseTime,
                                    endpoint: 'category-characteristics',
                                    timestamp: new Date().toISOString()
                                }
                            }];
                    case 3:
                        error_6 = _a.sent();
                        responseTime = Date.now() - startTime;
                        return [2 /*return*/, {
                                healthy: false,
                                message: "WB API \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D: " + (error_6 instanceof Error ? error_6.message : 'Неизвестная ошибка'),
                                details: {
                                    responseTime: responseTime,
                                    error: error_6 instanceof Error ? error_6.message : 'Неизвестная ошибка',
                                    timestamp: new Date().toISOString()
                                }
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * НОВАЯ ФУНКЦИЯ: Получение списка товаров продавца
     */
    WbApiService.prototype.getSellerProducts = function (apiToken, filters) {
        return __awaiter(this, void 0, Promise, function () {
            var params, response, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        params = new URLSearchParams();
                        if (filters === null || filters === void 0 ? void 0 : filters.limit)
                            params.append('limit', filters.limit.toString());
                        if (filters === null || filters === void 0 ? void 0 : filters.offset)
                            params.append('offset', filters.offset.toString());
                        if (filters === null || filters === void 0 ? void 0 : filters.search)
                            params.append('search', filters.search);
                        if (filters === null || filters === void 0 ? void 0 : filters.orderBy)
                            params.append('orderBy', filters.orderBy);
                        if (filters === null || filters === void 0 ? void 0 : filters.orderDirection)
                            params.append('orderDirection', filters.orderDirection);
                        console.log("\uD83D\uDCCB \u041F\u043E\u043B\u0443\u0447\u0430\u0435\u043C \u0441\u043F\u0438\u0441\u043E\u043A \u0442\u043E\u0432\u0430\u0440\u043E\u0432 \u043F\u0440\u043E\u0434\u0430\u0432\u0446\u0430...");
                        return [4 /*yield*/, this.makeRequest(wbApiConfig_1.WB_API_CONFIG.ENDPOINTS.GET_CARDS_LIST + "?" + params.toString(), apiToken)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                data: response.data || response
                            }];
                    case 2:
                        error_7 = _a.sent();
                        console.error('❌ Ошибка получения списка товаров:', error_7);
                        return [2 /*return*/, {
                                success: false,
                                error: error_7 instanceof Error ? error_7.message : 'Неизвестная ошибка'
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * НОВАЯ ФУНКЦИЯ: Обновление цен товара
     */
    WbApiService.prototype.updateProductPrices = function (vendorCode, priceData, apiToken) {
        return __awaiter(this, void 0, Promise, function () {
            var priceValidation, updateData, response, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        console.log("\uD83D\uDCB0 \u041E\u0431\u043D\u043E\u0432\u043B\u044F\u0435\u043C \u0446\u0435\u043D\u044B \u0434\u043B\u044F \u0442\u043E\u0432\u0430\u0440\u0430 " + vendorCode + ":", priceData);
                        priceValidation = this.validatePriceInfo({
                            original: priceData.price,
                            discount: priceData.discountedPrice,
                            final: priceData.discountedPrice || priceData.price,
                            hasDiscount: !!priceData.discountedPrice
                        });
                        if (!priceValidation.isValid) {
                            throw new Error("\u041E\u0448\u0438\u0431\u043A\u0438 \u0432\u0430\u043B\u0438\u0434\u0430\u0446\u0438\u0438 \u0446\u0435\u043D: " + priceValidation.errors.join(', '));
                        }
                        updateData = {
                            vendorCode: vendorCode,
                            price: priceData.price
                        };
                        // Добавляем цену со скидкой если указана и валидна
                        if (priceData.discountedPrice && priceData.discountedPrice < priceData.price) {
                            updateData.discountedPrice = priceData.discountedPrice;
                            console.log("   \uD83D\uDCB8 \u0423\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0435\u043C \u0441\u043A\u0438\u0434\u043A\u0443: " + priceData.price + "\u20BD \u2192 " + priceData.discountedPrice + "\u20BD");
                        }
                        return [4 /*yield*/, this.makeRequest('/content/v1/cards/update/prices', // Используем прямой endpoint
                            apiToken, {
                                method: 'POST',
                                body: JSON.stringify([updateData])
                            })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                data: response
                            }];
                    case 2:
                        error_8 = _a.sent();
                        console.error('❌ Ошибка обновления цен:', error_8);
                        return [2 /*return*/, {
                                success: false,
                                error: error_8 instanceof Error ? error_8.message : 'Неизвестная ошибка'
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * НОВАЯ ФУНКЦИЯ: Получение информации о товаре по артикулу
     */
    WbApiService.prototype.getProductByVendorCode = function (vendorCode, apiToken) {
        return __awaiter(this, void 0, Promise, function () {
            var response, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        console.log("\uD83D\uDD0D \u041F\u043E\u0438\u0441\u043A \u0442\u043E\u0432\u0430\u0440\u0430 \u043F\u043E \u0430\u0440\u0442\u0438\u043A\u0443\u043B\u0443: " + vendorCode);
                        return [4 /*yield*/, this.makeRequest(wbApiConfig_1.WB_API_CONFIG.ENDPOINTS.GET_CARDS_LIST + "?vendorCode=" + vendorCode, apiToken)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                data: response.data || response
                            }];
                    case 2:
                        error_9 = _a.sent();
                        console.error("\u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u0438\u0441\u043A\u0430 \u0442\u043E\u0432\u0430\u0440\u0430 \u043F\u043E \u0430\u0440\u0442\u0438\u043A\u0443\u043B\u0443 " + vendorCode + ":", error_9);
                        return [2 /*return*/, {
                                success: false,
                                error: error_9 instanceof Error ? error_9.message : 'Неизвестная ошибка'
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * НОВАЯ ФУНКЦИЯ: Анализ ценовой конкуренции
     */
    WbApiService.prototype.analyzePriceCompetitiveness = function (priceInfo, categoryAveragePrice) {
        var finalPrice = priceInfo.discount || priceInfo.final;
        var competitiveness = 'medium';
        var recommendation = '';
        var pricePosition = '';
        var marketPosition = '';
        var discountAttractiveness = undefined;
        // Анализ позиции цены
        if (categoryAveragePrice) {
            var priceRatio = finalPrice / categoryAveragePrice;
            if (priceRatio < 0.8) {
                pricePosition = 'Цена ниже среднерыночной на ' + Math.round((1 - priceRatio) * 100) + '%';
                marketPosition = 'budget';
                competitiveness = 'high';
            }
            else if (priceRatio > 1.2) {
                pricePosition = 'Цена выше среднерыночной на ' + Math.round((priceRatio - 1) * 100) + '%';
                marketPosition = 'premium';
                competitiveness = 'low';
            }
            else {
                pricePosition = 'Цена в пределах среднерыночной';
                marketPosition = 'standard';
                competitiveness = 'medium';
            }
        }
        // Анализ привлекательности скидки
        if (priceInfo.hasDiscount && priceInfo.discountPercent) {
            if (priceInfo.discountPercent >= 30) {
                discountAttractiveness = 'Очень привлекательная скидка';
                competitiveness = 'high';
            }
            else if (priceInfo.discountPercent >= 15) {
                discountAttractiveness = 'Хорошая скидка';
                if (competitiveness === 'medium')
                    competitiveness = 'high';
            }
            else if (priceInfo.discountPercent >= 5) {
                discountAttractiveness = 'Небольшая скидка';
            }
            else {
                discountAttractiveness = 'Скидка малозаметна';
            }
        }
        // Формирование рекомендации
        if (competitiveness === 'high') {
            recommendation = 'Отличная ценовая позиция. Товар должен хорошо конкурировать на рынке.';
        }
        else if (competitiveness === 'low') {
            recommendation = 'Цена может быть слишком высокой. Рассмотрите снижение цены или увеличение скидки.';
        }
        else {
            recommendation = 'Цена находится в средней позиции. Можно попробовать небольшую скидку для повышения конкурентоспособности.';
        }
        return {
            competitiveness: competitiveness,
            recommendation: recommendation,
            metrics: {
                pricePosition: pricePosition,
                discountAttractiveness: discountAttractiveness,
                marketPosition: marketPosition
            }
        };
    };
    /**
     * НОВАЯ ФУНКЦИЯ: Пакетное обновление цен
     */
    WbApiService.prototype.batchUpdatePrices = function (updates, apiToken) {
        return __awaiter(this, void 0, Promise, function () {
            var _i, _a, _b, index, update, validation, updateData, withDiscount, response, error_10;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        console.log("\uD83D\uDCB0 \u041F\u0430\u043A\u0435\u0442\u043D\u043E\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u0446\u0435\u043D \u0434\u043B\u044F " + updates.length + " \u0442\u043E\u0432\u0430\u0440\u043E\u0432...");
                        // Валидация всех цен
                        for (_i = 0, _a = updates.entries(); _i < _a.length; _i++) {
                            _b = _a[_i], index = _b[0], update = _b[1];
                            validation = this.validatePriceInfo({
                                original: update.price,
                                discount: update.discountedPrice,
                                final: update.discountedPrice || update.price,
                                hasDiscount: !!update.discountedPrice
                            });
                            if (!validation.isValid) {
                                throw new Error("\u041E\u0448\u0438\u0431\u043A\u0438 \u0432\u0430\u043B\u0438\u0434\u0430\u0446\u0438\u0438 \u0434\u043B\u044F \u0442\u043E\u0432\u0430\u0440\u0430 " + (index + 1) + " (" + update.vendorCode + "): " + validation.errors.join(', '));
                            }
                        }
                        updateData = updates.map(function (update) {
                            var data = {
                                vendorCode: update.vendorCode,
                                price: update.price
                            };
                            if (update.discountedPrice && update.discountedPrice < update.price) {
                                data.discountedPrice = update.discountedPrice;
                            }
                            return data;
                        });
                        console.log("\uD83D\uDCCA \u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F:");
                        withDiscount = updates.filter(function (u) { return u.discountedPrice && u.discountedPrice < u.price; }).length;
                        console.log("   - \u0422\u043E\u0432\u0430\u0440\u043E\u0432 \u0441 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435\u043C \u0441\u043A\u0438\u0434\u043A\u0438: " + withDiscount);
                        console.log("   - \u0422\u043E\u0432\u0430\u0440\u043E\u0432 \u0442\u043E\u043B\u044C\u043A\u043E \u0441 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435\u043C \u0446\u0435\u043D\u044B: " + (updates.length - withDiscount));
                        return [4 /*yield*/, this.makeRequest('/content/v1/cards/update/prices', apiToken, {
                                method: 'POST',
                                body: JSON.stringify(updateData)
                            })];
                    case 1:
                        response = _c.sent();
                        return [2 /*return*/, {
                                success: true,
                                data: response
                            }];
                    case 2:
                        error_10 = _c.sent();
                        console.error('❌ Ошибка пакетного обновления цен:', error_10);
                        return [2 /*return*/, {
                                success: false,
                                error: error_10 instanceof Error ? error_10.message : 'Неизвестная ошибка'
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * НОВАЯ ФУНКЦИЯ: Загрузка медиа (изображения 900x1200)
     */
    WbApiService.prototype.uploadMedia = function (imageBuffer, fileName, apiToken, options) {
        var _a, _b;
        return __awaiter(this, void 0, Promise, function () {
            var formData, blob, response, errorText, result, error_11;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 5, , 6]);
                        console.log("\uD83D\uDCE4 \u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043C \u043C\u0435\u0434\u0438\u0430 \u0444\u0430\u0439\u043B: " + fileName);
                        formData = new FormData();
                        blob = new Blob([imageBuffer], { type: 'image/jpeg' });
                        formData.append('uploadfile', blob, fileName);
                        return [4 /*yield*/, fetch(this.BASE_URL + "/content/v2/media/save", {
                                method: 'POST',
                                headers: {
                                    'Authorization': apiToken
                                },
                                body: formData
                            })];
                    case 1:
                        response = _c.sent();
                        if (!!response.ok) return [3 /*break*/, 3];
                        return [4 /*yield*/, response.text()];
                    case 2:
                        errorText = _c.sent();
                        throw new Error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u043C\u0435\u0434\u0438\u0430 (" + response.status + "): " + errorText);
                    case 3: return [4 /*yield*/, response.json()];
                    case 4:
                        result = _c.sent();
                        console.log('✅ Медиа файл успешно загружен');
                        return [2 /*return*/, {
                                success: true,
                                mediaId: (_a = result.data) === null || _a === void 0 ? void 0 : _a.mediaId,
                                url: (_b = result.data) === null || _b === void 0 ? void 0 : _b.url
                            }];
                    case 5:
                        error_11 = _c.sent();
                        console.error('❌ Ошибка загрузки медиа:', error_11);
                        return [2 /*return*/, {
                                success: false,
                                error: error_11 instanceof Error ? error_11.message : 'Неизвестная ошибка'
                            }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Очистка всех кешей
     */
    WbApiService.prototype.clearAllCaches = function () {
        this.characteristicTypesCache.clear();
        this.categoriesCache.clear();
        this.characteristicsCache.clear();
        console.log('🗑️ Все кеши очищены');
    };
    /**
     * Получение размера всех кешей
     */
    WbApiService.prototype.getCacheSize = function () {
        return this.characteristicTypesCache.size +
            this.categoriesCache.size +
            this.characteristicsCache.size;
    };
    /**
     * НОВАЯ ФУНКЦИЯ: Получение статистики по API сервису
     */
    WbApiService.prototype.getServiceStatistics = function () {
        return {
            cacheSize: this.getCacheSize(),
            lastUpdate: new Date().toISOString(),
            systemFeatures: [
                'dual_pricing_support',
                'wb_image_resize_900x1200',
                'enhanced_characteristics',
                'batch_price_updates',
                'price_competitiveness_analysis',
                'cache_management',
                'detailed_error_handling',
                'request_validation'
            ],
            version: '2.0.0',
            endpoints: Object.values(wbApiConfig_1.WB_API_CONFIG.ENDPOINTS)
        };
    };
    return WbApiService;
}());
exports.WbApiService = WbApiService;
exports.wbApiService = new WbApiService();
