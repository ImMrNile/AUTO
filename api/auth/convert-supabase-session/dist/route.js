"use strict";
// src/app/api/auth/convert-supabase-session/route.ts
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
exports.POST = void 0;
var server_1 = require("next/server");
var server_2 = require("../../../../../lib/supabase/server");
var prisma_1 = require("../../../../../lib/prisma");
function POST(request) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var dbError_1, supabase, _b, supabaseUser, error, user, token, expiresAt, response, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 13, , 14]);
                    console.log('🔄 [Convert Session] Конвертируем Supabase сессию в локальную');
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, prisma_1.prisma.$connect()];
                case 2:
                    _c.sent();
                    console.log('✅ [Convert Session] Подключение к БД успешно');
                    return [3 /*break*/, 4];
                case 3:
                    dbError_1 = _c.sent();
                    console.error('❌ [Convert Session] Ошибка подключения к БД:', dbError_1);
                    // Детальная диагностика ошибки БД
                    if (dbError_1.code === 'P1001') {
                        console.error('🚨 [Convert Session] Не удается подключиться к серверу PostgreSQL');
                    }
                    else if (dbError_1.code === 'P1017') {
                        console.error('🚨 [Convert Session] Сервер отклонил подключение');
                    }
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: false,
                            error: 'Ошибка подключения к базе данных',
                            details: dbError_1.message,
                            code: dbError_1.code
                        }, { status: 500 })];
                case 4:
                    supabase = server_2.createClient();
                    return [4 /*yield*/, supabase.auth.getUser()];
                case 5:
                    _b = _c.sent(), supabaseUser = _b.data.user, error = _b.error;
                    console.log('🔍 [Convert Session] Supabase пользователь:', {
                        hasUser: !!supabaseUser,
                        userId: supabaseUser === null || supabaseUser === void 0 ? void 0 : supabaseUser.id,
                        email: supabaseUser === null || supabaseUser === void 0 ? void 0 : supabaseUser.email,
                        error: error === null || error === void 0 ? void 0 : error.message
                    });
                    if (error || !supabaseUser) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'Нет активной Supabase сессии',
                                details: error === null || error === void 0 ? void 0 : error.message
                            }, { status: 401 })];
                    }
                    // Ищем или создаем пользователя в нашей БД
                    console.log('🔍 [Convert Session] Поиск пользователя в БД...');
                    return [4 /*yield*/, prisma_1.prisma.user.findUnique({
                            where: { supabaseId: supabaseUser.id }
                        })];
                case 6:
                    user = _c.sent();
                    if (!!user) return [3 /*break*/, 8];
                    console.log('🔄 [Convert Session] Создаем нового пользователя...');
                    return [4 /*yield*/, prisma_1.prisma.user.create({
                            data: {
                                supabaseId: supabaseUser.id,
                                email: supabaseUser.email || "user-" + supabaseUser.id + "@unknown.com",
                                name: ((_a = supabaseUser.user_metadata) === null || _a === void 0 ? void 0 : _a.name) || supabaseUser.email || 'Пользователь',
                                role: 'USER',
                                isActive: true,
                                lastLoginAt: new Date()
                            }
                        })];
                case 7:
                    user = _c.sent();
                    console.log('✅ [Convert Session] Пользователь создан:', user.email);
                    return [3 /*break*/, 10];
                case 8:
                    console.log('✅ [Convert Session] Пользователь найден:', user.email);
                    // Обновляем время последнего входа
                    return [4 /*yield*/, prisma_1.prisma.user.update({
                            where: { id: user.id },
                            data: { lastLoginAt: new Date() }
                        })];
                case 9:
                    // Обновляем время последнего входа
                    _c.sent();
                    _c.label = 10;
                case 10: 
                // Удаляем старые сессии этого пользователя
                return [4 /*yield*/, prisma_1.prisma.session.deleteMany({
                        where: { userId: user.id }
                    })];
                case 11:
                    // Удаляем старые сессии этого пользователя
                    _c.sent();
                    token = generateToken();
                    expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    return [4 /*yield*/, prisma_1.prisma.session.create({
                            data: {
                                userId: user.id,
                                token: token,
                                expiresAt: expiresAt
                            }
                        })];
                case 12:
                    _c.sent();
                    console.log('✅ [Convert Session] Локальная сессия создана:', token.substring(0, 10) + '...');
                    response = server_1.NextResponse.json({
                        success: true,
                        message: 'Сессия успешно конвертирована',
                        user: {
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            role: user.role
                        }
                    });
                    // Устанавливаем cookie с нашей сессией
                    response.cookies.set('session_token', token, {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        maxAge: 30 * 24 * 60 * 60,
                        path: '/',
                        sameSite: 'lax'
                    });
                    return [2 /*return*/, response];
                case 13:
                    error_1 = _c.sent();
                    console.error('❌ [Convert Session] Критическая ошибка:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: false,
                            error: 'Ошибка конвертации сессии',
                            details: error_1 instanceof Error ? error_1.message : 'Неизвестная ошибка'
                        }, { status: 500 })];
                case 14: return [2 /*return*/];
            }
        });
    });
}
exports.POST = POST;
// Функция генерации токена
function generateToken() {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var token = '';
    for (var i = 0; i < 64; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}
