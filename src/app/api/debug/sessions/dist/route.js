"use strict";
// src/app/api/debug/sessions/route.ts
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
exports.GET = void 0;
var server_1 = require("next/server");
var prisma_1 = require("../../../../../lib/prisma");
var headers_1 = require("next/headers");
function GET(request) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var cookieStore, sessionToken_1, allSessions, allUsers, now_1, activeSessions_1, expiredSessions, currentUserSession, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    console.log('🔍 [Session Debug] Отладка сессий...');
                    cookieStore = headers_1.cookies();
                    sessionToken_1 = (_a = cookieStore.get('session_token')) === null || _a === void 0 ? void 0 : _a.value;
                    return [4 /*yield*/, prisma_1.prisma.session.findMany({
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        email: true,
                                        name: true,
                                        isActive: true
                                    }
                                }
                            },
                            orderBy: { createdAt: 'desc' },
                            take: 20 // Последние 20 сессий
                        })];
                case 1:
                    allSessions = _b.sent();
                    return [4 /*yield*/, prisma_1.prisma.user.findMany({
                            select: {
                                id: true,
                                email: true,
                                name: true,
                                supabaseId: true,
                                isActive: true,
                                lastLoginAt: true,
                                createdAt: true
                            },
                            orderBy: { lastLoginAt: 'desc' },
                            take: 10 // Последние 10 пользователей
                        })];
                case 2:
                    allUsers = _b.sent();
                    now_1 = new Date();
                    activeSessions_1 = allSessions.filter(function (s) { return s.expiresAt > now_1; });
                    expiredSessions = allSessions.filter(function (s) { return s.expiresAt <= now_1; });
                    currentUserSession = sessionToken_1 ? allSessions.find(function (s) { return s.token === sessionToken_1; }) : null;
                    console.log('🔍 [Session Debug] Статистика:', {
                        totalSessions: allSessions.length,
                        activeSessions: activeSessions_1.length,
                        expiredSessions: expiredSessions.length,
                        currentSessionFound: !!currentUserSession
                    });
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            debug: {
                                currentCookie: {
                                    hasToken: !!sessionToken_1,
                                    tokenPreview: sessionToken_1 ? sessionToken_1.substring(0, 10) + '...' : null,
                                    isFoundInDB: !!currentUserSession,
                                    sessionStatus: currentUserSession
                                        ? (currentUserSession.expiresAt > now_1 ? 'ACTIVE' : 'EXPIRED')
                                        : 'NOT_FOUND'
                                },
                                statistics: {
                                    totalSessions: allSessions.length,
                                    activeSessions: activeSessions_1.length,
                                    expiredSessions: expiredSessions.length,
                                    totalUsers: allUsers.length,
                                    activeUsers: allUsers.filter(function (u) { return u.isActive; }).length
                                },
                                recentSessions: allSessions.map(function (s) { return ({
                                    id: s.id,
                                    tokenPreview: s.token.substring(0, 10) + '...',
                                    userId: s.userId,
                                    userEmail: s.user.email,
                                    isActive: s.expiresAt > now_1,
                                    expiresAt: s.expiresAt.toISOString(),
                                    createdAt: s.createdAt.toISOString(),
                                    ipAddress: s.ipAddress,
                                    isCurrent: s.token === sessionToken_1
                                }); }),
                                users: allUsers.map(function (u) {
                                    var _a;
                                    return ({
                                        id: u.id,
                                        email: u.email,
                                        name: u.name,
                                        supabaseId: u.supabaseId,
                                        isActive: u.isActive,
                                        lastLoginAt: (_a = u.lastLoginAt) === null || _a === void 0 ? void 0 : _a.toISOString(),
                                        createdAt: u.createdAt.toISOString(),
                                        hasActiveSessions: activeSessions_1.some(function (s) { return s.userId === u.id; })
                                    });
                                })
                            },
                            recommendations: !currentUserSession ? [
                                'Текущая сессия не найдена в БД',
                                'Выполните POST /api/auth/repair-session для восстановления',
                                'Или войдите заново через Telegram'
                            ] : currentUserSession.expiresAt <= now_1 ? [
                                'Текущая сессия истекла',
                                'Выполните POST /api/auth/repair-session для обновления'
                            ] : []
                        })];
                case 3:
                    error_1 = _b.sent();
                    console.error('❌ [Session Debug] Ошибка:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: false,
                            error: 'Ошибка отладки сессий',
                            details: error_1 instanceof Error ? error_1.message : 'Неизвестная ошибка'
                        }, { status: 500 })];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
