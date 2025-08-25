"use strict";
// lib/services/enhancedTypingProcessor.ts - УЛУЧШЕННЫЙ ПРОЦЕССОР ТИПИЗАЦИИ
exports.__esModule = true;
exports.unifiedCharacteristicsService = exports.UnifiedCharacteristicsService = void 0;
var UnifiedCharacteristicsService = /** @class */ (function () {
    function UnifiedCharacteristicsService() {
    }
    /**
     * ГЛАВНАЯ ФУНКЦИЯ - улучшенная обработка типизации с правилами
     */
    UnifiedCharacteristicsService.prototype.processCharacteristicsWithEnhancedTyping = function (aiCharacteristics, categoryCharacteristics) {
        console.log('🔧 ENHANCED TYPING: Обработка характеристик с улучшенной типизацией');
        var processed = [];
        var typingRules = this.getTypingRules();
        var _loop_1 = function (aiChar) {
            var dbChar = categoryCharacteristics.find(function (c) { return c.id === aiChar.id; });
            if (!dbChar)
                return "continue";
            console.log("\n\uD83D\uDD0D PROCESSING: " + dbChar.name + " (ID: " + aiChar.id + ")");
            console.log("   \uD83D\uDCCA DB Type: " + dbChar.type);
            console.log("   \uD83C\uDFAF AI Value: \"" + aiChar.value + "\"");
            var processedChar = this_1.applyEnhancedTyping(aiChar, dbChar, typingRules);
            if (processedChar) {
                processed.push(processedChar);
                console.log("   \u2705 RESULT: " + JSON.stringify(processedChar.value) + " (" + dbChar.type + ")");
            }
        };
        var this_1 = this;
        for (var _i = 0, aiCharacteristics_1 = aiCharacteristics; _i < aiCharacteristics_1.length; _i++) {
            var aiChar = aiCharacteristics_1[_i];
            _loop_1(aiChar);
        }
        return processed;
    };
    /**
     * ПРАВИЛА ТИПИЗАЦИИ для различных характеристик
     */
    UnifiedCharacteristicsService.prototype.getTypingRules = function () {
        var rules = new Map();
        // ВРЕМЯ ЗАРЯДКИ
        rules.set('время_зарядки', {
            pattern: /время.*зарядк/i,
            stringFormat: function (value) {
                if (value === 1)
                    return '1 час';
                if (value === 2)
                    return '2 часа';
                if (value <= 4)
                    return value + " \u0447\u0430\u0441\u0430";
                if (value <= 10)
                    return value + " \u0447\u0430\u0441\u043E\u0432";
                if (value <= 120)
                    return value + " \u043C\u0438\u043D\u0443\u0442";
                return Math.round(value / 60) + " \u0447\u0430\u0441\u043E\u0432";
            },
            examples: ['1 час', '2 часа', '3 часа', '120 минут']
        });
        // ВРЕМЯ РАБОТЫ
        rules.set('время_работы', {
            pattern: /время.*работ|автономн/i,
            stringFormat: function (value) {
                if (value === 1)
                    return '1 час';
                if (value <= 4)
                    return value + " \u0447\u0430\u0441\u0430";
                if (value <= 100)
                    return value + " \u0447\u0430\u0441\u043E\u0432";
                return Math.round(value / 60) + " \u0447\u0430\u0441\u043E\u0432";
            },
            examples: ['8 часов', '60 часов', '24 часа']
        });
        // ЕМКОСТЬ АККУМУЛЯТОРА
        rules.set('емкость', {
            pattern: /емкость/i,
            stringFormat: function (value) {
                if (value >= 100)
                    return value + " \u043C\u0410\u0447";
                return value * 1000 + " \u043C\u0410\u0447";
            },
            examples: ['400 мАч', '3000 мАч', '5000 мАч']
        });
        // ИМПЕДАНС
        rules.set('импеданс', {
            pattern: /импеданс/i,
            stringFormat: function (value) { return value + " \u041E\u043C"; },
            examples: ['16 Ом', '32 Ом', '64 Ом']
        });
        // ЧАСТОТА
        rules.set('частота', {
            pattern: /частота/i,
            stringFormat: function (value) {
                if (value >= 1000)
                    return value / 1000 + " \u043A\u0413\u0446";
                return value + " \u0413\u0446";
            },
            examples: ['20 Гц', '1 кГц', '20 кГц']
        });
        // ЧУВСТВИТЕЛЬНОСТЬ
        rules.set('чувствительность', {
            pattern: /чувствительност/i,
            stringFormat: function (value) { return value + " \u0434\u0411"; },
            examples: ['100 дБ', '104 дБ', '110 дБ']
        });
        // МОЩНОСТЬ
        rules.set('мощность', {
            pattern: /мощность/i,
            stringFormat: function (value) { return value + " \u0412\u0442"; },
            examples: ['5 Вт', '10 Вт', '20 Вт']
        });
        // НАПРЯЖЕНИЕ
        rules.set('напряжение', {
            pattern: /напряжен/i,
            stringFormat: function (value) { return value + " \u0412"; },
            examples: ['3.7 В', '5 В', '12 В']
        });
        // ГАРАНТИЙНЫЙ СРОК
        rules.set('гарантия', {
            pattern: /гарантия|срок/i,
            stringFormat: function (value) {
                if (value >= 12) {
                    var years = Math.round(value / 12);
                    if (years === 1)
                        return '1 год';
                    if (years <= 4)
                        return years + " \u0433\u043E\u0434\u0430";
                    return years + " \u043B\u0435\u0442";
                }
                if (value === 1)
                    return '1 месяц';
                if (value <= 4)
                    return value + " \u043C\u0435\u0441\u044F\u0446\u0430";
                return value + " \u043C\u0435\u0441\u044F\u0446\u0435\u0432";
            },
            examples: ['6 месяцев', '1 год', '2 года']
        });
        return rules;
    };
    /**
     * ПРИМЕНЕНИЕ УЛУЧШЕННОЙ ТИПИЗАЦИИ
     */
    UnifiedCharacteristicsService.prototype.applyEnhancedTyping = function (aiChar, dbChar, typingRules) {
        var name = dbChar.name;
        var type = dbChar.type;
        var value = aiChar.value;
        // Находим подходящее правило типизации
        var applicableRule = this.findApplicableRule(name, typingRules);
        if (type === 'string') {
            // ДЛЯ СТРОКОВЫХ ПОЛЕЙ - добавляем единицы измерения
            var processedValue = this.processStringValue(value, applicableRule, name);
            return {
                id: aiChar.id,
                name: name,
                type: 'string',
                value: processedValue,
                confidence: aiChar.confidence || 0.8,
                source: aiChar.source || 'Enhanced Typing',
                reasoning: "STRING \u0442\u0438\u043F: " + (applicableRule ? 'применено правило типизации' : 'обработано как строка')
            };
        }
        else if (type === 'number') {
            // ДЛЯ ЧИСЛОВЫХ ПОЛЕЙ - извлекаем чистое число
            var processedValue = this.processNumberValue(value, name);
            if (processedValue !== null) {
                return {
                    id: aiChar.id,
                    name: name,
                    type: 'number',
                    value: processedValue,
                    confidence: aiChar.confidence || 0.8,
                    source: aiChar.source || 'Enhanced Typing',
                    reasoning: "NUMBER \u0442\u0438\u043F: \u0438\u0437\u0432\u043B\u0435\u0447\u0435\u043D\u043E \u0447\u0438\u0441\u0442\u043E\u0435 \u0447\u0438\u0441\u043B\u043E"
                };
            }
        }
        return null;
    };
    /**
     * ПОИСК ПРИМЕНИМОГО ПРАВИЛА
     */
    UnifiedCharacteristicsService.prototype.findApplicableRule = function (name, rules) {
        for (var _i = 0, rules_1 = rules; _i < rules_1.length; _i++) {
            var _a = rules_1[_i], key = _a[0], rule = _a[1];
            if (rule.pattern.test(name)) {
                console.log("   \uD83C\uDFAF \u041D\u0430\u0439\u0434\u0435\u043D\u043E \u043F\u0440\u0430\u0432\u0438\u043B\u043E: " + key);
                return rule;
            }
        }
        return null;
    };
    /**
     * ОБРАБОТКА СТРОКОВЫХ ЗНАЧЕНИЙ с правилами
     */
    UnifiedCharacteristicsService.prototype.processStringValue = function (value, rule, name) {
        var stringValue = String(value).trim();
        // Если единицы уже есть - возвращаем как есть
        if (this.hasUnits(stringValue)) {
            console.log("   \u2705 \u0415\u0434\u0438\u043D\u0438\u0446\u044B \u0443\u0436\u0435 \u0435\u0441\u0442\u044C: \"" + stringValue + "\"");
            return stringValue;
        }
        // Если есть правило типизации - применяем его
        if (rule) {
            var numValue = this.extractNumber(stringValue);
            if (numValue !== null) {
                var formatted = rule.stringFormat(numValue);
                console.log("   \uD83D\uDD27 \u041F\u0440\u0438\u043C\u0435\u043D\u0435\u043D\u043E \u043F\u0440\u0430\u0432\u0438\u043B\u043E: \"" + stringValue + "\" \u2192 \"" + formatted + "\"");
                return formatted;
            }
        }
        // Общие правила для строк без специальных правил
        return this.applyGeneralStringRules(stringValue, name);
    };
    /**
     * ОБРАБОТКА ЧИСЛОВЫХ ЗНАЧЕНИЙ
     */
    UnifiedCharacteristicsService.prototype.processNumberValue = function (value, name) {
        if (typeof value === 'number') {
            console.log("   \uD83D\uDD22 \u0423\u0436\u0435 \u0447\u0438\u0441\u043B\u043E: " + value);
            return value;
        }
        var extracted = this.extractNumber(String(value));
        if (extracted !== null) {
            console.log("   \uD83D\uDD22 \u0418\u0437\u0432\u043B\u0435\u0447\u0435\u043D\u043E \u0447\u0438\u0441\u043B\u043E: \"" + value + "\" \u2192 " + extracted);
            return extracted;
        }
        console.warn("   \u26A0\uFE0F \u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0438\u0437\u0432\u043B\u0435\u0447\u044C \u0447\u0438\u0441\u043B\u043E \u0438\u0437: \"" + value + "\"");
        return null;
    };
    /**
     * ИЗВЛЕЧЕНИЕ ЧИСЛА из строки
     */
    UnifiedCharacteristicsService.prototype.extractNumber = function (value) {
        // Удаляем все кроме цифр, точек и запятых
        var cleaned = value.replace(/[^\d.,]/g, '').replace(/,/g, '.');
        // Ищем первое число
        var match = cleaned.match(/(\d+(?:\.\d+)?)/);
        if (match) {
            var num = parseFloat(match[1]);
            if (!isNaN(num)) {
                return num;
            }
        }
        return null;
    };
    /**
     * ПРОВЕРКА НАЛИЧИЯ ЕДИНИЦ ИЗМЕРЕНИЯ
     */
    UnifiedCharacteristicsService.prototype.hasUnits = function (value) {
        var unitsPatterns = [
            // Время
            /\d+\s*(час|часов|часа|мин|минут|минуты|сек|секунд|ч|м|с)(\s|$)/i,
            /\d+\s*(год|года|лет|месяц|месяцев|месяца)(\s|$)/i,
            // Электрические характеристики
            /\d+\s*(мач|mah|мa·ч|ач|ah)(\s|$)/i,
            /\d+\s*(вт|ватт|w)(\s|$)/i,
            /\d+\s*(в|вольт|v)(\s|$)/i,
            /\d+\s*(ом|ohm|Ω)(\s|$)/i,
            // Частота и звук
            /\d+\s*(гц|hz|кгц|khz|мгц|mhz)(\s|$)/i,
            /\d+\s*(дб|db)(\s|$)/i,
            // Размеры
            /\d+\s*(см|мм|м|дм|км|дюйм)(\s|$)/i
        ];
        return unitsPatterns.some(function (pattern) { return pattern.test(value); });
    };
    /**
     * ОБЩИЕ ПРАВИЛА для строк без специальных правил
     */
    UnifiedCharacteristicsService.prototype.applyGeneralStringRules = function (value, name) {
        var nameLower = name.toLowerCase();
        var numValue = this.extractNumber(value);
        if (numValue === null) {
            console.log("   \uD83D\uDCDD \u041D\u0435\u0442 \u0447\u0438\u0441\u043B\u0430, \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u043C \u043A\u0430\u043A \u0441\u0442\u0440\u043E\u043A\u0443: \"" + value + "\"");
            return value;
        }
        // Дополнительные правила для неохваченных случаев
        if (nameLower.includes('диаметр') || nameLower.includes('размер')) {
            if (numValue <= 10)
                return numValue + " \u0441\u043C";
            return numValue + " \u043C\u043C";
        }
        if (nameLower.includes('вес') && !nameLower.includes('упаковк')) {
            if (numValue < 1)
                return numValue * 1000 + " \u0433";
            return numValue + " \u043A\u0433";
        }
        if (nameLower.includes('длина') || nameLower.includes('высота') || nameLower.includes('ширина')) {
            if (numValue <= 100)
                return numValue + " \u0441\u043C";
            return numValue + " \u043C\u043C";
        }
        console.log("   \uD83D\uDCDD \u041D\u0435\u043E\u043F\u043E\u0437\u043D\u0430\u043D\u043D\u0430\u044F \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0430, \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u043C: \"" + value + "\"");
        return value;
    };
    /**
     * ВАЛИДАЦИЯ ТИПИЗИРОВАННЫХ РЕЗУЛЬТАТОВ
     */
    UnifiedCharacteristicsService.prototype.validateTypedCharacteristics = function (characteristics) {
        console.log('\n🔍 ВАЛИДАЦИЯ типизированных характеристик...');
        var valid = [];
        var invalid = [];
        for (var _i = 0, characteristics_1 = characteristics; _i < characteristics_1.length; _i++) {
            var char = characteristics_1[_i];
            var errors = [];
            // Проверка типа
            if (char.type === 'string' && typeof char.value !== 'string') {
                errors.push("\u041E\u0436\u0438\u0434\u0430\u0435\u0442\u0441\u044F string, \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E " + typeof char.value);
            }
            if (char.type === 'number' && typeof char.value !== 'number') {
                errors.push("\u041E\u0436\u0438\u0434\u0430\u0435\u0442\u0441\u044F number, \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E " + typeof char.value);
            }
            // Проверка наличия единиц для строковых полей с числовыми значениями
            if (char.type === 'string' && typeof char.value === 'string') {
                var hasNumber = this.extractNumber(char.value) !== null;
                var hasUnits = this.hasUnits(char.value);
                if (hasNumber && !hasUnits && this.needsUnits(char.name)) {
                    errors.push("\u0427\u0438\u0441\u043B\u043E\u0432\u0430\u044F \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0430 \u0431\u0435\u0437 \u0435\u0434\u0438\u043D\u0438\u0446 \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u044F");
                }
            }
            if (errors.length === 0) {
                valid.push(char);
                console.log("   \u2705 \u0412\u0410\u041B\u0418\u0414\u041D\u0410\u042F: " + char.name + " = " + JSON.stringify(char.value));
            }
            else {
                invalid.push({ char: char, errors: errors });
                console.log("   \u274C \u041D\u0415\u0412\u0410\u041B\u0418\u0414\u041D\u0410\u042F: " + char.name + " - " + errors.join(', '));
            }
        }
        var summary = {
            totalProcessed: characteristics.length,
            validCount: valid.length,
            invalidCount: invalid.length,
            stringCount: valid.filter(function (c) { return c.type === 'string'; }).length,
            numberCount: valid.filter(function (c) { return c.type === 'number'; }).length
        };
        console.log("\n\uD83D\uDCCA \u0412\u0410\u041B\u0418\u0414\u0410\u0426\u0418\u042F \u0417\u0410\u0412\u0415\u0420\u0428\u0415\u041D\u0410:");
        console.log("   \u2705 \u0412\u0430\u043B\u0438\u0434\u043D\u044B\u0445: " + summary.validCount);
        console.log("   \u274C \u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u044B\u0445: " + summary.invalidCount);
        console.log("   \uD83D\uDCDD \u0421\u0442\u0440\u043E\u043A\u043E\u0432\u044B\u0445: " + summary.stringCount);
        console.log("   \uD83D\uDD22 \u0427\u0438\u0441\u043B\u043E\u0432\u044B\u0445: " + summary.numberCount);
        return { valid: valid, invalid: invalid, summary: summary };
    };
    /**
     * ПРОВЕРКА необходимости единиц измерения
     */
    UnifiedCharacteristicsService.prototype.needsUnits = function (name) {
        var nameLower = name.toLowerCase();
        var needsUnitsKeywords = [
            'время', 'емкость', 'импеданс', 'частота', 'чувствительност',
            'мощность', 'напряжен', 'гарантия', 'срок', 'диаметр', 'размер'
        ];
        return needsUnitsKeywords.some(function (keyword) { return nameLower.includes(keyword); });
    };
    /**
     * ДЕМОНСТРАЦИЯ правил типизации
     */
    UnifiedCharacteristicsService.prototype.demonstrateTypingRules = function () {
        console.log('\n🎯 ДЕМОНСТРАЦИЯ ПРАВИЛ ТИПИЗАЦИИ:');
        var rules = this.getTypingRules();
        var _loop_2 = function (key, rule) {
            console.log("\n\uD83D\uDCCB " + key.toUpperCase() + ":");
            console.log("   \uD83D\uDD0D \u041F\u0430\u0442\u0442\u0435\u0440\u043D: " + rule.pattern);
            console.log("   \uD83D\uDCDD \u041F\u0440\u0438\u043C\u0435\u0440\u044B: " + rule.examples.join(', '));
            // Демонстрируем работу правила
            var testValues = [1, 2, 8, 32, 400, 20000];
            console.log("   \uD83E\uDDEA \u0422\u0435\u0441\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435:");
            testValues.forEach(function (val) {
                try {
                    var result = rule.stringFormat(val);
                    console.log("      " + val + " \u2192 \"" + result + "\"");
                }
                catch (e) {
                    console.log("      " + val + " \u2192 \u043E\u0448\u0438\u0431\u043A\u0430");
                }
            });
        };
        for (var _i = 0, rules_2 = rules; _i < rules_2.length; _i++) {
            var _a = rules_2[_i], key = _a[0], rule = _a[1];
            _loop_2(key, rule);
        }
    };
    /**
     * ФОРМАТИРОВАНИЕ для WB API с правильными типами
     */
    UnifiedCharacteristicsService.prototype.formatForWB = function (characteristics) {
        console.log('\n📦 ФОРМАТИРОВАНИЕ для WB API...');
        return characteristics.map(function (char) {
            var wbValue;
            if (char.type === 'number') {
                wbValue = char.value; // Числа как есть
                console.log("   \uD83D\uDD22 " + char.name + ": " + wbValue);
            }
            else {
                wbValue = [char.value]; // Строки в массиве
                console.log("   \uD83D\uDCDD " + char.name + ": " + JSON.stringify(wbValue));
            }
            return {
                id: char.id,
                value: wbValue
            };
        });
    };
    /**
     * ИСПРАВЛЕНИЕ проблемных значений ПЕРЕД типизацией
     */
    UnifiedCharacteristicsService.prototype.fixCommonIssues = function (value, name) {
        var nameLower = name.toLowerCase();
        // Время зарядки: исправляем "2 минуты" на "2 часа"
        if (nameLower.includes('время зарядки')) {
            if (value === '2 минуты' || value === '2 минут') {
                console.log("\uD83D\uDD27 \u0418\u0421\u041F\u0420\u0410\u0412\u041B\u0415\u041D\u041E: \"" + value + "\" \u2192 \"2 \u0447\u0430\u0441\u0430\"");
                return '2 часа';
            }
        }
        // Емкость: исправляем малые значения
        if (nameLower.includes('емкость')) {
            var num = this.extractNumber(String(value));
            if (num !== null && num < 10) {
                console.log("\uD83D\uDD27 \u0418\u0421\u041F\u0420\u0410\u0412\u041B\u0415\u041D\u041E \u0435\u043C\u043A\u043E\u0441\u0442\u044C: \"" + value + "\" \u2192 \"" + num * 1000 + " \u043C\u0410\u0447\"");
                return num * 1000 + " \u043C\u0410\u0447";
            }
        }
        // Частота: преобразуем кГц в Гц
        if (nameLower.includes('частота') && String(value).toLowerCase().includes('кгц')) {
            var num = this.extractNumber(String(value));
            if (num !== null) {
                console.log("\uD83D\uDD27 \u0418\u0421\u041F\u0420\u0410\u0412\u041B\u0415\u041D\u041E \u0447\u0430\u0441\u0442\u043E\u0442\u0430: \"" + value + "\" \u2192 \"" + num * 1000 + " \u0413\u0446\"");
                return num * 1000 + " \u0413\u0446";
            }
        }
        return value;
    };
    return UnifiedCharacteristicsService;
}());
exports.UnifiedCharacteristicsService = UnifiedCharacteristicsService;
exports.unifiedCharacteristicsService = new UnifiedCharacteristicsService();
