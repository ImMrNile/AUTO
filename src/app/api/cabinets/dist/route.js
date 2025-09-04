"use strict";
// src/app/api/cabinets/route.ts - Полный роутер для кабинетов
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
exports.DELETE = exports.PUT = exports.POST = exports.GET = void 0;
var server_1 = require("next/server");
var prisma_1 = require("../../../../lib/prisma");
var auth_service_1 = require("./../../../../lib/auth/auth-service");
// Новые базовые URL API Wildberries 2025
var WB_API_ENDPOINTS = {
    content: 'https://content-api.wildberries.ru',
    marketplace: 'https://marketplace-api.wildberries.ru',
    statistics: 'https://statistics-api.wildberries.ru',
    prices: 'https://discounts-prices-api.wildberries.ru'
};
function GET() {
    return __awaiter(this, void 0, void 0, function () {
        var user, cabinets, cabinetsWithStats, error_1, errorMessage, statusCode;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    console.log('🔍 [API Cabinets] === НАЧАЛО GET /api/cabinets ===');
                    // Проверяем авторизацию
                    console.log('🔍 [API Cabinets] Проверка авторизации...');
                    return [4 /*yield*/, auth_service_1.AuthService.getCurrentUser()];
                case 1:
                    user = _a.sent();
                    if (!user) {
                        console.log('❌ [API Cabinets] User not authenticated');
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'Не авторизован',
                                suggestion: 'Войдите в систему для просмотра кабинетов',
                                cabinets: []
                            }, { status: 401 })];
                    }
                    console.log('✅ [API Cabinets] User authenticated:', {
                        id: user.id,
                        email: user.email,
                        role: user.role
                    });
                    // Получаем кабинеты из базы данных
                    console.log('🔍 [API Cabinets] Загрузка кабинетов из БД...');
                    return [4 /*yield*/, prisma_1.prisma.cabinet.findMany({
                            where: {
                                userId: user.id
                            },
                            include: {
                                productCabinets: {
                                    include: {
                                        product: {
                                            select: {
                                                id: true,
                                                status: true
                                            }
                                        }
                                    }
                                }
                            },
                            orderBy: { createdAt: 'desc' }
                        })];
                case 2:
                    cabinets = _a.sent();
                    console.log('✅ [API Cabinets] Кабинеты загружены из БД:', {
                        count: cabinets.length,
                        cabinets: cabinets.map(function (c) { return ({
                            id: c.id,
                            name: c.name,
                            isActive: c.isActive,
                            productCount: c.productCabinets.length
                        }); })
                    });
                    cabinetsWithStats = cabinets.map(function (cabinet) { return ({
                        id: cabinet.id,
                        userId: cabinet.userId,
                        name: cabinet.name,
                        description: cabinet.description,
                        apiToken: maskToken(cabinet.apiToken || ''),
                        isActive: cabinet.isActive,
                        createdAt: cabinet.createdAt,
                        updatedAt: cabinet.updatedAt,
                        stats: {
                            totalProducts: cabinet.productCabinets.length,
                            publishedProducts: cabinet.productCabinets.filter(function (pc) {
                                return pc.product.status === 'PUBLISHED';
                            }).length,
                            processingProducts: cabinet.productCabinets.filter(function (pc) {
                                return pc.product.status === 'PROCESSING' || pc.product.status === 'PUBLISHING';
                            }).length
                        }
                    }); });
                    console.log('✅ [API Cabinets] Отправляем ответ с кабинетами:', {
                        count: cabinetsWithStats.length,
                        activeCount: cabinetsWithStats.filter(function (c) { return c.isActive; }).length
                    });
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            cabinets: cabinetsWithStats,
                            total: cabinets.length,
                            meta: {
                                userId: user.id,
                                timestamp: new Date().toISOString()
                            }
                        })];
                case 3:
                    error_1 = _a.sent();
                    console.error('❌ [API Cabinets] Критическая ошибка:', error_1);
                    errorMessage = 'Ошибка при получении кабинетов';
                    statusCode = 500;
                    if (error_1 instanceof Error) {
                        if (error_1.message.includes('P1001') || error_1.message.includes('ENOTFOUND')) {
                            errorMessage = 'Не удается подключиться к базе данных';
                            statusCode = 503;
                        }
                        else if (error_1.message.includes('timeout')) {
                            errorMessage = 'Превышен таймаут подключения к базе данных';
                            statusCode = 504;
                        }
                    }
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: false,
                            error: errorMessage,
                            details: error_1 instanceof Error ? error_1.message : 'Неизвестная ошибка',
                            cabinets: []
                        }, { status: statusCode })];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
