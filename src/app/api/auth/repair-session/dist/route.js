"use strict";
// src/app/api/auth/repair-session/route.ts
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
var headers_1 = require("next/headers");
function POST(request) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var cookieStore, currentToken, existingSession, supabase, _c, supabaseUser, error, user, deletedSessions, newToken, expiresAt, newSession, response, error_1;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 10, , 11]);
                    console.log('🔧 [Repair Session] Восстанавливаем сессию...');
                    cookieStore = headers_1.cookies();
                    currentToken = (_a = cookieStore.get('session_token')) === null || _a === void 0 ? void 0 : _a.value;
                    console.log('🔧 [Repair Session] Текущий token в cookie:', currentToken ? currentToken.substring(0, 10) + '...' : 'отсутствует');
                    if (!currentToken) return [3 /*break*/, 2];
                    return [4 /*yield*/, prisma_1.prisma.session.findUnique({
                            where: { token: currentToken },
                            include: { user: true }
                        })];
                case 1:
                    existingSession = _d.sent();
                    console.log('🔧 [Repair Session] Сессия в БД:', existingSession ? 'найдена' : 'НЕ НАЙДЕНА');
                    if (existingSession && existingSession.expiresAt > new Date()) {
                        console.log('✅ [Repair Session] Активная сессия уже есть:', existingSession.user.email);
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: true,
                                message: 'Сессия уже активна',
                                user: {
                                    id: existingSession.user.id,
                                    email: existingSession.user.email,
                                    name: existingSession.user.name
                                }
                            })];
                    }
                    _d.label = 2;
                case 2:
                    supabase = server_2.createClient();
                    return [4 /*yield*/, supabase.auth.getUser()];
                case 3:
                    _c = _d.sent(), supabaseUser = _c.data.user, error = _c.error;
                    console.log('🔧 [Repair Session] Supabase пользователь:', {
                        hasUser: !!supabaseUser,
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
                    return [4 /*yield*/, prisma_1.prisma.user.findUnique({
                            where: { supabaseId: supabaseUser.id }
                        })];
                case 4:
                    user = _d.sent();
                    console.log('🔧 [Repair Session] Пользователь в БД:', user ? user.email : 'не найден');
                    if (!!user) return [3 /*break*/, 6];
                    return [4 /*yield*/, prisma_1.prisma.user.create({
                            data: {
                                supabaseId: supabaseUser.id,
                                email: supabaseUser.email || "user-" + supabaseUser.id + "@unknown.com",
                                name: ((_b = supabaseUser.user_metadata) === null || _b === void 0 ? void 0 : _b.name) || supabaseUser.email || 'Пользователь',
                                role: 'USER',
                                isActive: true,
                                lastLoginAt: new Date()
                            }
                        })];
                case 5:
                    // Создаем пользователя если не существует
                    user = _d.sent();
                    console.log('✅ [Repair Session] Создан новый пользователь:', user.email);
                    _d.label = 6;
                case 6: return [4 /*yield*/, prisma_1.prisma.session.deleteMany({
                        where: { userId: user.id }
                    })];
                case 7:
                    deletedSessions = _d.sent();
                    console.log("\uD83E\uDDF9 [Repair Session] \u0423\u0434\u0430\u043B\u0435\u043D\u043E \u0441\u0442\u0430\u0440\u044B\u0445 \u0441\u0435\u0441\u0441\u0438\u0439: " + deletedSessions.count);
                    newToken = generateToken();
                    expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    return [4 /*yield*/, prisma_1.prisma.session.create({
                            data: {
                                userId: user.id,
                                token: newToken,
                                expiresAt: expiresAt,
                                ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
                                userAgent: request.headers.get('user-agent') || 'unknown'
                            }
                        })];
                case 8:
                    newSession = _d.sent();
                    console.log('✅ [Repair Session] Создана новая сессия:', newToken.substring(0, 10) + '...');
                    // 7. Обновляем время последнего входа
                    return [4 /*yield*/, prisma_1.prisma.user.update({
                            where: { id: user.id },
                            data: { lastLoginAt: new Date() }
                        })];
                case 9:
                    // 7. Обновляем время последнего входа
                    _d.sent();
                    response = server_1.NextResponse.json({
                        success: true,
                        message: 'Сессия успешно восстановлена',
                        user: {
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            role: user.role
                        },
                        sessionInfo: {
                            tokenPreview: newToken.substring(0, 10) + '...',
                            expiresAt: expiresAt.toISOString(),
                            deletedOldSessions: deletedSessions.count
                        }
                    });
                    // 8. Устанавливаем новый cookie
                    response.cookies.set('session_token', newToken, {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        maxAge: 30 * 24 * 60 * 60,
                        path: '/',
                        sameSite: 'lax'
                    });
                    console.log('✅ [Repair Session] Cookie установлен');
                    return [2 /*return*/, response];
                case 10:
                    error_1 = _d.sent();
                    console.error('❌ [Repair Session] Критическая ошибка:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: false,
                            error: 'Ошибка восстановления сессии',
                            details: error_1 instanceof Error ? error_1.message : 'Неизвестная ошибка'
                        }, { status: 500 })];
                case 11: return [2 /*return*/];
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
