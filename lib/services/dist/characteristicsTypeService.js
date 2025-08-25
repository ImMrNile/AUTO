"use strict";
// lib/services/characteristicsTypeService.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ
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
exports.characteristicsTypeService = exports.CharacteristicsTypeService = void 0;
var CharacteristicsTypeService = /** @class */ (function () {
    function CharacteristicsTypeService() {
    }
    /**
     * Анализ типов характеристик с помощью ИИ
     */
    CharacteristicsTypeService.prototype.analyzeCharacteristicTypes = function (characteristics, categoryName, parentCategoryName) {
        return __awaiter(this, void 0, Promise, function () {
            var prompt, response, parsedResult, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        console.log("\uD83D\uDD0D \u0410\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0443\u0435\u043C \u0442\u0438\u043F\u044B " + characteristics.length + " \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A \u0434\u043B\u044F \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438: " + categoryName);
                        prompt = this.createTypeAnalysisPrompt(characteristics, categoryName, parentCategoryName);
                        return [4 /*yield*/, this.sendTypeAnalysisToAI(prompt)];
                    case 1:
                        response = _a.sent();
                        parsedResult = this.parseTypeAnalysisResponse(response, characteristics);
                        console.log("\u2705 \u0410\u043D\u0430\u043B\u0438\u0437 \u0442\u0438\u043F\u043E\u0432 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D: " + parsedResult.characteristics.length + " \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A \u043F\u0440\u043E\u0430\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u043E");
                        return [2 /*return*/, parsedResult];
                    case 2:
                        error_1 = _a.sent();
                        console.error('❌ Ошибка анализа типов характеристик:', error_1);
                        // Fallback - используем базовую логику
                        return [2 /*return*/, this.createFallbackTypeAnalysis(characteristics)];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Создание промпта для анализа типов характеристик
     */
    CharacteristicsTypeService.prototype.createTypeAnalysisPrompt = function (characteristics, categoryName, parentCategoryName) {
        return "\u0412\u044B \u2014 \u044D\u043A\u0441\u043F\u0435\u0440\u0442 \u043F\u043E \u0430\u043D\u0430\u043B\u0438\u0437\u0443 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A \u0442\u043E\u0432\u0430\u0440\u043E\u0432 \u0434\u043B\u044F \u043C\u0430\u0440\u043A\u0435\u0442\u043F\u043B\u0435\u0439\u0441\u0430 Wildberries. \u0412\u0430\u0448\u0430 \u0437\u0430\u0434\u0430\u0447\u0430 \u2014 \u0442\u043E\u0447\u043D\u043E \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u0442\u0438\u043F \u0434\u0430\u043D\u043D\u044B\u0445 \u0434\u043B\u044F \u043A\u0430\u0436\u0434\u043E\u0439 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438.\n\n    \uD83C\uDFAF **\u041A\u0420\u0418\u0422\u0418\u0427\u0415\u0421\u041A\u0418 \u0412\u0410\u0416\u041D\u0410\u042F \u0417\u0410\u0414\u0410\u0427\u0410:**\n    \u0414\u043B\u044F \u043A\u0430\u0436\u0434\u043E\u0439 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438 \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u0435, \u043A\u0430\u043A\u043E\u0439 \u0442\u0438\u043F \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0442\u0440\u0435\u0431\u0443\u0435\u0442 WB API:\n\n    **\u0422\u0418\u041F\u042B \u0417\u041D\u0410\u0427\u0415\u041D\u0418\u0419:**\n    1. **pure_number** - \u0422\u041E\u041B\u042C\u041A\u041E \u0447\u0438\u0441\u0442\u043E\u0435 \u0447\u0438\u0441\u043B\u043E \u0431\u0435\u0437 \u0435\u0434\u0438\u043D\u0438\u0446 \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u044F (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: 50, 2.5, 1200)\n    2. **string_with_units** - \u0421\u0442\u0440\u043E\u043A\u0430 \u0441 \u0447\u0438\u0441\u043B\u043E\u043C \u0438 \u0435\u0434\u0438\u043D\u0438\u0446\u0430\u043C\u0438 \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u044F (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: \"2 \u0447\u0430\u0441\u0430\", \"50 \u0412\u0442\", \"3000 \u043C\u0410\u0447\")  \n    3. **string_only** - \u0422\u043E\u043B\u044C\u043A\u043E \u0442\u0435\u043A\u0441\u0442\u043E\u0432\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: \"\u041A\u0440\u0430\u0441\u043D\u044B\u0439\", \"\u041A\u0438\u0442\u0430\u0439\", \"\u0425\u043B\u043E\u043F\u043E\u043A\")\n\n    \uD83D\uDCC2 **\u041A\u0410\u0422\u0415\u0413\u041E\u0420\u0418\u042F \u0422\u041E\u0412\u0410\u0420\u0410:**\n    - **\u041E\u0441\u043D\u043E\u0432\u043D\u0430\u044F \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F:** " + parentCategoryName + "\n    - **\u041F\u043E\u0434\u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F:** " + categoryName + "\n\n    \uD83D\uDCCB **\u0425\u0410\u0420\u0410\u041A\u0422\u0415\u0420\u0418\u0421\u0422\u0418\u041A\u0418 \u0414\u041B\u042F \u0410\u041D\u0410\u041B\u0418\u0417\u0410:**\n    " + characteristics.slice(0, 50).map(function (char, index) {
            return index + 1 + ". **" + char.name + "** (ID: " + char.id + ")\n    - \u0422\u0438\u043F \u0432 \u0411\u0414: " + (char.type || 'не указан') + "\n    - \u041E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u0430\u044F: " + (char.isRequired ? 'да' : 'нет') + "\n    " + (char.values && char.values.length > 0 ?
                "- \u0412\u043E\u0437\u043C\u043E\u0436\u043D\u044B\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F: " + char.values.slice(0, 5).map(function (v) { return v.value || v; }).join(', ') + (char.values.length > 5 ? '...' : '') :
                '- Возможные значения: не ограничены') + "\n    " + (char.maxLength ? "- \u041C\u0430\u043A\u0441. \u0434\u043B\u0438\u043D\u0430: " + char.maxLength : '') + "\n    " + (char.minValue !== undefined ? "- \u041C\u0438\u043D. \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: " + char.minValue : '') + "\n    " + (char.maxValue !== undefined ? "- \u041C\u0430\u043A\u0441. \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: " + char.maxValue : '');
        }).join('\n\n') + "\n\n    \uD83D\uDD25 **\u041F\u0420\u0410\u0412\u0418\u041B\u0410 \u041E\u041F\u0420\u0415\u0414\u0415\u041B\u0415\u041D\u0418\u042F \u0422\u0418\u041F\u041E\u0412:**\n\n    **1. PURE_NUMBER (\u0447\u0438\u0441\u0442\u044B\u0435 \u0447\u0438\u0441\u043B\u0430):**\n    - \u041C\u043E\u0449\u043D\u043E\u0441\u0442\u044C \u0432 \u0432\u0430\u0442\u0442\u0430\u0445 \u2192 50 (\u043D\u0435 \"50 \u0412\u0442\")\n    - \u0412\u0435\u0441 \u0432 \u0433\u0440\u0430\u043C\u043C\u0430\u0445 \u2192 500 (\u043D\u0435 \"500 \u0433\")\n    - \u041E\u0431\u044A\u0435\u043C \u0432 \u043C\u043B \u2192 250 (\u043D\u0435 \"250 \u043C\u043B\")\n    - \u0427\u0430\u0441\u0442\u043E\u0442\u0430 \u0432 \u0413\u0446 \u2192 50 (\u043D\u0435 \"50 \u0413\u0446\")\n    - \u041D\u0430\u043F\u0440\u044F\u0436\u0435\u043D\u0438\u0435 \u0432 \u0432\u043E\u043B\u044C\u0442\u0430\u0445 \u2192 220 (\u043D\u0435 \"220 \u0412\")\n    - \u0420\u0430\u0437\u043C\u0435\u0440\u044B \u0432 \u0441\u043C \u2192 30 (\u043D\u0435 \"30 \u0441\u043C\")\n    - \u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0448\u0442\u0443\u043A \u2192 5 (\u043D\u0435 \"5 \u0448\u0442\")\n    - \u0412\u043E\u0437\u0440\u0430\u0441\u0442 \u0432 \u0433\u043E\u0434\u0430\u0445 \u2192 18 (\u043D\u0435 \"18 \u043B\u0435\u0442\")\n    - \u0412\u0435\u0440\u0441\u0438\u044F \u2192 5.2 (\u043D\u0435 \"\u0432\u0435\u0440\u0441\u0438\u044F 5.2\")\n\n    **2. STRING_WITH_UNITS (\u0441\u0442\u0440\u043E\u043A\u0438 \u0441 \u0435\u0434\u0438\u043D\u0438\u0446\u0430\u043C\u0438) - \u041A\u0420\u0418\u0422\u0418\u0427\u0415\u0421\u041A\u0418 \u0412\u0410\u0416\u041D\u041E:**\n    - **\u0412\u0440\u0435\u043C\u044F \u0437\u0430\u0440\u044F\u0434\u043A\u0438 (ID: 13491)** \u2192 \"2 \u0447\u0430\u0441\u0430\" \u0438\u043B\u0438 \"120 \u043C\u0438\u043D\u0443\u0442\" (\u041D\u0415 \u0427\u0418\u0421\u041B\u041E!)\n    - **\u0412\u0440\u0435\u043C\u044F \u0440\u0430\u0431\u043E\u0442\u044B \u043E\u0442 \u0430\u043A\u043A\u0443\u043C\u0443\u043B\u044F\u0442\u043E\u0440\u0430 (ID: 90746)** \u2192 \"8 \u0447\u0430\u0441\u043E\u0432\" \u0438\u043B\u0438 \"480 \u043C\u0438\u043D\u0443\u0442\" (\u041D\u0415 \u0427\u0418\u0421\u041B\u041E!)\n    - **\u0415\u043C\u043A\u043E\u0441\u0442\u044C \u0430\u043A\u043A\u0443\u043C\u0443\u043B\u044F\u0442\u043E\u0440\u0430 (ID: 90878)** \u2192 \"3000 \u043C\u0410\u0447\" \u0438\u043B\u0438 \"\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E\" (\u041D\u0415 \u0427\u0418\u0421\u041B\u041E!)\n    - **\u0415\u043C\u043A\u043E\u0441\u0442\u044C \u0431\u0430\u0442\u0430\u0440\u0435\u0438 (ID: 5482)** \u2192 \"5000 \u043C\u0410\u0447\" \u0438\u043B\u0438 \"\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E\" (\u041D\u0415 \u0427\u0418\u0421\u041B\u041E!)\n    - \u0413\u0430\u0440\u0430\u043D\u0442\u0438\u0439\u043D\u044B\u0439 \u0441\u0440\u043E\u043A \u2192 \"12 \u043C\u0435\u0441\u044F\u0446\u0435\u0432\" \u0438\u043B\u0438 \"1 \u0433\u043E\u0434\"\n    - \u0421\u0440\u043E\u043A \u0441\u043B\u0443\u0436\u0431\u044B \u2192 \"5 \u043B\u0435\u0442\"\n    - \u041F\u0435\u0440\u0438\u043E\u0434 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u044F \u2192 \"\u043A\u0440\u0443\u0433\u043B\u043E\u0433\u043E\u0434\u0438\u0447\u043D\u043E\"\n    - \u0422\u0435\u043C\u043F\u0435\u0440\u0430\u0442\u0443\u0440\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C \u2192 \"\u043E\u0442 -10 \u0434\u043E +40\u00B0C\"\n    - \u0420\u0430\u0431\u043E\u0447\u0430\u044F \u0442\u0435\u043C\u043F\u0435\u0440\u0430\u0442\u0443\u0440\u0430 \u2192 \"18-25\u00B0C\"\n\n    **3. STRING_ONLY (\u0442\u043E\u043B\u044C\u043A\u043E \u0442\u0435\u043A\u0441\u0442):**\n    - \u0426\u0432\u0435\u0442 \u2192 \"\u041A\u0440\u0430\u0441\u043D\u044B\u0439\", \"\u0421\u0438\u043D\u0438\u0439\"\n    - \u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B \u2192 \"\u0425\u043B\u043E\u043F\u043E\u043A\", \"\u041F\u043B\u0430\u0441\u0442\u0438\u043A\"\n    - \u0411\u0440\u0435\u043D\u0434 \u2192 \"Samsung\", \"Apple\"\n    - \u0421\u0442\u0440\u0430\u043D\u0430 \u043F\u0440\u043E\u0438\u0437\u0432\u043E\u0434\u0441\u0442\u0432\u0430 \u2192 \"\u041A\u0438\u0442\u0430\u0439\", \"\u0420\u043E\u0441\u0441\u0438\u044F\"\n    - \u0422\u0438\u043F \u2192 \"\u0423\u043D\u0438\u0432\u0435\u0440\u0441\u0430\u043B\u044C\u043D\u044B\u0439\", \"\u0421\u043F\u043E\u0440\u0442\u0438\u0432\u043D\u044B\u0439\"\n    - \u041D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u2192 \"\u0414\u043B\u044F \u0434\u043E\u043C\u0430\", \"\u0414\u043B\u044F \u043E\u0444\u0438\u0441\u0430\"\n    - \u0421\u0435\u0437\u043E\u043D \u2192 \"\u041B\u0435\u0442\u043E\", \"\u0417\u0438\u043C\u0430\"\n\n    \uD83D\uDCE4 **\u0424\u041E\u0420\u041C\u0410\u0422 \u041E\u0422\u0412\u0415\u0422\u0410 (\u0441\u0442\u0440\u043E\u0433\u043E JSON):**\n    {\n    \"characteristics\": [\n        {\n        \"id\": 13491,\n        \"name\": \"\u0412\u0440\u0435\u043C\u044F \u0437\u0430\u0440\u044F\u0434\u043A\u0438\",\n        \"detectedType\": \"string_with_units\", \n        \"reasoning\": \"WB API \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0432\u0440\u0435\u043C\u044F \u0441 \u0435\u0434\u0438\u043D\u0438\u0446\u0430\u043C\u0438 \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u044F \u043A\u0430\u043A \u0441\u0442\u0440\u043E\u043A\u0443, \u041D\u0415 \u043A\u0430\u043A \u0447\u0438\u0441\u043B\u043E\",\n        \"expectedFormat\": \"\u0447\u0438\u0441\u043B\u043E + \u0435\u0434\u0438\u043D\u0438\u0446\u0430 \u0432\u0440\u0435\u043C\u0435\u043D\u0438\",\n        \"examples\": [\"2 \u0447\u0430\u0441\u0430\", \"180 \u043C\u0438\u043D\u0443\u0442\", \"3 \u0447\"],\n        \"confidence\": 0.95\n        },\n        {\n        \"id\": 90746,\n        \"name\": \"\u0412\u0440\u0435\u043C\u044F \u0440\u0430\u0431\u043E\u0442\u044B \u043E\u0442 \u0430\u043A\u043A\u0443\u043C\u0443\u043B\u044F\u0442\u043E\u0440\u0430, \u0434\u043E\",\n        \"detectedType\": \"string_with_units\",\n        \"reasoning\": \"WB API \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0432\u0440\u0435\u043C\u044F \u0440\u0430\u0431\u043E\u0442\u044B \u0441 \u0435\u0434\u0438\u043D\u0438\u0446\u0430\u043C\u0438 \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u044F \u043A\u0430\u043A \u0441\u0442\u0440\u043E\u043A\u0443, \u041D\u0415 \u043A\u0430\u043A \u0447\u0438\u0441\u043B\u043E\",\n        \"expectedFormat\": \"\u0447\u0438\u0441\u043B\u043E + \u0435\u0434\u0438\u043D\u0438\u0446\u0430 \u0432\u0440\u0435\u043C\u0435\u043D\u0438\",\n        \"examples\": [\"8 \u0447\u0430\u0441\u043E\u0432\", \"480 \u043C\u0438\u043D\u0443\u0442\", \"12 \u0447\"],\n        \"confidence\": 0.95\n        },\n        {\n        \"id\": 90878,\n        \"name\": \"\u0415\u043C\u043A\u043E\u0441\u0442\u044C \u0430\u043A\u043A\u0443\u043C\u0443\u043B\u044F\u0442\u043E\u0440\u0430\",\n        \"detectedType\": \"string_with_units\",\n        \"reasoning\": \"WB API \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0435\u043C\u043A\u043E\u0441\u0442\u044C \u0430\u043A\u043A\u0443\u043C\u0443\u043B\u044F\u0442\u043E\u0440\u0430 \u0441 \u0435\u0434\u0438\u043D\u0438\u0446\u0430\u043C\u0438 \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u044F \u043A\u0430\u043A \u0441\u0442\u0440\u043E\u043A\u0443, \u041D\u0415 \u043A\u0430\u043A \u0447\u0438\u0441\u043B\u043E\",\n        \"expectedFormat\": \"\u0447\u0438\u0441\u043B\u043E + \u043C\u0410\u0447 \u0438\u043B\u0438 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E\",\n        \"examples\": [\"3000 \u043C\u0410\u0447\", \"5000 \u043C\u0410\u0447\", \"\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E\"],\n        \"confidence\": 0.95\n        },\n        {\n        \"id\": 89008,\n        \"name\": \"\u0412\u0435\u0441 \u0442\u043E\u0432\u0430\u0440\u0430 \u0431\u0435\u0437 \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0438 (\u0433)\",\n        \"detectedType\": \"pure_number\",\n        \"reasoning\": \"WB API \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0432\u0435\u0441 \u0432 \u0433\u0440\u0430\u043C\u043C\u0430\u0445 \u043A\u0430\u043A \u0447\u0438\u0441\u0442\u043E\u0435 \u0447\u0438\u0441\u043B\u043E \u0431\u0435\u0437 \u0435\u0434\u0438\u043D\u0438\u0446 \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u044F\",\n        \"expectedFormat\": \"\u0447\u0438\u0441\u043B\u043E\",\n        \"examples\": [\"500\", \"1200\", \"750\"],\n        \"confidence\": 0.95\n        }\n    ],\n    \"totalAnalyzed\": 4,\n    \"confidence\": 0.95\n    }\n\n    \uD83D\uDEA8 **\u0412\u0410\u0416\u041D\u041E:**\n    - \u0410\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0443\u0439\u0442\u0435 \u041A\u0410\u0416\u0414\u0423\u042E \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0443 \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u043E\n    - \u0423\u0447\u0438\u0442\u044B\u0432\u0430\u0439\u0442\u0435 \u0441\u043F\u0435\u0446\u0438\u0444\u0438\u043A\u0443 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438 \u0442\u043E\u0432\u0430\u0440\u0430\n    - \u041E\u0431\u0440\u0430\u0449\u0430\u0439\u0442\u0435 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u0435 \u043D\u0430 \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u044B\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0438\u0437 \u0411\u0414\n    - Confidence \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0432\u044B\u0441\u043E\u043A\u0438\u043C (>0.8) \u0434\u043B\u044F \u0442\u043E\u0447\u043D\u044B\u0445 \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0439\n    - **ID 13491, 90746, 90878, 5482 \u0412\u0421\u0415\u0413\u0414\u0410 string_with_units!**\n\n    \u041E\u0442\u0432\u0435\u0442\u044C\u0442\u0435 \u0422\u041E\u041B\u042C\u041A\u041E \u0432\u0430\u043B\u0438\u0434\u043D\u044B\u043C JSON \u0431\u0435\u0437 \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0433\u043E \u0442\u0435\u043A\u0441\u0442\u0430.";
    };
    // Остальные методы без изменений...
    CharacteristicsTypeService.prototype.sendTypeAnalysisToAI = function (prompt) {
        var _a, _b;
        return __awaiter(this, void 0, Promise, function () {
            var response, data, result, error_2;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 3, , 4]);
                        console.log('🤖 Отправляем запрос анализа типов в ИИ...');
                        return [4 /*yield*/, fetch('https://api.openai.com/v1/chat/completions', {
                                method: 'POST',
                                headers: {
                                    'Authorization': "Bearer " + process.env.OPENAI_API_KEY,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    model: process.env.OPENAI_MODEL || 'gpt-4o',
                                    messages: [
                                        {
                                            role: 'user',
                                            content: prompt
                                        }
                                    ],
                                    temperature: 0.1,
                                    max_tokens: 4000,
                                    response_format: { type: "json_object" }
                                })
                            })];
                    case 1:
                        response = _c.sent();
                        if (!response.ok) {
                            throw new Error("OpenAI API error: " + response.status);
                        }
                        return [4 /*yield*/, response.json()];
                    case 2:
                        data = _c.sent();
                        result = (_b = (_a = data.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
                        if (!result) {
                            throw new Error('Пустой ответ от ИИ');
                        }
                        console.log('✅ Получен ответ анализа типов от ИИ');
                        return [2 /*return*/, result];
                    case 3:
                        error_2 = _c.sent();
                        console.error('❌ Ошибка отправки в ИИ:', error_2);
                        throw error_2;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    CharacteristicsTypeService.prototype.parseTypeAnalysisResponse = function (response, originalCharacteristics) {
        try {
            var cleanResponse = response
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
            var parsed = JSON.parse(cleanResponse);
            if (!parsed.characteristics || !Array.isArray(parsed.characteristics)) {
                throw new Error('Некорректная структура ответа ИИ');
            }
            var validatedCharacteristics = parsed.characteristics
                .filter(function (char) {
                return char.id &&
                    char.name &&
                    char.detectedType &&
                    ['pure_number', 'string_with_units', 'string_only'].includes(char.detectedType);
            })
                .map(function (char) { return ({
                id: char.id,
                name: char.name,
                detectedType: char.detectedType,
                reasoning: char.reasoning || 'Определено ИИ',
                expectedFormat: char.expectedFormat || 'не указан',
                examples: Array.isArray(char.examples) ? char.examples : [],
                confidence: Math.min(1.0, Math.max(0.1, char.confidence || 0.7))
            }); });
            var avgConfidence = validatedCharacteristics.length > 0
                ? validatedCharacteristics.reduce(function (sum, char) { return sum + char.confidence; }, 0) / validatedCharacteristics.length
                : 0.5;
            return {
                characteristics: validatedCharacteristics,
                totalAnalyzed: validatedCharacteristics.length,
                confidence: avgConfidence
            };
        }
        catch (error) {
            console.error('❌ Ошибка парсинга ответа ИИ по типам:', error);
            throw new Error('Не удалось обработать ответ ИИ по анализу типов');
        }
    };
    /**
     * Fallback анализ типов (базовая логика)
     */
    CharacteristicsTypeService.prototype.createFallbackTypeAnalysis = function (characteristics) {
        var _this = this;
        console.log('⚠️ Используем fallback анализ типов');
        var analyzedCharacteristics = characteristics.map(function (char) {
            var _a;
            var charName = char.name.toLowerCase();
            var detectedType = 'string_only';
            var reasoning = 'Определено базовой логикой';
            var expectedFormat = 'текст';
            var examples = [];
            // КРИТИЧЕСКИ ВАЖНО: Специальная обработка для времени и емкости
            if (char.id === 13491 || charName.includes('время зарядки')) {
                detectedType = 'string_with_units';
                reasoning = 'Время зарядки должно быть строкой с единицами измерения';
                expectedFormat = 'число + единица времени';
                examples = ['2 часа', '120 минут', '3 ч'];
            }
            else if (char.id === 90746 || charName.includes('время работы')) {
                detectedType = 'string_with_units';
                reasoning = 'Время работы должно быть строкой с единицами измерения';
                expectedFormat = 'число + единица времени';
                examples = ['8 часов', '480 минут', '12 ч'];
            }
            else if (char.id === 90878 || char.id === 5482 || charName.includes('емкость аккумулятора') || charName.includes('емкость батареи')) {
                detectedType = 'string_with_units';
                reasoning = 'Емкость аккумулятора должна быть строкой с единицами измерения';
                expectedFormat = 'число + мАч или не указано';
                examples = ['3000 мАч', '5000 мАч', 'не указано'];
            }
            // ЧИСТЫЕ ЧИСЛА
            else if (_this.isPureNumberCharacteristic(charName, char.id)) {
                detectedType = 'pure_number';
                reasoning = 'Характеристика требует чистое число без единиц измерения';
                expectedFormat = 'число';
                examples = _this.getPureNumberExamples(charName);
            }
            // СТРОКИ С ЕДИНИЦАМИ (кроме времени и емкости, которые уже обработаны выше)
            else if (_this.isStringWithUnitsCharacteristic(charName)) {
                detectedType = 'string_with_units';
                reasoning = 'Характеристика требует число с единицами измерения';
                expectedFormat = 'число + единица измерения';
                examples = _this.getStringWithUnitsExamples(charName);
            }
            // ТОЛЬКО СТРОКИ
            else {
                detectedType = 'string_only';
                reasoning = 'Характеристика принимает только текстовые значения';
                expectedFormat = 'текст';
                examples = ((_a = char.values) === null || _a === void 0 ? void 0 : _a.slice(0, 3).map(function (v) { return v.value || v; })) || ['Значение 1', 'Значение 2'];
            }
            return {
                id: char.id,
                name: char.name,
                detectedType: detectedType,
                reasoning: reasoning,
                expectedFormat: expectedFormat,
                examples: examples,
                confidence: 0.7
            };
        });
        return {
            characteristics: analyzedCharacteristics,
            totalAnalyzed: analyzedCharacteristics.length,
            confidence: 0.7
        };
    };
    /**
     * Проверка на чистое число (ОБНОВЛЕНО: исключаем время и емкость аккумулятора)
     */
    CharacteristicsTypeService.prototype.isPureNumberCharacteristic = function (charName, charId) {
        // Известные ID числовых характеристик (БЕЗ времени и емкости аккумулятора)
        var knownNumericIds = [
            89008,
            89064,
            90630,
            90652,
            90607,
            90608,
            5478,
            5479,
            5481,
            // УБРАЛИ: 5482 - Емкость батареи (теперь строка!)
            // УБРАЛИ: 90878 - Емкость аккумулятора (теперь строка!)
            72739,
            65666,
            65667,
            63292 // Импеданс
        ];
        if (knownNumericIds.includes(charId)) {
            return true;
        }
        // Проверка по названию (БЕЗ времени и емкости аккумулятора)
        var pureNumberPatterns = [
            /^вес\s*(товара|без|в)?\s*(упаковки|граммах|г|кг)?$/i,
            /^(длин|ширин|высот|глубин)\w*(\s*предмета|\s*в\s*см)?$/i,
            /^мощность\w*(\s*в\s*вт|\s*ватт)?$/i,
            /^напряжен\w*(\s*в\s*в|\s*вольт)?$/i,
            /^частот\w*(\s*в\s*гц|\s*герц)?$/i,
            /^диаметр\w*(\s*в\s*мм|\s*мм)?$/i,
            /^импеданс\w*(\s*ом)?$/i,
            /^количество(\s*штук|\s*шт)?$/i,
            /^объем\w*(\s*в\s*мл|\s*л)?$/i,
            /^температур\w*(\s*в\s*градус)?$/i
            // УБРАЛИ: /^емкост\w*\s*батаре\w*(\s*в\s*мач|\s*mah)?$/i
        ];
        return pureNumberPatterns.some(function (pattern) { return pattern.test(charName); });
    };
    /**
     * Проверка на строку с единицами (ОБНОВЛЕНО: добавили емкость аккумулятора)
     */
    CharacteristicsTypeService.prototype.isStringWithUnitsCharacteristic = function (charName) {
        var stringWithUnitsPatterns = [
            /^гарантийн\w*\s*срок/i,
            /^срок\s*(службы|эксплуатации)/i,
            /^период\s*использования/i,
            /^рабочая\s*температура/i,
            /^температурный\s*режим/i,
            /^продолжительность/i,
            // ДОБАВИЛИ: емкость аккумулятора и батареи
            /^емкост\w*\s*(аккумулятор|батаре)/i
        ];
        return stringWithUnitsPatterns.some(function (pattern) { return pattern.test(charName); });
    };
    /**
     * Примеры для чистых чисел
     */
    CharacteristicsTypeService.prototype.getPureNumberExamples = function (charName) {
        if (charName.includes('вес'))
            return ['500', '1200', '250'];
        if (charName.includes('мощность'))
            return ['50', '100', '1500'];
        if (charName.includes('напряжение'))
            return ['220', '110', '12'];
        if (charName.includes('частота'))
            return ['50', '60', '2400'];
        if (charName.includes('длина') || charName.includes('ширина') || charName.includes('высота'))
            return ['30', '25', '15'];
        if (charName.includes('количество'))
            return ['1', '2', '5'];
        if (charName.includes('объем'))
            return ['500', '1000', '250'];
        return ['10', '50', '100'];
    };
    /**
     * Примеры для строк с единицами
     */
    CharacteristicsTypeService.prototype.getStringWithUnitsExamples = function (charName) {
        if (charName.includes('гарантия') || charName.includes('гарантийный'))
            return ['12 месяцев', '1 год', '24 месяца'];
        if (charName.includes('срок службы'))
            return ['5 лет', '10 лет', '3 года'];
        if (charName.includes('температура'))
            return ['-10 до +40°C', '18-25°C', '0-50°C'];
        if (charName.includes('емкость'))
            return ['3000 мАч', '5000 мАч', 'не указано'];
        return ['значение с единицами', 'например: 2 часа', '10-20 единиц'];
    };
    /**
     * ИСПРАВЛЕННОЕ получение типа характеристики по ID
     */
    CharacteristicsTypeService.prototype.getCharacteristicType = function (characteristicId, typeAnalysis) {
        if (typeAnalysis) {
            var analysis = typeAnalysis.characteristics.find(function (char) { return char.id === characteristicId; });
            if (analysis) {
                return analysis.detectedType;
            }
        }
        // КРИТИЧЕСКИ ВАЖНО: Время зарядки, время работы и емкость аккумулятора ВСЕГДА строки с единицами
        if (characteristicId === 13491 || characteristicId === 90746 || characteristicId === 90878 || characteristicId === 5482) {
            return 'string_with_units';
        }
        // Fallback проверка для чистых чисел (БЕЗ времени и емкости аккумулятора)
        var knownPureNumbers = [
            89008, 89064, 90630, 90652, 90607, 90608, 90673,
            63292, 65667, 65666, 75146, 65668,
            5478, 5479, 5481 // Электрические характеристики (БЕЗ 5482!)
        ];
        if (knownPureNumbers.includes(characteristicId)) {
            return 'pure_number';
        }
        // Другие строковые характеристики с единицами
        var knownStringWithUnits = [
            6234, 6235, 6236, 6237, 9623, 167966 // Другие временные характеристики
        ];
        if (knownStringWithUnits.includes(characteristicId)) {
            return 'string_with_units';
        }
        return 'string_only';
    };
    return CharacteristicsTypeService;
}());
exports.CharacteristicsTypeService = CharacteristicsTypeService;
exports.characteristicsTypeService = new CharacteristicsTypeService();
