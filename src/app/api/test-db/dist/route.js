"use strict";
// src/app/api/test-db/route.ts
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
exports.GET = void 0;
var server_1 = require("next/server");
var prisma_1 = require("../../../../lib/prisma");
function GET() {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var results, error_1, error_2, userCount, error_3, cabinetCount, error_4, sessionCount, error_5, hasErrors, error_6, e_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 17, 18, 22]);
                    console.log('🧪 [DB Test] Тестирование подключения к базе данных...');
                    results = {
                        connectionTest: null,
                        queryTest: null,
                        userCount: null,
                        cabinetCount: null,
                        sessionCount: null,
                        error: null
                    };
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    // 1. Тест подключения
                    console.log('1️⃣ Тестируем $connect()...');
                    return [4 /*yield*/, prisma_1.prisma.$connect()];
                case 2:
                    _c.sent();
                    results.connectionTest = 'SUCCESS';
                    console.log('✅ $connect() успешно');
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _c.sent();
                    console.error('❌ $connect() ошибка:', error_1);
                    results.connectionTest = 'FAILED: ' + error_1.message;
                    results.error = error_1.message;
                    return [3 /*break*/, 4];
                case 4:
                    _c.trys.push([4, 6, , 7]);
                    // 2. Тест простого запроса
                    console.log('2️⃣ Тестируем $queryRaw...');
                    return [4 /*yield*/, prisma_1.prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["SELECT 1 as test"], ["SELECT 1 as test"])))];
                case 5:
                    _c.sent();
                    results.queryTest = 'SUCCESS';
                    console.log('✅ $queryRaw успешно');
                    return [3 /*break*/, 7];
                case 6:
                    error_2 = _c.sent();
                    console.error('❌ $queryRaw ошибка:', error_2);
                    results.queryTest = 'FAILED: ' + error_2.message;
                    if (!results.error)
                        results.error = error_2.message;
                    return [3 /*break*/, 7];
                case 7:
                    _c.trys.push([7, 9, , 10]);
                    // 3. Тест подсчета пользователей
                    console.log('3️⃣ Тестируем count users...');
                    return [4 /*yield*/, prisma_1.prisma.user.count()];
                case 8:
                    userCount = _c.sent();
                    results.userCount = userCount;
                    console.log("\u2705 \u041D\u0430\u0439\u0434\u0435\u043D\u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439: " + userCount);
                    return [3 /*break*/, 10];
                case 9:
                    error_3 = _c.sent();
                    console.error('❌ count users ошибка:', error_3);
                    results.userCount = 'FAILED: ' + error_3.message;
                    if (!results.error)
                        results.error = error_3.message;
                    return [3 /*break*/, 10];
                case 10:
                    _c.trys.push([10, 12, , 13]);
                    // 4. Тест подсчета кабинетов
                    console.log('4️⃣ Тестируем count cabinets...');
                    return [4 /*yield*/, prisma_1.prisma.cabinet.count()];
                case 11:
                    cabinetCount = _c.sent();
                    results.cabinetCount = cabinetCount;
                    console.log("\u2705 \u041D\u0430\u0439\u0434\u0435\u043D\u043E \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u043E\u0432: " + cabinetCount);
                    return [3 /*break*/, 13];
                case 12:
                    error_4 = _c.sent();
                    console.error('❌ count cabinets ошибка:', error_4);
                    results.cabinetCount = 'FAILED: ' + error_4.message;
                    if (!results.error)
                        results.error = error_4.message;
                    return [3 /*break*/, 13];
                case 13:
                    _c.trys.push([13, 15, , 16]);
                    // 5. Тест подсчета сессий
                    console.log('5️⃣ Тестируем count sessions...');
                    return [4 /*yield*/, prisma_1.prisma.session.count()];
                case 14:
                    sessionCount = _c.sent();
                    results.sessionCount = sessionCount;
                    console.log("\u2705 \u041D\u0430\u0439\u0434\u0435\u043D\u043E \u0441\u0435\u0441\u0441\u0438\u0439: " + sessionCount);
                    return [3 /*break*/, 16];
                case 15:
                    error_5 = _c.sent();
                    console.error('❌ count sessions ошибка:', error_5);
                    results.sessionCount = 'FAILED: ' + error_5.message;
                    if (!results.error)
                        results.error = error_5.message;
                    return [3 /*break*/, 16];
                case 16:
                    hasErrors = Object.values(results).some(function (v) {
                        return typeof v === 'string' && v.includes('FAILED');
                    });
                    console.log("\uD83E\uDDEA [DB Test] \u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0442\u0435\u0441\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F: " + (hasErrors ? 'ЕСТЬ ОШИБКИ' : 'ВСЕ РАБОТАЕТ'));
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: !hasErrors,
                            message: hasErrors ? 'Есть проблемы с подключением к БД' : 'База данных работает корректно',
                            results: results,
                            timestamp: new Date().toISOString(),
                            databaseUrl: (_a = process.env.DATABASE_URL) === null || _a === void 0 ? void 0 : _a.replace(/:[^:@]*@/, ':***@'),
                            recommendations: hasErrors ? [
                                'Проверьте правильность DATABASE_URL в .env.local',
                                'Убедитесь что используется порт 5432 вместо 6543',
                                'Проверьте доступность сервера aws-1-eu-north-1.pooler.supabase.com',
                                'Попробуйте выполнить: npm run db:deploy или npx prisma db push'
                            ] : []
                        })];
                case 17:
                    error_6 = _c.sent();
                    console.error('🧪 [DB Test] Критическая ошибка:', error_6);
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: false,
                            message: 'Критическая ошибка тестирования БД',
                            error: error_6.message,
                            code: error_6.code,
                            timestamp: new Date().toISOString(),
                            databaseUrl: (_b = process.env.DATABASE_URL) === null || _b === void 0 ? void 0 : _b.replace(/:[^:@]*@/, ':***@'),
                            recommendations: [
                                'Проверьте .env.local файл',
                                'Убедитесь что DATABASE_URL корректен',
                                'Попробуйте перезапустить сервер разработки',
                                'Проверьте доступность Supabase'
                            ]
                        }, { status: 500 })];
                case 18:
                    _c.trys.push([18, 20, , 21]);
                    return [4 /*yield*/, prisma_1.prisma.$disconnect()];
                case 19:
                    _c.sent();
                    return [3 /*break*/, 21];
                case 20:
                    e_1 = _c.sent();
                    console.warn('Предупреждение при отключении от БД:', e_1);
                    return [3 /*break*/, 21];
                case 21: return [7 /*endfinally*/];
                case 22: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
var templateObject_1;