// POST - добавить новый кабинет
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var user, name, apiToken, description, skipValidation, contentType, body, form, sv, svStr, existingCabinet, validation, newCabinet, error_2, errorMessage, statusCode;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 10, , 11]);
                    console.log('📝 [API Cabinets] === НАЧАЛО POST /api/cabinets ===');
                    return [4 /*yield*/, auth_service_1.AuthService.getCurrentUser()];
                case 1:
                    user = _a.sent();
                    if (!user) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'Не авторизован',
                                suggestion: 'Войдите в систему для создания кабинета'
                            }, { status: 401 })];
                    }
                    name = void 0;
                    apiToken = void 0;
                    description = void 0;
                    skipValidation = void 0;
                    contentType = request.headers.get('content-type') || '';
                    if (!contentType.includes('application/json')) return [3 /*break*/, 3];
                    return [4 /*yield*/, request.json()];
                case 2:
                    body = _a.sent();
                    name = body.name;
                    apiToken = body.apiToken || body.token || body.api_key;
                    description = body.description;
                    skipValidation = body.skipValidation === true || body.skipValidation === 'true';
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, request.formData()];
                case 4:
                    form = _a.sent();
                    name = form.get('name') || undefined;
                    apiToken = form.get('apiToken') || form.get('token') || undefined;
                    description = form.get('description') || undefined;
                    sv = form.get('skipValidation');
                    svStr = typeof sv === 'string' ? sv : '';
                    skipValidation = svStr === 'true' || svStr === '1' || svStr === 'on';
                    _a.label = 5;
                case 5:
                    // Валидация входных данных
                    if (!name || typeof name !== 'string' || name.trim().length === 0) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'Название кабинета обязательно и должно быть непустой строкой'
                            }, { status: 400 })];
                    }
                    if (!apiToken || typeof apiToken !== 'string' || apiToken.trim().length === 0) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'API токен обязателен и должен быть непустой строкой'
                            }, { status: 400 })];
                    }
                    return [4 /*yield*/, prisma_1.prisma.cabinet.findFirst({
                            where: {
                                name: name.trim(),
                                userId: user.id
                            }
                        })];
                case 6:
                    existingCabinet = _a.sent();
                    if (existingCabinet) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'У вас уже есть кабинет с таким названием'
                            }, { status: 400 })];
                    }
                    if (!!skipValidation) return [3 /*break*/, 8];
                    return [4 /*yield*/, validateWBToken(apiToken.trim())];
                case 7:
                    validation = _a.sent();
                    if (!validation.valid) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: validation.error,
                                suggestion: validation.networkError ?
                                    'Не удается подключиться к API Wildberries. Проверьте интернет-соединение или добавьте кабинет без проверки токена.' :
                                    'Проверьте правильность API токена и его права доступа.',
                                canSkipValidation: validation.networkError,
                                tokenAnalysis: validation.tokenAnalysis
                            }, { status: 400 })];
                    }
                    _a.label = 8;
                case 8: return [4 /*yield*/, prisma_1.prisma.cabinet.create({
                        data: {
                            userId: user.id,
                            name: name.trim(),
                            apiToken: apiToken.trim(),
                            description: (description === null || description === void 0 ? void 0 : description.trim()) || null,
                            isActive: true
                        }
                    })];
                case 9:
                    newCabinet = _a.sent();
                    console.log('✅ [API Cabinets] Новый кабинет создан:', {
                        id: newCabinet.id,
                        name: newCabinet.name,
                        userId: newCabinet.userId
                    });
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            cabinet: __assign(__assign({}, newCabinet), { apiToken: maskToken(newCabinet.apiToken || ''), stats: {
                                    totalProducts: 0,
                                    publishedProducts: 0,
                                    processingProducts: 0
                                } }),
                            message: skipValidation
                                ? 'Кабинет добавлен без проверки токена'
                                : 'Кабинет успешно добавлен и токен проверен'
                        })];
                case 10:
                    error_2 = _a.sent();
                    console.error('❌ [API Cabinets] Ошибка при добавлении кабинета:', error_2);
                    errorMessage = 'Ошибка при добавлении кабинета';
                    statusCode = 500;
                    if (error_2 instanceof Error) {
                        if (error_2.message.includes('P1001') || error_2.message.includes('ENOTFOUND')) {
                            errorMessage = 'Не удается подключиться к базе данных';
                            statusCode = 503;
                        }
                        else if (error_2.message.includes('timeout')) {
                            errorMessage = 'Превышен таймаут подключения к базе данных';
                            statusCode = 504;
                        }
                        else if (error_2.message.includes('P2002')) {
                            errorMessage = 'Кабинет с таким названием уже существует';
                            statusCode = 409;
                        }
                    }
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: false,
                            error: errorMessage,
                            details: error_2 instanceof Error ? error_2.message : 'Неизвестная ошибка'
                        }, { status: statusCode })];
                case 11: return [2 /*return*/];
            }
        });
    });
}
exports.POST = POST;
// PUT - обновить кабинет
function PUT(request) {
    return __awaiter(this, void 0, void 0, function () {
        var user, body, id, name, apiToken, description, isActive, skipValidation, cabinet, validation, existingCabinet, updateData, updatedCabinet, error_3, errorMessage, statusCode;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 9, , 10]);
                    console.log('📝 [API Cabinets] === НАЧАЛО PUT /api/cabinets ===');
                    return [4 /*yield*/, auth_service_1.AuthService.getCurrentUser()];
                case 1:
                    user = _a.sent();
                    if (!user) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'Не авторизован'
                            }, { status: 401 })];
                    }
                    return [4 /*yield*/, request.json()];
                case 2:
                    body = _a.sent();
                    id = body.id, name = body.name, apiToken = body.apiToken, description = body.description, isActive = body.isActive, skipValidation = body.skipValidation;
                    if (!id || typeof id !== 'string') {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'ID кабинета обязателен'
                            }, { status: 400 })];
                    }
                    return [4 /*yield*/, prisma_1.prisma.cabinet.findFirst({
                            where: {
                                id: id,
                                userId: user.id
                            }
                        })];
                case 3:
                    cabinet = _a.sent();
                    if (!cabinet) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'Кабинет не найден или у вас нет прав для его редактирования'
                            }, { status: 404 })];
                    }
                    if (!(apiToken && apiToken !== cabinet.apiToken && !skipValidation)) return [3 /*break*/, 5];
                    return [4 /*yield*/, validateWBToken(apiToken.trim())];
                case 4:
                    validation = _a.sent();
                    if (!validation.valid) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: validation.error,
                                suggestion: validation.networkError ?
                                    'Не удается подключиться к API Wildberries. Обновите кабинет без проверки токена.' :
                                    'Проверьте правильность нового API токена.',
                                canSkipValidation: validation.networkError
                            }, { status: 400 })];
                    }
                    _a.label = 5;
                case 5:
                    if (!(name && name !== cabinet.name)) return [3 /*break*/, 7];
                    return [4 /*yield*/, prisma_1.prisma.cabinet.findFirst({
                            where: {
                                name: name.trim(),
                                userId: user.id,
                                id: { not: id }
                            }
                        })];
                case 6:
                    existingCabinet = _a.sent();
                    if (existingCabinet) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'У вас уже есть кабинет с таким названием'
                            }, { status: 400 })];
                    }
                    _a.label = 7;
                case 7:
                    updateData = {};
                    if (name !== undefined && name !== null) {
                        updateData.name = name.trim();
                    }
                    if (apiToken !== undefined && apiToken !== null) {
                        updateData.apiToken = apiToken.trim();
                    }
                    if (description !== undefined) {
                        updateData.description = (description === null || description === void 0 ? void 0 : description.trim()) || null;
                    }
                    if (typeof isActive !== 'undefined') {
                        updateData.isActive = isActive;
                    }
                    return [4 /*yield*/, prisma_1.prisma.cabinet.update({
                            where: { id: id },
                            data: updateData
                        })];
                case 8:
                    updatedCabinet = _a.sent();
                    console.log('✅ [API Cabinets] Кабинет обновлен:', {
                        id: updatedCabinet.id,
                        name: updatedCabinet.name
                    });
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            cabinet: __assign(__assign({}, updatedCabinet), { apiToken: maskToken(updatedCabinet.apiToken || ''), stats: {
                                    totalProducts: 0,
                                    publishedProducts: 0,
                                    processingProducts: 0
                                } }),
                            message: 'Кабинет успешно обновлен'
                        })];
                case 9:
                    error_3 = _a.sent();
                    console.error('❌ [API Cabinets] Ошибка при обновлении кабинета:', error_3);
                    errorMessage = 'Ошибка при обновлении кабинета';
                    statusCode = 500;
                    if (error_3 instanceof Error) {
                        if (error_3.message.includes('P1001') || error_3.message.includes('ENOTFOUND')) {
                            errorMessage = 'Не удается подключиться к базе данных';
                            statusCode = 503;
                        }
                        else if (error_3.message.includes('timeout')) {
                            errorMessage = 'Превышен таймаут подключения к базе данных';
                            statusCode = 504;
                        }
                        else if (error_3.message.includes('P2002')) {
                            errorMessage = 'Кабинет с таким названием уже существует';
                            statusCode = 409;
                        }
                    }
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: false,
                            error: errorMessage,
                            details: error_3 instanceof Error ? error_3.message : 'Неизвестная ошибка'
                        }, { status: statusCode })];
                case 10: return [2 /*return*/];
            }
        });
    });
}
exports.PUT = PUT;
// DELETE - удалить кабинет
function DELETE(request) {
    return __awaiter(this, void 0, void 0, function () {
        var user, searchParams, id, cabinet, error_4, errorMessage, statusCode;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    console.log('🗑️ [API Cabinets] === НАЧАЛО DELETE /api/cabinets ===');
                    return [4 /*yield*/, auth_service_1.AuthService.getCurrentUser()];
                case 1:
                    user = _a.sent();
                    if (!user) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'Не авторизован'
                            }, { status: 401 })];
                    }
                    searchParams = new URL(request.url).searchParams;
                    id = searchParams.get('id');
                    if (!id || typeof id !== 'string') {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'ID кабинета обязателен'
                            }, { status: 400 })];
                    }
                    return [4 /*yield*/, prisma_1.prisma.cabinet.findFirst({
                            where: {
                                id: id,
                                userId: user.id
                            },
                            include: {
                                productCabinets: true
                            }
                        })];
                case 2:
                    cabinet = _a.sent();
                    if (!cabinet) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'Кабинет не найден или у вас нет прав для его удаления'
                            }, { status: 404 })];
                    }
                    // Проверяем, есть ли связанные продукты
                    if (cabinet.productCabinets && cabinet.productCabinets.length > 0) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: "\u041D\u0435\u043B\u044C\u0437\u044F \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u043A\u0430\u0431\u0438\u043D\u0435\u0442: \u0441 \u043D\u0438\u043C \u0441\u0432\u044F\u0437\u0430\u043D\u043E " + cabinet.productCabinets.length + " \u0442\u043E\u0432\u0430\u0440\u043E\u0432",
                                canForceDelete: true,
                                relatedProductsCount: cabinet.productCabinets.length
                            }, { status: 400 })];
                    }
                    // Удаляем кабинет
                    return [4 /*yield*/, prisma_1.prisma.cabinet["delete"]({
                            where: { id: id }
                        })];
                case 3:
                    // Удаляем кабинет
                    _a.sent();
                    console.log('✅ [API Cabinets] Кабинет удален:', {
                        id: cabinet.id,
                        name: cabinet.name
                    });
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            message: 'Кабинет успешно удален'
                        })];
                case 4:
                    error_4 = _a.sent();
                    console.error('❌ [API Cabinets] Ошибка при удалении кабинета:', error_4);
                    errorMessage = 'Ошибка при удалении кабинета';
                    statusCode = 500;
                    if (error_4 instanceof Error) {
                        if (error_4.message.includes('P1001') || error_4.message.includes('ENOTFOUND')) {
                            errorMessage = 'Не удается подключиться к базе данных';
                            statusCode = 503;
                        }
                        else if (error_4.message.includes('timeout')) {
                            errorMessage = 'Превышен таймаут подключения к базе данных';
                            statusCode = 504;
                        }
                        else if (error_4.message.includes('P2003')) {
                            errorMessage = 'Нельзя удалить кабинет с связанными товарами';
                            statusCode = 409;
                        }
                    }
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: false,
                            error: errorMessage,
                            details: error_4 instanceof Error ? error_4.message : 'Неизвестная ошибка'
                        }, { status: statusCode })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
