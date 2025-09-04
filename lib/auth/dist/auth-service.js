"use strict";
// lib/auth/auth-service.ts - Реальная версия для Supabase PostgreSQL
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
exports.__esModule = true;
exports.AuthService = void 0;
var prisma_1 = require("../prisma");
var headers_1 = require("next/headers");
var AuthService = /** @class */ (function () {
    function AuthService() {
    }
    /**
     * Получить текущего пользователя из реальной базы данных
     */
    AuthService.getCurrentUser = function () {
        var _a;
        return __awaiter(this, void 0, Promise, function () {
            var cookieStore, token, session, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log('🔍 [AuthService] === НАЧАЛО getCurrentUser (Production) ===');
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 6, 7, 9]);
                        cookieStore = headers_1.cookies();
                        token = (_a = cookieStore.get('session_token')) === null || _a === void 0 ? void 0 : _a.value;
                        console.log('🔍 [AuthService] Session token:', token ? token.substring(0, 10) + "..." : 'не найден');
                        if (!token) {
                            console.log('🔍 [AuthService] No session token found');
                            return [2 /*return*/, null];
                        }
                        // Подключаемся к БД и ищем сессию
                        console.log('🔍 [AuthService] Connecting to Supabase PostgreSQL...');
                        // Обеспечиваем соединение с БД
                        return [4 /*yield*/, prisma_1.prisma.$connect()];
                    case 2:
                        // Обеспечиваем соединение с БД
                        _b.sent();
                        return [4 /*yield*/, prisma_1.prisma.session.findUnique({
                                where: { token: token },
                                include: {
                                    user: {
                                        select: {
                                            id: true,
                                            email: true,
                                            name: true,
                                            avatarUrl: true,
                                            role: true,
                                            isActive: true
                                        }
                                    }
                                }
                            })];
                    case 3:
                        session = _b.sent();
                        console.log('🔍 [AuthService] Session search result:', session ? {
                            sessionId: session.id,
                            userId: session.userId,
                            expiresAt: session.expiresAt,
                            userEmail: session.user.email,
                            userActive: session.user.isActive
                        } : 'не найдена');
                        if (!session) {
                            console.log('🔍 [AuthService] Session not found in database');
                            return [2 /*return*/, null];
                        }
                        if (!(session.expiresAt < new Date())) return [3 /*break*/, 5];
                        console.log('🔍 [AuthService] Session expired:', session.expiresAt);
                        // Удаляем истекшую сессию
                        return [4 /*yield*/, prisma_1.prisma.session["delete"]({
                                where: { id: session.id }
                            })];
                    case 4:
                        // Удаляем истекшую сессию
                        _b.sent();
                        return [2 /*return*/, null];
                    case 5:
                        // Проверяем активность пользователя
                        if (!session.user.isActive) {
                            console.log('🔍 [AuthService] User is not active');
                            return [2 /*return*/, null];
                        }
                        console.log('✅ [AuthService] User authenticated successfully:', session.user.email);
                        return [2 /*return*/, {
                                id: session.user.id,
                                email: session.user.email,
                                name: session.user.name || undefined,
                                avatarUrl: session.user.avatarUrl || undefined,
                                role: session.user.role,
                                isActive: session.user.isActive
                            }];
                    case 6:
                        error_1 = _b.sent();
                        console.error('❌ [AuthService] Database error:', error_1);
                        // Определяем тип ошибки для лучшей диагностики
                        if (error_1 instanceof Error) {
                            if (error_1.message.includes('P1001')) {
                                console.error('🚨 [AuthService] Cannot reach database server');
                            }
                            else if (error_1.message.includes('P1017')) {
                                console.error('🚨 [AuthService] Server rejected connection');
                            }
                            else if (error_1.message.includes('timeout')) {
                                console.error('🚨 [AuthService] Database timeout');
                            }
                        }
                        throw error_1; // Пробрасываем ошибку выше для обработки
                    case 7: return [4 /*yield*/, prisma_1.prisma.$disconnect()];
                    case 8:
                        _b.sent();
                        return [7 /*endfinally*/];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Создание сессии для пользователя
     */
    AuthService.createSession = function (userId, ipAddress, userAgent) {
        return __awaiter(this, void 0, Promise, function () {
            var token, expiresAt, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('🔐 [AuthService] Creating session for user:', userId);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, 5, 7]);
                        return [4 /*yield*/, prisma_1.prisma.$connect()];
                    case 2:
                        _a.sent();
                        token = this.generateToken();
                        expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 дней
                        ;
                        return [4 /*yield*/, prisma_1.prisma.session.create({
                                data: {
                                    userId: userId,
                                    token: token,
                                    ipAddress: ipAddress,
                                    userAgent: userAgent,
                                    expiresAt: expiresAt
                                }
                            })];
                    case 3:
                        _a.sent();
                        console.log('✅ [AuthService] Session created successfully:', token.substring(0, 10) + '...');
                        return [2 /*return*/, token];
                    case 4:
                        error_2 = _a.sent();
                        console.error('❌ [AuthService] Error creating session:', error_2);
                        throw error_2;
                    case 5: return [4 /*yield*/, prisma_1.prisma.$disconnect()];
                    case 6:
                        _a.sent();
                        return [7 /*endfinally*/];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Валидация сессии по токену
     */
    AuthService.validateSession = function (token) {
        return __awaiter(this, void 0, Promise, function () {
            var session, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('🔍 [AuthService] Validating session:', token.substring(0, 10) + '...');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 7, 8, 10]);
                        return [4 /*yield*/, prisma_1.prisma.$connect()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, prisma_1.prisma.session.findUnique({
                                where: { token: token },
                                include: {
                                    user: {
                                        select: {
                                            id: true,
                                            email: true,
                                            name: true,
                                            avatarUrl: true,
                                            role: true,
                                            isActive: true
                                        }
                                    }
                                }
                            })];
                    case 3:
                        session = _a.sent();
                        if (!(!session || session.expiresAt < new Date())) return [3 /*break*/, 6];
                        if (!session) return [3 /*break*/, 5];
                        return [4 /*yield*/, prisma_1.prisma.session["delete"]({ where: { id: session.id } })];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [2 /*return*/, null];
                    case 6:
                        if (!session.user.isActive)
                            return [2 /*return*/, null];
                        return [2 /*return*/, {
                                id: session.user.id,
                                email: session.user.email,
                                name: session.user.name || undefined,
                                avatarUrl: session.user.avatarUrl || undefined,
                                role: session.user.role,
                                isActive: session.user.isActive
                            }];
                    case 7:
                        error_3 = _a.sent();
                        console.error('❌ [AuthService] Error validating session:', error_3);
                        throw error_3;
                    case 8: return [4 /*yield*/, prisma_1.prisma.$disconnect()];
                    case 9:
                        _a.sent();
                        return [7 /*endfinally*/];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Удаление сессии (logout)
     */
    AuthService.destroySession = function (token) {
        return __awaiter(this, void 0, Promise, function () {
            var error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('🔐 [AuthService] Destroying session:', token.substring(0, 10) + '...');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, 5, 7]);
                        return [4 /*yield*/, prisma_1.prisma.$connect()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, prisma_1.prisma.session["delete"]({ where: { token: token } })];
                    case 3:
                        _a.sent();
                        console.log('✅ [AuthService] Session deleted successfully');
                        return [3 /*break*/, 7];
                    case 4:
                        error_4 = _a.sent();
                        console.error('❌ [AuthService] Error destroying session:', error_4);
                        throw error_4;
                    case 5: return [4 /*yield*/, prisma_1.prisma.$disconnect()];
                    case 6:
                        _a.sent();
                        return [7 /*endfinally*/];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Удаление всех сессий пользователя
     */
    AuthService.destroyUserSessions = function (userId) {
        return __awaiter(this, void 0, Promise, function () {
            var result, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('🔐 [AuthService] Destroying all sessions for user:', userId);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, 5, 7]);
                        return [4 /*yield*/, prisma_1.prisma.$connect()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, prisma_1.prisma.session.deleteMany({
                                where: { userId: userId }
                            })];
                    case 3:
                        result = _a.sent();
                        console.log('✅ [AuthService] Deleted sessions count:', result.count);
                        return [3 /*break*/, 7];
                    case 4:
                        error_5 = _a.sent();
                        console.error('❌ [AuthService] Error destroying user sessions:', error_5);
                        throw error_5;
                    case 5: return [4 /*yield*/, prisma_1.prisma.$disconnect()];
                    case 6:
                        _a.sent();
                        return [7 /*endfinally*/];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Проверка здоровья подключения к БД
     */
    AuthService.checkDatabaseHealth = function () {
        return __awaiter(this, void 0, Promise, function () {
            var startTime, latency, error_6;
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
                        console.log('✅ [AuthService] Database health check passed, latency:', latency + 'ms');
                        return [2 /*return*/, { connected: true, latency: latency }];
                    case 3:
                        error_6 = _a.sent();
                        console.error('❌ [AuthService] Database health check failed:', error_6);
                        return [2 /*return*/, {
                                connected: false,
                                error: error_6 instanceof Error ? error_6.message : 'Unknown error'
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Очистка истекших сессий
     */
    AuthService.cleanupExpiredSessions = function () {
        return __awaiter(this, void 0, Promise, function () {
            var result, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('🧹 [AuthService] Cleaning up expired sessions...');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, 5, 7]);
                        return [4 /*yield*/, prisma_1.prisma.$connect()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, prisma_1.prisma.session.deleteMany({
                                where: {
                                    expiresAt: {
                                        lt: new Date()
                                    }
                                }
                            })];
                    case 3:
                        result = _a.sent();
                        console.log('✅ [AuthService] Cleaned up expired sessions:', result.count);
                        return [2 /*return*/, result.count];
                    case 4:
                        error_7 = _a.sent();
                        console.error('❌ [AuthService] Error cleaning up sessions:', error_7);
                        throw error_7;
                    case 5: return [4 /*yield*/, prisma_1.prisma.$disconnect()];
                    case 6:
                        _a.sent();
                        return [7 /*endfinally*/];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Получение статистики активных сессий
     */
    AuthService.getSessionStats = function () {
        return __awaiter(this, void 0, Promise, function () {
            var now, _a, totalSessions, activeSessions, expiredSessions, uniqueUsers, error_8;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, 4, 6]);
                        return [4 /*yield*/, prisma_1.prisma.$connect()];
                    case 1:
                        _b.sent();
                        now = new Date();
                        return [4 /*yield*/, Promise.all([
                                prisma_1.prisma.session.count(),
                                prisma_1.prisma.session.count({
                                    where: { expiresAt: { gte: now } }
                                }),
                                prisma_1.prisma.session.count({
                                    where: { expiresAt: { lt: now } }
                                }),
                                prisma_1.prisma.session.groupBy({
                                    by: ['userId'],
                                    where: { expiresAt: { gte: now } }
                                }).then(function (result) { return result.length; })
                            ])];
                    case 2:
                        _a = _b.sent(), totalSessions = _a[0], activeSessions = _a[1], expiredSessions = _a[2], uniqueUsers = _a[3];
                        return [2 /*return*/, {
                                totalSessions: totalSessions,
                                activeSessions: activeSessions,
                                expiredSessions: expiredSessions,
                                uniqueUsers: uniqueUsers
                            }];
                    case 3:
                        error_8 = _b.sent();
                        console.error('❌ [AuthService] Error getting session stats:', error_8);
                        throw error_8;
                    case 4: return [4 /*yield*/, prisma_1.prisma.$disconnect()];
                    case 5:
                        _b.sent();
                        return [7 /*endfinally*/];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Генерация безопасного токена
     */
    AuthService.generateToken = function () {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var token = '';
        for (var i = 0; i < 64; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    };
    /**
     * Проверка прав пользователя
     */
    AuthService.hasRole = function (user, requiredRole) {
        var roleHierarchy = {
            'USER': 1,
            'ADMIN': 2,
            'SUPER_ADMIN': 3
        };
        var userRoleLevel = roleHierarchy[user.role] || 0;
        var requiredRoleLevel = roleHierarchy[requiredRole];
        return userRoleLevel >= requiredRoleLevel;
    };
    /**
     * Обновление времени последнего входа пользователя
     */
    AuthService.updateLastLogin = function (userId) {
        return __awaiter(this, void 0, Promise, function () {
            var error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, 4, 6]);
                        return [4 /*yield*/, prisma_1.prisma.$connect()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, prisma_1.prisma.user.update({
                                where: { id: userId },
                                data: { lastLoginAt: new Date() }
                            })];
                    case 2:
                        _a.sent();
                        console.log('✅ [AuthService] Updated last login for user:', userId);
                        return [3 /*break*/, 6];
                    case 3:
                        error_9 = _a.sent();
                        console.error('❌ [AuthService] Error updating last login:', error_9);
                        return [3 /*break*/, 6];
                    case 4: return [4 /*yield*/, prisma_1.prisma.$disconnect()];
                    case 5:
                        _a.sent();
                        return [7 /*endfinally*/];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    return AuthService;
}());
exports.AuthService = AuthService;
var templateObject_1;
