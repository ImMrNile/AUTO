"use strict";
// src/app/api/products/route.ts - API для создания продуктов с Enhanced System (ИСПРАВЛЕННАЯ ВЕРСИЯ)
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
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
exports.POST = void 0;
var server_1 = require("next/server");
var prisma_1 = require("../../../../lib/prisma");
var uploadService_1 = require("../../../../lib/services/uploadService");
var auth_service_1 = require("../../../../lib/auth/auth-service");
var json_1 = require("../../../../lib/utils/json");
// Импорты сервисов
var enhancedCharacteristicsService_1 = require("../../../../lib/services/enhancedCharacteristicsService");
// Создаем экземпляр сервиса
var enhancedCharacteristicsIntegrationService = new enhancedCharacteristicsService_1.EnhancedCharacteristicsIntegrationService();
/**
 * Функция проверки подключения к базе данных (встроенная)
 */
function checkDatabaseConnection() {
    return __awaiter(this, void 0, Promise, function () {
        var startTime, latency, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, prisma_1.prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["SELECT 1 as health_check"], ["SELECT 1 as health_check"])))];
                case 2:
                    _a.sent();
                    latency = Date.now() - startTime;
                    console.log('✅ [DB] Database health check passed, latency:', latency + 'ms');
                    return [2 /*return*/, { connected: true, latency: latency }];
                case 3:
                    error_1 = _a.sent();
                    console.error('❌ [DB] Database health check failed:', error_1);
                    return [2 /*return*/, {
                            connected: false,
                            error: error_1 instanceof Error ? error_1.message : 'Unknown error'
                        }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// POST - создание нового продукта
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, productId, connectionStatus, dbError_1, user, authError_1, formData_1, _i, _a, _b, key, value, productData, validationErrors, cabinets, dbError_2, categoryCharacteristics, charError_1, product, cabinetError_1, dbError_3, mainImageUrl, additionalImageUrls, imageError_1, i, additionalImage, additionalImageUrl, imageError_2, updateError_1, enhancedResult, characteristicsForAI, enhancedError_1, fallbackError_1, aiUpdateError_1, endTime, processingTime, error_2, endTime, processingTime, errorMessage, errorDetails, suggestion;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    startTime = Date.now();
                    productId = undefined;
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 53, , 54]);
                    // Диагностика подключения к базе данных
                    console.log('🔍 Проверка подключения к базе данных...');
                    // Проверяем переменные окружения
                    console.log('🔧 Переменные окружения:');
                    console.log('   - DATABASE_URL:', process.env.DATABASE_URL ? 'установлена' : 'НЕ установлена');
                    console.log('   - DIRECT_URL:', process.env.DIRECT_URL ? 'установлена' : 'НЕ установлена');
                    console.log('   - NODE_ENV:', process.env.NODE_ENV || 'не установлена');
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, checkDatabaseConnection()];
                case 3:
                    connectionStatus = _c.sent();
                    if (connectionStatus.connected) {
                        console.log('✅ Подключение к базе данных успешно');
                    }
                    else {
                        console.error('❌ Подключение к базе данных не удалось:', connectionStatus.error);
                    }
                    return [3 /*break*/, 5];
                case 4:
                    dbError_1 = _c.sent();
                    console.error('❌ Ошибка проверки подключения к базе данных:', dbError_1);
                    console.error('🔧 Код ошибки:', dbError_1.code);
                    console.error('💡 Сообщение:', dbError_1.message);
                    if (dbError_1.code === 'P1001') {
                        console.error('🚨 Проблема: Не удается подключиться к серверу базы данных');
                        console.error('💡 Рекомендации:');
                        console.error('   - Проверьте доступность сервера aws-1-eu-north-1.pooler.supabase.com');
                        console.error('   - Проверьте настройки файрвола');
                        console.error('   - Проверьте переменные окружения DATABASE_URL и DIRECT_URL');
                    }
                    if (dbError_1.code === 'P1017') {
                        console.error('🚨 Проблема: Сервер отклонил подключение');
                        console.error('💡 Рекомендации:');
                        console.error('   - Проверьте правильность учетных данных');
                        console.error('   - Проверьте лимиты подключений');
                    }
                    return [3 /*break*/, 5];
                case 5:
                    user = null;
                    _c.label = 6;
                case 6:
                    _c.trys.push([6, 8, , 9]);
                    return [4 /*yield*/, auth_service_1.AuthService.getCurrentUser()];
                case 7:
                    user = _c.sent();
                    return [3 /*break*/, 9];
                case 8:
                    authError_1 = _c.sent();
                    console.error('❌ Ошибка авторизации:', authError_1);
                    return [2 /*return*/, server_1.NextResponse.json({
                            error: 'Ошибка авторизации',
                            details: authError_1 instanceof Error ? authError_1.message : 'Неизвестная ошибка',
                            suggestion: 'Попробуйте перезагрузить страницу или войти заново'
                        }, { status: 401 })];
                case 9:
                    if (!user) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                error: 'Не авторизован',
                                suggestion: 'Войдите в систему для создания товара'
                            }, { status: 401 })];
                    }
                    console.log('🚀 Начало обработки запроса на создание продукта');
                    return [4 /*yield*/, request.formData()];
                case 10:
                    formData_1 = _c.sent();
                    // Диагностика: выводим все полученные поля
                    console.log('🔍 Диагностика formData:');
                    for (_i = 0, _a = formData_1.entries(); _i < _a.length; _i++) {
                        _b = _a[_i], key = _b[0], value = _b[1];
                        console.log("  " + key + ": " + value + " (\u0442\u0438\u043F: " + typeof value + ")");
                    }
                    productData = {
                        name: formData_1.get('name') || '',
                        originalPrice: formData_1.get('originalPrice') || '',
                        discountPrice: formData_1.get('discountPrice') || '',
                        costPrice: formData_1.get('costPrice') || '',
                        packageContents: formData_1.get('packageContents') || '',
                        length: (function () {
                            var _a;
                            var dimensions = formData_1.get('dimensions');
                            if (dimensions && typeof dimensions === 'string') {
                                try {
                                    var parsed = JSON.parse(dimensions);
                                    return ((_a = parsed.length) === null || _a === void 0 ? void 0 : _a.toString()) || '';
                                }
                                catch (e) {
                                    return '';
                                }
                            }
                            return '';
                        })(),
                        width: (function () {
                            var _a;
                            var dimensions = formData_1.get('dimensions');
                            if (dimensions && typeof dimensions === 'string') {
                                try {
                                    var parsed = JSON.parse(dimensions);
                                    return ((_a = parsed.width) === null || _a === void 0 ? void 0 : _a.toString()) || '';
                                }
                                catch (e) {
                                    return '';
                                }
                            }
                            return '';
                        })(),
                        height: (function () {
                            var _a;
                            var dimensions = formData_1.get('dimensions');
                            if (dimensions && typeof dimensions === 'string') {
                                try {
                                    var parsed = JSON.parse(dimensions);
                                    return ((_a = parsed.height) === null || _a === void 0 ? void 0 : _a.toString()) || '';
                                }
                                catch (e) {
                                    return '';
                                }
                            }
                            return '';
                        })(),
                        weight: (function () {
                            var _a;
                            var dimensions = formData_1.get('dimensions');
                            if (dimensions && typeof dimensions === 'string') {
                                try {
                                    var parsed = JSON.parse(dimensions);
                                    return ((_a = parsed.weight) === null || _a === void 0 ? void 0 : _a.toString()) || '';
                                }
                                catch (e) {
                                    return '';
                                }
                            }
                            return '';
                        })(),
                        referenceUrl: formData_1.get('referenceUrl') || '',
                        cabinetId: formData_1.get('cabinetId') || '',
                        vendorCode: formData_1.get('vendorCode') || '',
                        autoGenerateVendorCode: formData_1.get('autoGenerateVendorCode') === 'true',
                        barcode: formData_1.get('barcode') || '',
                        hasVariantSizes: formData_1.get('hasVariantSizes') === 'true',
                        variantSizes: (function () {
                            try {
                                var variantSizesData = formData_1.get('variantSizes');
                                if (variantSizesData && typeof variantSizesData === 'string') {
                                    return JSON.parse(variantSizesData);
                                }
                                return [];
                            }
                            catch (error) {
                                console.warn('⚠️ Ошибка парсинга variantSizes, используем пустой массив:', error);
                                return [];
                            }
                        })(),
                        description: formData_1.get('description') || '',
                        mainImage: formData_1.get('image') || null,
                        imageComments: formData_1.get('imageComments') || '',
                        categoryId: formData_1.get('categoryId') || '',
                        categoryName: formData_1.get('categoryName') || '',
                        parentCategoryName: formData_1.get('parentCategoryName') || '',
                        additionalImagesCount: parseInt(formData_1.get('additionalImagesCount') || '0')
                    };
                    console.log('📥 Получены данные формы:', productData);
                    validationErrors = [];
                    if (!productData.name || productData.name.trim() === '') {
                        validationErrors.push('название товара');
                    }
                    if (!productData.originalPrice || productData.originalPrice.trim() === '') {
                        validationErrors.push('оригинальная цена');
                    }
                    if (!productData.discountPrice || productData.discountPrice.trim() === '') {
                        validationErrors.push('цена со скидкой');
                    }
                    if (!productData.packageContents || productData.packageContents.trim() === '') {
                        validationErrors.push('комплектация');
                    }
                    if (!productData.length || productData.length.trim() === '') {
                        validationErrors.push('длина');
                    }
                    if (!productData.width || productData.width.trim() === '') {
                        validationErrors.push('ширина');
                    }
                    if (!productData.height || productData.height.trim() === '') {
                        validationErrors.push('высота');
                    }
                    if (!productData.weight || productData.weight.trim() === '') {
                        validationErrors.push('вес');
                    }
                    if (!productData.vendorCode || productData.vendorCode.trim() === '') {
                        validationErrors.push('артикул');
                    }
                    if (!productData.barcode || productData.barcode.trim() === '') {
                        validationErrors.push('штрихкод');
                    }
                    if (!productData.categoryId || productData.categoryId.trim() === '') {
                        validationErrors.push('категория');
                    }
                    if (!productData.mainImage) {
                        validationErrors.push('главное изображение');
                    }
                    if (validationErrors.length > 0) {
                        console.error('❌ Ошибка валидации:', validationErrors);
                        return [2 /*return*/, server_1.NextResponse.json({
                                error: "\u041E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044E\u0442 \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u043F\u043E\u043B\u044F: " + validationErrors.join(', '),
                                receivedData: {
                                    name: productData.name,
                                    originalPrice: productData.originalPrice,
                                    discountPrice: productData.discountPrice,
                                    packageContents: productData.packageContents,
                                    dimensions: {
                                        length: productData.length,
                                        width: productData.width,
                                        height: productData.height,
                                        weight: productData.weight
                                    },
                                    vendorCode: productData.vendorCode,
                                    barcode: productData.barcode,
                                    categoryId: productData.categoryId,
                                    hasMainImage: !!productData.mainImage
                                }
                            }, { status: 400 })];
                    }
                    // Проверяем корректность данных без установки дефолтных значений
                    console.log('✅ Все обязательные поля заполнены пользователем');
                    console.log("\uD83D\uDCD0 \u0420\u0430\u0437\u043C\u0435\u0440\u044B: " + productData.length + "\u00D7" + productData.width + "\u00D7" + productData.height + " \u0441\u043C");
                    console.log("\u2696\uFE0F \u0412\u0435\u0441: " + productData.weight + " \u043A\u0433");
                    console.log("\uD83D\uDCE6 \u041A\u043E\u043C\u043F\u043B\u0435\u043A\u0442\u0430\u0446\u0438\u044F: " + productData.packageContents);
                    console.log("\uD83C\uDFF7\uFE0F \u0410\u0440\u0442\u0438\u043A\u0443\u043B: " + productData.vendorCode);
                    console.log("\uD83D\uDCCA \u0428\u0442\u0440\u0438\u0445\u043A\u043E\u0434: " + productData.barcode);
                    console.log("\uD83D\uDCC2 \u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F: " + productData.categoryName + " (ID: " + productData.categoryId + ")");
                    cabinets = [];
                    _c.label = 11;
                case 11:
                    _c.trys.push([11, 13, , 14]);
                    return [4 /*yield*/, prisma_1.prisma.cabinet.findMany({
                            where: { userId: user.id, isActive: true }
                        })];
                case 12:
                    cabinets = _c.sent();
                    console.log("\u2705 \u041F\u043E\u043B\u0443\u0447\u0435\u043D\u043E " + cabinets.length + " \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u043E\u0432 \u0434\u043B\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F");
                    return [3 /*break*/, 14];
                case 13:
                    dbError_2 = _c.sent();
                    console.error('❌ Ошибка получения кабинетов из БД:', dbError_2);
                    return [2 /*return*/, server_1.NextResponse.json({
                            error: 'Ошибка получения кабинетов из базы данных',
                            details: dbError_2 instanceof Error ? dbError_2.message : 'Неизвестная ошибка'
                        }, { status: 500 })];
                case 14:
                    if (cabinets.length === 0) {
                        console.error('❌ Нет доступных кабинетов для пользователя:', {
                            userId: user.id,
                            userEmail: user.email,
                            cabinetsCount: cabinets.length
                        });
                        return [2 /*return*/, server_1.NextResponse.json({
                                error: 'Нет доступных кабинетов для пользователя',
                                userId: user.id,
                                userEmail: user.email
                            }, { status: 400 })];
                    }
                    console.log('✅ Доступные кабинеты:', cabinets.map(function (c) { return ({ id: c.id, name: c.name }); }));
                    // Используем первый доступный кабинет если не выбран
                    if (!productData.cabinetId || productData.cabinetId.trim() === '') {
                        if (cabinets.length > 0) {
                            productData.cabinetId = cabinets[0].id;
                            console.log('⚠️ CabinetId не указан, используем первый доступный кабинет:', productData.cabinetId);
                        }
                        else {
                            console.error('❌ Нет доступных кабинетов для пользователя');
                            return [2 /*return*/, server_1.NextResponse.json({
                                    error: 'Нет доступных кабинетов для пользователя',
                                    userId: user.id,
                                    availableCabinets: cabinets.length
                                }, { status: 400 })];
                        }
                    }
                    // Проверяем корректность артикула и штрихкода
                    if (productData.vendorCode.length < 8 || productData.vendorCode.length > 13) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                error: 'Артикул должен содержать от 8 до 13 символов',
                                receivedVendorCode: productData.vendorCode,
                                vendorCodeLength: productData.vendorCode.length
                            }, { status: 400 })];
                    }
                    if (productData.barcode.length !== 13) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                error: 'Штрихкод должен содержать ровно 13 символов',
                                receivedBarcode: productData.barcode,
                                barcodeLength: productData.barcode.length
                            }, { status: 400 })];
                    }
                    console.log('✅ Артикул и штрихкод соответствуют требованиям');
                    categoryCharacteristics = [];
                    _c.label = 15;
                case 15:
                    _c.trys.push([15, 17, , 18]);
                    return [4 /*yield*/, prisma_1.prisma.wbCategoryCharacteristic.findMany({
                            where: { subcategoryId: parseInt(productData.categoryId) },
                            include: {
                                values: {
                                    where: { isActive: true },
                                    orderBy: { sortOrder: 'asc' }
                                }
                            },
                            orderBy: [
                                { isRequired: 'desc' },
                                { sortOrder: 'asc' },
                                { name: 'asc' }
                            ]
                        })];
                case 16:
                    categoryCharacteristics = _c.sent();
                    console.log("\u2705 \u041F\u043E\u043B\u0443\u0447\u0435\u043D\u043E " + categoryCharacteristics.length + " \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A \u0434\u043B\u044F \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438 " + productData.categoryName);
                    // Логируем характеристики для отладки
                    console.log('🔍 Характеристики категории для ИИ:');
                    categoryCharacteristics.forEach(function (char, index) {
                        console.log("  " + (index + 1) + ". " + char.name + " (ID: " + (char.wbCharacteristicId || char.id) + ", \u0442\u0438\u043F: " + char.type + ", " + (char.isRequired ? 'обязательная' : 'опциональная') + ")");
                        if (char.values && char.values.length > 0) {
                            console.log("     \u0412\u0430\u0440\u0438\u0430\u043D\u0442\u044B: " + char.values.slice(0, 3).map(function (v) { return v.value; }).join(', ') + (char.values.length > 3 ? '...' : ''));
                        }
                    });
                    return [3 /*break*/, 18];
                case 17:
                    charError_1 = _c.sent();
                    console.warn('⚠️ Ошибка получения характеристик категории:', charError_1);
                    categoryCharacteristics = [];
                    return [3 /*break*/, 18];
                case 18:
                    console.log('📊 Данные для Enhanced System с двумя ценами успешно обработаны:', {
                        productName: productData.name,
                        priceInfo: {
                            original: parseFloat(productData.originalPrice),
                            discount: parseFloat(productData.discountPrice),
                            final: parseFloat(productData.discountPrice)
                        },
                        hasDiscount: parseFloat(productData.originalPrice) > parseFloat(productData.discountPrice),
                        discountPercent: parseFloat(productData.originalPrice) > parseFloat(productData.discountPrice)
                            ? Math.round(((parseFloat(productData.originalPrice) - parseFloat(productData.discountPrice)) / parseFloat(productData.originalPrice)) * 100)
                            : 0,
                        categoryId: parseInt(productData.categoryId),
                        categoryName: productData.categoryName,
                        parentCategoryName: productData.parentCategoryName,
                        vendorCode: productData.vendorCode,
                        barcode: productData.barcode,
                        hasVariantSizes: productData.hasVariantSizes,
                        variantSizesCount: productData.variantSizes.length,
                        characteristicsCount: categoryCharacteristics.length,
                        autoPublish: false
                    });
                    _c.label = 19;
                case 19:
                    _c.trys.push([19, 25, , 26]);
                    return [4 /*yield*/, prisma_1.prisma.product.create({
                            data: {
                                name: productData.name,
                                price: parseFloat(productData.discountPrice),
                                status: 'DRAFT',
                                originalImage: null,
                                referenceUrl: productData.referenceUrl || null,
                                dimensions: {
                                    length: parseFloat(productData.length),
                                    width: parseFloat(productData.width),
                                    height: parseFloat(productData.height),
                                    weight: parseFloat(productData.weight) * 1000 // Конвертируем кг в граммы для БД
                                },
                                workflowId: "enhanced-dual-price-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9),
                                processingMethod: 'enhanced_system_dual_price',
                                wbData: {
                                    vendorCode: productData.vendorCode,
                                    barcode: productData.barcode,
                                    packageContents: productData.packageContents,
                                    hasVariantSizes: productData.hasVariantSizes,
                                    variantSizes: productData.variantSizes,
                                    description: productData.description || '',
                                    imageComments: productData.imageComments || '',
                                    originalPrice: parseFloat(productData.originalPrice),
                                    discountPrice: parseFloat(productData.discountPrice),
                                    costPrice: productData.costPrice ? parseFloat(productData.costPrice) : null,
                                    categoryId: parseInt(productData.categoryId),
                                    categoryName: productData.categoryName,
                                    parentCategoryName: productData.parentCategoryName
                                },
                                userId: user.id,
                                subcategoryId: parseInt(productData.categoryId)
                            }
                        })];
                case 20:
                    product = _c.sent();
                    productId = product.id;
                    console.log('✅ Продукт успешно создан в БД:', productId);
                    _c.label = 21;
                case 21:
                    _c.trys.push([21, 23, , 24]);
                    return [4 /*yield*/, prisma_1.prisma.productCabinet.create({
                            data: {
                                productId: product.id,
                                cabinetId: productData.cabinetId,
                                isSelected: true
                            }
                        })];
                case 22:
                    _c.sent();
                    console.log('✅ Связь с кабинетом создана');
                    return [3 /*break*/, 24];
                case 23:
                    cabinetError_1 = _c.sent();
                    console.warn('⚠️ Ошибка создания связи с кабинетом:', cabinetError_1);
                    return [3 /*break*/, 24];
                case 24: return [3 /*break*/, 26];
                case 25:
                    dbError_3 = _c.sent();
                    console.error('❌ Ошибка создания продукта в БД:', dbError_3);
                    return [2 /*return*/, server_1.NextResponse.json({
                            error: 'Ошибка создания продукта в базе данных',
                            details: dbError_3 instanceof Error ? dbError_3.message : 'Неизвестная ошибка'
                        }, { status: 500 })];
                case 26:
                    mainImageUrl = null;
                    additionalImageUrls = [];
                    if (!productData.mainImage) return [3 /*break*/, 30];
                    console.log('🖼️ Обработка главного изображения...');
                    _c.label = 27;
                case 27:
                    _c.trys.push([27, 29, , 30]);
                    return [4 /*yield*/, uploadService_1.uploadService.uploadFile(productData.mainImage)];
                case 28:
                    mainImageUrl = _c.sent();
                    console.log('✅ Главное изображение загружено:', mainImageUrl);
                    return [3 /*break*/, 30];
                case 29:
                    imageError_1 = _c.sent();
                    console.error('❌ Ошибка загрузки главного изображения:', imageError_1);
                    return [2 /*return*/, server_1.NextResponse.json({
                            error: 'Ошибка загрузки главного изображения',
                            details: imageError_1 instanceof Error ? imageError_1.message : 'Неизвестная ошибка'
                        }, { status: 500 })];
                case 30:
                    if (!(productData.additionalImagesCount > 0)) return [3 /*break*/, 36];
                    console.log("\uD83D\uDDBC\uFE0F \u041E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0430 " + productData.additionalImagesCount + " \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439...");
                    i = 0;
                    _c.label = 31;
                case 31:
                    if (!(i < productData.additionalImagesCount)) return [3 /*break*/, 36];
                    additionalImage = formData_1.get("additionalImage" + i);
                    if (!additionalImage) return [3 /*break*/, 35];
                    _c.label = 32;
                case 32:
                    _c.trys.push([32, 34, , 35]);
                    return [4 /*yield*/, uploadService_1.uploadService.uploadFile(additionalImage)];
                case 33:
                    additionalImageUrl = _c.sent();
                    additionalImageUrls.push(additionalImageUrl);
                    console.log("\u2705 \u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 " + (i + 1) + " \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E:", additionalImageUrl);
                    return [3 /*break*/, 35];
                case 34:
                    imageError_2 = _c.sent();
                    console.warn("\u26A0\uFE0F \u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0433\u043E \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F " + (i + 1) + ":", imageError_2);
                    return [3 /*break*/, 35];
                case 35:
                    i++;
                    return [3 /*break*/, 31];
                case 36:
                    if (!mainImageUrl) return [3 /*break*/, 40];
                    _c.label = 37;
                case 37:
                    _c.trys.push([37, 39, , 40]);
                    return [4 /*yield*/, prisma_1.prisma.product.update({
                            where: { id: productId },
                            data: { originalImage: mainImageUrl }
                        })];
                case 38:
                    _c.sent();
                    console.log('✅ URL главного изображения обновлен в БД');
                    return [3 /*break*/, 40];
                case 39:
                    updateError_1 = _c.sent();
                    console.warn('⚠️ Ошибка обновления URL изображения в БД:', updateError_1);
                    return [3 /*break*/, 40];
                case 40:
                    // Запускаем Enhanced System для анализа продукта
                    console.log('🚀 Запуск Enhanced System для анализа продукта...');
                    console.log('🔍 [API] Передаем в Enhanced System данные о категории:', {
                        categoryId: parseInt(productData.categoryId),
                        categoryName: productData.categoryName,
                        parentCategoryName: productData.parentCategoryName,
                        categoryIdType: typeof productData.categoryId,
                        categoryIdValue: productData.categoryId
                    });
                    enhancedResult = null;
                    _c.label = 41;
                case 41:
                    _c.trys.push([41, 43, , 48]);
                    characteristicsForAI = categoryCharacteristics.map(function (char) { return ({
                        id: char.wbCharacteristicId || char.id,
                        name: char.name,
                        type: char.type,
                        isRequired: char.isRequired,
                        description: char.description,
                        maxLength: char.maxLength,
                        minValue: char.minValue,
                        maxValue: char.maxValue,
                        values: (char.values || []).map(function (v) { return ({
                            id: v.wbValueId || v.id,
                            value: v.value,
                            displayName: v.displayName || v.value
                        }); })
                    }); });
                    return [4 /*yield*/, enhancedCharacteristicsIntegrationService.analyzeProductWithEnhancedSystem({
                            productName: productData.name,
                            productImages: __spreadArrays([mainImageUrl], additionalImageUrls).filter(function (url) { return url !== null; }),
                            categoryId: parseInt(productData.categoryId),
                            packageContents: productData.packageContents,
                            referenceUrl: productData.referenceUrl || '',
                            price: parseFloat(productData.discountPrice),
                            dimensions: {
                                length: parseFloat(productData.length),
                                width: parseFloat(productData.width),
                                height: parseFloat(productData.height),
                                weight: parseFloat(productData.weight)
                            },
                            hasVariantSizes: productData.hasVariantSizes,
                            variantSizes: productData.variantSizes,
                            aiPromptComment: productData.imageComments || '',
                            // ПЕРЕДАЕМ ХАРАКТЕРИСТИКИ КАТЕГОРИИ В ИИ
                            additionalCharacteristics: characteristicsForAI,
                            preserveUserData: {
                                preserveUserData: true,
                                userProvidedPackageContents: productData.packageContents,
                                userProvidedDimensions: {
                                    length: parseFloat(productData.length),
                                    width: parseFloat(productData.width),
                                    height: parseFloat(productData.height),
                                    weight: parseFloat(productData.weight)
                                },
                                specialInstructions: "\n            \u041A\u0420\u0418\u0422\u0418\u0427\u0415\u0421\u041A\u0418 \u0412\u0410\u0416\u041D\u041E - \u0417\u0410\u041F\u041E\u041B\u041D\u042F\u0419 \u0422\u041E\u041B\u042C\u041A\u041E \u042D\u0422\u0418 \u0425\u0410\u0420\u0410\u041A\u0422\u0415\u0420\u0418\u0421\u0422\u0418\u041A\u0418:\n            \n            \u0414\u041E\u0421\u0422\u0423\u041F\u041D\u042B\u0415 \u0425\u0410\u0420\u0410\u041A\u0422\u0415\u0420\u0418\u0421\u0422\u0418\u041A\u0418 (" + characteristicsForAI.length + " \u0448\u0442):\n            " + characteristicsForAI.map(function (char) {
                                    return "- " + char.name + " (ID: " + char.id + ", \u0442\u0438\u043F: " + char.type.toUpperCase() + (char.isRequired ? ', ОБЯЗАТЕЛЬНАЯ' : '') + ")";
                                }).join('\n            ') + "\n            \n            \u041D\u0415 \u0418\u0417\u041C\u0415\u041D\u042F\u0419:\n            1. \u041A\u043E\u043C\u043F\u043B\u0435\u043A\u0442\u0430\u0446\u0438\u044F: \"" + productData.packageContents + "\"\n            2. \u0412\u0435\u0441 \u0442\u043E\u0432\u0430\u0440\u0430: " + productData.weight + " \u043A\u0433  \n            3. \u0420\u0430\u0437\u043C\u0435\u0440\u044B: " + productData.length + "\u00D7" + productData.width + "\u00D7" + productData.height + " \u0441\u043C\n            \n            \u0417\u0410\u041F\u041E\u041B\u041D\u042F\u0419 \u0422\u041E\u041B\u042C\u041A\u041E:\n            - \u0425\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438 \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430 \u0432\u044B\u0448\u0435\n            - \u041D\u0415 \u043F\u0440\u0438\u0434\u0443\u043C\u044B\u0432\u0430\u0439 \u043D\u043E\u0432\u044B\u0435 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438\n            - \u041D\u0415 \u0437\u0430\u043F\u043E\u043B\u043D\u044F\u0439 \u0433\u0430\u0431\u0430\u0440\u0438\u0442\u043D\u044B\u0435 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438\n            - \u041D\u0415 \u0437\u0430\u043F\u043E\u043B\u043D\u044F\u0439 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438 \u0446\u0432\u0435\u0442\u0430\n            \n            \u0426\u0415\u041B\u042C: \u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A \u0418\u0417 \u0414\u041E\u0421\u0422\u0423\u041F\u041D\u041E\u0413\u041E \u0421\u041F\u0418\u0421\u041A\u0410!\n          "
                            }
                        })];
                case 42:
                    enhancedResult = _c.sent();
                    console.log('Enhanced System завершена успешно');
                    console.log("   - \u0425\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u043E: " + enhancedResult.characteristics.length);
                    console.log("   - \u041A\u0430\u0447\u0435\u0441\u0442\u0432\u043E \u0430\u043D\u0430\u043B\u0438\u0437\u0430: " + enhancedResult.qualityMetrics.overallScore + "%");
                    console.log("   - \u0423\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0441\u0442\u044C: " + enhancedResult.confidence + "%");
                    return [3 /*break*/, 48];
                case 43:
                    enhancedError_1 = _c.sent();
                    console.error('Ошибка Enhanced System:', enhancedError_1);
                    // Fallback: создаем базовый продукт без AI анализа
                    console.log('Fallback: создаем продукт без AI анализа');
                    _c.label = 44;
                case 44:
                    _c.trys.push([44, 46, , 47]);
                    return [4 /*yield*/, prisma_1.prisma.product.update({
                            where: { id: productId },
                            data: {
                                status: 'DRAFT',
                                errorMessage: "Enhanced System \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430: " + (enhancedError_1 instanceof Error ? enhancedError_1.message : 'Неизвестная ошибка') + ". \u041F\u0440\u043E\u0434\u0443\u043A\u0442 \u0441\u043E\u0437\u0434\u0430\u043D \u0432 \u0431\u0430\u0437\u043E\u0432\u043E\u043C \u0440\u0435\u0436\u0438\u043C\u0435."
                            }
                        })];
                case 45:
                    _c.sent();
                    console.log('Продукт создан в базовом режиме (DRAFT)');
                    return [3 /*break*/, 47];
                case 46:
                    fallbackError_1 = _c.sent();
                    console.error('Ошибка fallback обновления:', fallbackError_1);
                    return [3 /*break*/, 47];
                case 47: return [3 /*break*/, 48];
                case 48:
                    if (!enhancedResult) return [3 /*break*/, 52];
                    _c.label = 49;
                case 49:
                    _c.trys.push([49, 51, , 52]);
                    return [4 /*yield*/, prisma_1.prisma.product.update({
                            where: { id: productId },
                            data: {
                                status: 'READY',
                                generatedName: enhancedResult.seoTitle,
                                seoDescription: enhancedResult.seoDescription,
                                aiCharacteristics: json_1.toPrismaJson({
                                    characteristics: enhancedResult.characteristics,
                                    keywords: enhancedResult.suggestedKeywords || [],
                                    advantages: enhancedResult.competitiveAdvantages || [],
                                    tnvedCode: enhancedResult.tnvedCode,
                                    confidence: enhancedResult.confidence,
                                    warnings: enhancedResult.warnings || [],
                                    qualityScore: enhancedResult.qualityMetrics.overallScore,
                                    recommendations: enhancedResult.recommendations,
                                    analysisReport: enhancedResult.analysisReport,
                                    qualityMetrics: enhancedResult.qualityMetrics
                                })
                            }
                        })];
                case 50:
                    _c.sent();
                    console.log('Результаты AI анализа сохранены в БД');
                    return [3 /*break*/, 52];
                case 51:
                    aiUpdateError_1 = _c.sent();
                    console.warn('Ошибка сохранения AI анализа в БД:', aiUpdateError_1);
                    return [3 /*break*/, 52];
                case 52:
                    endTime = Date.now();
                    processingTime = endTime - startTime;
                    console.log("\u041F\u0440\u043E\u0434\u0443\u043A\u0442 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D \u0437\u0430 " + processingTime + "\u043C\u0441");
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            message: 'Продукт успешно создан и проанализирован',
                            productId: productId,
                            processingTime: processingTime,
                            data: {
                                name: productData.name,
                                vendorCode: productData.vendorCode,
                                barcode: productData.barcode,
                                price: {
                                    original: parseFloat(productData.originalPrice),
                                    discount: parseFloat(productData.discountPrice)
                                },
                                category: {
                                    id: productData.categoryId,
                                    name: productData.categoryName,
                                    parentName: productData.parentCategoryName
                                },
                                dimensions: {
                                    length: parseFloat(productData.length),
                                    width: parseFloat(productData.width),
                                    height: parseFloat(productData.height),
                                    weight: parseFloat(productData.weight)
                                },
                                packageContents: productData.packageContents,
                                hasVariantSizes: productData.hasVariantSizes,
                                variantSizes: productData.variantSizes
                            }
                        })];
                case 53:
                    error_2 = _c.sent();
                    console.error('Критическая ошибка создания продукта:', error_2);
                    endTime = Date.now();
                    processingTime = endTime - startTime;
                    errorMessage = 'Внутренняя ошибка сервера';
                    errorDetails = '';
                    suggestion = 'Попробуйте позже или обратитесь в поддержку';
                    if (error_2 instanceof Error) {
                        if (error_2.message.includes('timeout') || error_2.message.includes('connection')) {
                            errorMessage = 'Проблемы с подключением к серверу';
                            suggestion = 'Проверьте интернет-соединение и попробуйте снова';
                        }
                        else if (error_2.message.includes('database') || error_2.message.includes('prisma')) {
                            errorMessage = 'Ошибка базы данных';
                            suggestion = 'Попробуйте позже или обратитесь в поддержку';
                        }
                        else if (error_2.message.includes('validation') || error_2.message.includes('parse')) {
                            errorMessage = 'Ошибка валидации данных';
                            suggestion = 'Проверьте правильность введенных данных';
                        }
                        else if (error_2.message.includes('upload') || error_2.message.includes('file')) {
                            errorMessage = 'Ошибка загрузки файлов';
                            suggestion = 'Проверьте размер и формат файлов';
                        }
                        else {
                            errorDetails = error_2.message;
                        }
                    }
                    return [2 /*return*/, server_1.NextResponse.json({
                            error: errorMessage,
                            details: errorDetails,
                            suggestion: suggestion,
                            processingTime: processingTime
                        }, { status: 500 })];
                case 54: return [2 /*return*/];
            }
        });
    });
}
exports.POST = POST;
var templateObject_1;