exports.DELETE = DELETE;
// Функция валидации WB токена
function validateWBToken(token) {
    return __awaiter(this, void 0, Promise, function () {
        var tokenAnalysis, pingEndpoints, successCount, lastError, hasNetworkError, _loop_1, _i, pingEndpoints_1, endpoint, state_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🔍 [API Cabinets] Проверяем токен WB...');
                    tokenAnalysis = analyzeJWTToken(token);
                    if (!tokenAnalysis.valid) {
                        return [2 /*return*/, {
                                valid: false,
                                error: tokenAnalysis.error,
                                tokenAnalysis: tokenAnalysis
                            }];
                    }
                    // Если токен истек
                    if (tokenAnalysis.isExpired) {
                        return [2 /*return*/, {
                                valid: false,
                                error: 'Токен истек. Создайте новый токен в личном кабинете Wildberries.',
                                tokenAnalysis: tokenAnalysis
                            }];
                    }
                    pingEndpoints = [
                        { name: 'Content API', url: WB_API_ENDPOINTS.content + "/ping" },
                        { name: 'Marketplace API', url: WB_API_ENDPOINTS.marketplace + "/ping" }
                    ];
                    successCount = 0;
                    lastError = '';
                    hasNetworkError = false;
                    _loop_1 = function (endpoint) {
                        var controller_1, timeoutId, response, error_5;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    console.log("\uD83D\uDCE1 [API Cabinets] \u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C " + endpoint.name + ": " + endpoint.url);
                                    controller_1 = new AbortController();
                                    timeoutId = setTimeout(function () { return controller_1.abort(); }, 10000);
                                    return [4 /*yield*/, fetch(endpoint.url, {
                                            method: 'GET',
                                            headers: {
                                                'Authorization': token,
                                                'Content-Type': 'application/json',
                                                'User-Agent': 'WB-Automation/1.0'
                                            },
                                            signal: controller_1.signal
                                        })];
                                case 1:
                                    response = _a.sent();
                                    clearTimeout(timeoutId);
                                    console.log(endpoint.name + " \u043E\u0442\u0432\u0435\u0442: " + response.status);
                                    if (response.ok) {
                                        successCount++;
                                        console.log("\u2705 " + endpoint.name + " - \u0443\u0441\u043F\u0435\u0448\u043D\u043E!");
                                        if (successCount === 1) {
                                            return [2 /*return*/, { value: {
                                                        valid: true,
                                                        tokenAnalysis: tokenAnalysis
                                                    } }];
                                        }
                                    }
                                    else if (response.status === 401) {
                                        lastError = 'Недействительный токен авторизации';
                                    }
                                    else if (response.status === 403) {
                                        lastError = 'Недостаточно прав доступа к этому API';
                                    }
                                    else {
                                        lastError = "\u041E\u0448\u0438\u0431\u043A\u0430 API: " + response.status;
                                    }
                                    return [3 /*break*/, 3];
                                case 2:
                                    error_5 = _a.sent();
                                    console.error("\u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u0438 \u043A " + endpoint.name + ":", error_5.message);
                                    hasNetworkError = true;
                                    if (error_5.name === 'AbortError') {
                                        lastError = 'Превышен таймаут подключения (более 10 секунд)';
                                    }
                                    else if (error_5.message.includes('ENOTFOUND')) {
                                        lastError = 'Не удается найти сервер API Wildberries';
                                    }
                                    else if (error_5.message.includes('fetch failed')) {
                                        lastError = 'Ошибка сетевого соединения с API';
                                    }
                                    else {
                                        lastError = 'Ошибка сетевого соединения';
                                    }
                                    return [3 /*break*/, 3];
                                case 3: 
                                // Пауза между запросами
                                return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
                                case 4:
                                    // Пауза между запросами
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, pingEndpoints_1 = pingEndpoints;
                    _a.label = 1;
                case 1:
                    if (!(_i < pingEndpoints_1.length)) return [3 /*break*/, 4];
                    endpoint = pingEndpoints_1[_i];
                    return [5 /*yield**/, _loop_1(endpoint)];
                case 2:
                    state_1 = _a.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    if (successCount === 0) {
                        return [2 /*return*/, {
                                valid: false,
                                error: lastError || 'Не удается подключиться к API Wildberries',
                                networkError: hasNetworkError,
                                tokenAnalysis: tokenAnalysis
                            }];
                    }
                    return [2 /*return*/, {
                            valid: true,
                            tokenAnalysis: tokenAnalysis
                        }];
            }
        });
    });
}
// Анализ JWT токена
function analyzeJWTToken(token) {
    try {
        var parts = token.split('.');
        if (parts.length !== 3) {
            return {
                valid: false,
                error: 'Неверный формат JWT токена (должно быть 3 части, разделенные точками)'
            };
        }
        var b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        var payloadJson = Buffer.from(b64, 'base64').toString('utf8');
        var payload = JSON.parse(payloadJson);
        var now = Math.floor(Date.now() / 1000);
        var isExpired = payload.exp && payload.exp < now;
        return {
            valid: true,
            isExpired: isExpired,
            expiresAt: payload.exp ? new Date(payload.exp * 1000).toLocaleString('ru-RU') : 'Не указано',
            sellerId: payload.sid || 'Не указано',
            permissions: payload.s || 'Не указано',
            isTestToken: payload.t || false,
            tokenId: payload.id || 'Не указано'
        };
    }
    catch (error) {
        console.error('❌ Ошибка при анализе JWT токена:', error);
        var errorMessage = 'Не удалось разобрать JWT токен';
        if (error instanceof Error) {
            if (error.message.includes('JSON')) {
                errorMessage = 'Неверный формат JWT токена';
            }
            else if (error.message.includes('base64')) {
                errorMessage = 'Ошибка декодирования JWT токена';
            }
            else {
                errorMessage = "\u041E\u0448\u0438\u0431\u043A\u0430 \u0430\u043D\u0430\u043B\u0438\u0437\u0430 \u0442\u043E\u043A\u0435\u043D\u0430: " + error.message;
            }
        }
        return {
            valid: false,
            error: errorMessage
        };
    }
}
// Функция для маскировки токена
function maskToken(token) {
    if (!token)
        return '***';
    if (token.length === 0)
        return '***';
    if (token.length <= 8)
        return '*'.repeat(Math.min(token.length, 10));
    return token.substring(0, 4) + '*'.repeat(Math.max(token.length - 8, 3)) + token.substring(token.length - 4);
}
