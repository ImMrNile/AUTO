'use client';
"use strict";
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
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
// Кеш категорий в памяти
var categoriesCache = [];
var cacheTimestamp = 0;
var CACHE_DURATION = 5 * 60 * 1000; // 5 минут
function CategorySelector(_a) {
    var _this = this;
    var onCategorySelect = _a.onCategorySelect, selectedCategoryId = _a.selectedCategoryId, productName = _a.productName;
    var _b = react_1.useState(''), query = _b[0], setQuery = _b[1];
    var _c = react_1.useState([]), categories = _c[0], setCategories = _c[1];
    var _d = react_1.useState(false), isLoading = _d[0], setIsLoading = _d[1];
    var _e = react_1.useState(false), hasSearched = _e[0], setHasSearched = _e[1];
    var _f = react_1.useState(''), error = _f[0], setError = _f[1];
    var _g = react_1.useState(false), isDropdownOpen = _g[0], setIsDropdownOpen = _g[1];
    // Debounce hook
    var useDebounce = function (value, delay) {
        var _a = react_1.useState(value), debouncedValue = _a[0], setDebouncedValue = _a[1];
        react_1.useEffect(function () {
            var handler = setTimeout(function () {
                setDebouncedValue(value);
            }, delay);
            return function () {
                clearTimeout(handler);
            };
        }, [value, delay]);
        return debouncedValue;
    };
    var debouncedQuery = useDebounce(query, 300);
    // Автопоиск при изменении названия товара
    react_1.useEffect(function () {
        if (productName && productName.trim().length > 2 && !selectedCategoryId) {
            var trimmedName = productName.trim();
            console.log('🚀 Автопоиск категории для товара:', trimmedName);
            // Очищаем предыдущий поиск
            setQuery('');
            setCategories([]);
            setHasSearched(false);
            // Запускаем автопоиск
            performSmartSearch(trimmedName, true);
            setHasSearched(true);
        }
        else if (productName && productName.trim().length <= 2) {
            // Очищаем поиск если название товара слишком короткое
            setQuery('');
            setCategories([]);
            setHasSearched(false);
        }
    }, [productName, selectedCategoryId]);
    // Поиск при изменении запроса (ручной поиск)
    react_1.useEffect(function () {
        if (debouncedQuery && debouncedQuery.length > 2) {
            performSmartSearch(debouncedQuery, false);
            setHasSearched(true);
        }
        else if (debouncedQuery === '' && hasSearched && productName.trim().length > 2) {
            // Если пользователь очистил поиск, возвращаемся к автопоиску по названию товара
            performSmartSearch(productName.trim(), true);
        }
    }, [debouncedQuery, hasSearched, productName]);
    // Умный поиск категорий
    var performSmartSearch = function (searchQuery, isAutoSearch) {
        if (isAutoSearch === void 0) { isAutoSearch = false; }
        return __awaiter(_this, void 0, void 0, function () {
            var apiResponse, apiData, bestMatch_1, demoResults, bestMatch_2, e_1, demoResults;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!searchQuery || searchQuery.length < 2)
                            return [2 /*return*/];
                        setIsLoading(true);
                        setError('');
                        setIsDropdownOpen(true);
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 6, 8, 9]);
                        console.log("\uD83C\uDFAF " + (isAutoSearch ? 'Автопоиск' : 'Ручной поиск') + " \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438: \"" + searchQuery + "\"");
                        return [4 /*yield*/, fetch("/api/categories?action=search&search=" + encodeURIComponent(searchQuery) + "&limit=20")];
                    case 2:
                        apiResponse = _b.sent();
                        if (!apiResponse.ok) return [3 /*break*/, 4];
                        return [4 /*yield*/, apiResponse.json()];
                    case 3:
                        apiData = _b.sent();
                        if ((apiData === null || apiData === void 0 ? void 0 : apiData.success) && ((_a = apiData.data) === null || _a === void 0 ? void 0 : _a.length) > 0) {
                            console.log("\u2705 API \u043F\u043E\u0438\u0441\u043A: \u043D\u0430\u0439\u0434\u0435\u043D\u043E " + apiData.data.length + " \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0439");
                            setCategories(apiData.data);
                            // Автовыбор лучшего результата для автопоиска
                            if (isAutoSearch && !selectedCategoryId && apiData.data.length > 0) {
                                bestMatch_1 = findBestMatch(apiData.data, searchQuery);
                                if (bestMatch_1) {
                                    console.log('🎯 Автовыбор категории:', bestMatch_1.name);
                                    setTimeout(function () {
                                        onCategorySelect(bestMatch_1);
                                        setIsDropdownOpen(false);
                                    }, 800);
                                }
                            }
                            setError('');
                            return [2 /*return*/];
                        }
                        _b.label = 4;
                    case 4:
                        // Fallback: демо-данные
                        console.log('🔄 API недоступен, используем демо-данные');
                        return [4 /*yield*/, performDemoSearch(searchQuery)];
                    case 5:
                        demoResults = _b.sent();
                        if (demoResults.length > 0) {
                            setCategories(demoResults);
                            // Автовыбор для демо-поиска
                            if (isAutoSearch && !selectedCategoryId) {
                                bestMatch_2 = findBestMatch(demoResults, searchQuery);
                                if (bestMatch_2) {
                                    console.log('🎯 Автовыбор (демо-поиск):', bestMatch_2.name);
                                    setTimeout(function () {
                                        onCategorySelect(bestMatch_2);
                                        setIsDropdownOpen(false);
                                    }, 1000);
                                }
                            }
                        }
                        else {
                            setCategories([]);
                            setError("\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B \u043F\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0443 \"" + searchQuery + "\"");
                        }
                        return [3 /*break*/, 9];
                    case 6:
                        e_1 = _b.sent();
                        console.error('❌ Ошибка поиска категорий:', e_1);
                        setError('Проблема с поиском. Попробуйте еще раз.');
                        setCategories([]);
                        return [4 /*yield*/, performDemoSearch(searchQuery)];
                    case 7:
                        demoResults = _b.sent();
                        if (demoResults.length > 0) {
                            setCategories(demoResults);
                            setError('');
                        }
                        return [3 /*break*/, 9];
                    case 8:
                        setIsLoading(false);
                        return [7 /*endfinally*/];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    // Демо-поиск по ключевым словам
    var performDemoSearch = function (searchQuery) { return __awaiter(_this, void 0, Promise, function () {
        var mockCategories, queryLower, results;
        return __generator(this, function (_a) {
            mockCategories = [
                {
                    id: 1,
                    name: 'Наушники и гарнитуры',
                    slug: 'naushniki-garnitury',
                    parentId: 100,
                    parentName: 'Электроника',
                    displayName: 'Электроника → Наушники и гарнитуры',
                    wbSubjectId: 515,
                    commissions: { fbw: 15, fbs: 12, dbs: 10, cc: 8, edbs: 14, booking: 5 }
                },
                {
                    id: 2,
                    name: 'Беспроводные наушники',
                    slug: 'besprovodnye-naushniki',
                    parentId: 1,
                    parentName: 'Наушники и гарнитуры',
                    displayName: 'Электроника → Наушники → Беспроводные наушники',
                    wbSubjectId: 516,
                    commissions: { fbw: 15, fbs: 12, dbs: 10, cc: 8, edbs: 14, booking: 5 }
                },
                {
                    id: 3,
                    name: 'Проводные наушники',
                    slug: 'provodnye-naushniki',
                    parentId: 1,
                    parentName: 'Наушники и гарнитуры',
                    displayName: 'Электроника → Наушники → Проводные наушники',
                    wbSubjectId: 517,
                    commissions: { fbw: 15, fbs: 12, dbs: 10, cc: 8, edbs: 14, booking: 5 }
                },
                {
                    id: 4,
                    name: 'Кроссовки',
                    slug: 'krossovki',
                    parentId: 200,
                    parentName: 'Обувь',
                    displayName: 'Обувь → Кроссовки',
                    wbSubjectId: 1025,
                    commissions: { fbw: 18, fbs: 15, dbs: 12, cc: 10, edbs: 16, booking: 6 }
                },
                {
                    id: 5,
                    name: 'Футболки',
                    slug: 'futbolki',
                    parentId: 300,
                    parentName: 'Одежда',
                    displayName: 'Одежда → Футболки',
                    wbSubjectId: 629,
                    commissions: { fbw: 16, fbs: 13, dbs: 11, cc: 9, edbs: 15, booking: 5 }
                },
                {
                    id: 6,
                    name: 'Телефоны',
                    slug: 'telefony',
                    parentId: 100,
                    parentName: 'Электроника',
                    displayName: 'Электроника → Телефоны',
                    wbSubjectId: 1234,
                    commissions: { fbw: 12, fbs: 10, dbs: 8, cc: 6, edbs: 11, booking: 4 }
                }
            ];
            queryLower = searchQuery.toLowerCase();
            results = mockCategories.filter(function (cat) {
                var nameMatch = cat.name.toLowerCase().includes(queryLower);
                var parentMatch = cat.parentName.toLowerCase().includes(queryLower);
                var displayMatch = cat.displayName.toLowerCase().includes(queryLower);
                return nameMatch || parentMatch || displayMatch;
            });
            return [2 /*return*/, results.slice(0, 10)]; // Ограничиваем результат
        });
    }); };
    // Поиск лучшего совпадения для автовыбора
    var findBestMatch = react_1.useCallback(function (results, searchQuery) {
        if (results.length === 0)
            return null;
        var queryLower = searchQuery.toLowerCase();
        // Ищем точное совпадение в названии
        var exactMatch = results.find(function (cat) {
            return cat.name.toLowerCase() === queryLower;
        });
        if (exactMatch)
            return exactMatch;
        // Ищем совпадение начала названия
        var startMatch = results.find(function (cat) {
            return cat.name.toLowerCase().startsWith(queryLower);
        });
        if (startMatch)
            return startMatch;
        // Ищем по ключевым словам
        var keywords = extractKeywords(searchQuery);
        var priorityKeywords = ['наушники', 'телефон', 'обувь', 'одежда', 'кроссовки'];
        var _loop_1 = function (keyword) {
            if (keywords.includes(keyword)) {
                var keywordMatch = results.find(function (cat) {
                    return cat.name.toLowerCase().includes(keyword.toLowerCase());
                });
                if (keywordMatch)
                    return { value: keywordMatch };
            }
        };
        // Сначала ищем по приоритетным ключевым словам
        for (var _i = 0, priorityKeywords_1 = priorityKeywords; _i < priorityKeywords_1.length; _i++) {
            var keyword = priorityKeywords_1[_i];
            var state_1 = _loop_1(keyword);
            if (typeof state_1 === "object")
                return state_1.value;
        }
        // Возвращаем первый результат
        return results[0];
    }, []);
    // Извлечение ключевых слов
    var extractKeywords = function (productName) {
        return productName.toLowerCase()
            .split(/[\s\-_]+/)
            .filter(function (word) { return word.length > 2; })
            .filter(function (word) { return !['для', 'своих', 'новый', 'хороший'].includes(word); })
            .slice(0, 5);
    };
    var clearSearch = react_1.useCallback(function () {
        setQuery('');
        setCategories([]);
        setHasSearched(false);
        setError('');
        setIsDropdownOpen(false);
        // Возвращаемся к автопоиску по названию товара
        if (productName.trim().length > 2) {
            performSmartSearch(productName.trim(), true);
        }
    }, [productName]);
    var selectedCategory = categories.find(function (cat) { return cat.id === selectedCategoryId; }) || null;
    return (react_1["default"].createElement("div", { className: "space-y-3" },
        react_1["default"].createElement("div", { className: "relative" },
            react_1["default"].createElement("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" },
                react_1["default"].createElement(lucide_react_1.Search, { className: "h-4 w-4 text-gray-400" })),
            react_1["default"].createElement("input", { type: "text", value: query, onChange: function (e) {
                    setQuery(e.target.value);
                    if (e.target.value.length > 0) {
                        setIsDropdownOpen(true);
                    }
                }, onFocus: function () {
                    if (categories.length > 0) {
                        setIsDropdownOpen(true);
                    }
                }, placeholder: (productName === null || productName === void 0 ? void 0 : productName.length) > 2
                    ? "\u041F\u043E\u0438\u0441\u043A \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438... (\u0430\u0432\u0442\u043E\u043F\u043E\u0434\u0431\u043E\u0440 \u043F\u043E \u00AB" + productName.slice(0, 20) + "\u2026\u00BB)"
                    : 'Введите название товара — и начните поиск', className: "glass-input w-full pl-10 pr-4" }),
            isLoading && (react_1["default"].createElement("div", { className: "absolute right-3 top-1/2 transform -translate-y-1/2" },
                react_1["default"].createElement("div", { className: "loading-spinner w-4 h-4" })))),
        react_1["default"].createElement("div", { className: "flex items-center gap-2 text-gray-400 text-xs" },
            react_1["default"].createElement(lucide_react_1.Search, { className: "w-3 h-3" }),
            react_1["default"].createElement("span", null, error ? error :
                !isLoading && !categories.length && hasSearched && (query || productName).length > 2 ?
                    "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E \u043F\u043E \u00AB" + (query || productName).slice(0, 30) + "\u2026\u00BB" :
                    !(productName && productName.trim().length > 2) ?
                        'Введите название товара выше — мы подберём категории автоматически' :
                        'Поиск категорий...')),
        selectedCategory && (react_1["default"].createElement("div", { className: "glass-container p-4 border border-green-400/30 bg-green-400/10" },
            react_1["default"].createElement("div", { className: "flex items-center justify-between" },
                react_1["default"].createElement("div", { className: "flex-1" },
                    react_1["default"].createElement("div", { className: "font-medium text-green-100 text-sm" }, selectedCategory.displayName),
                    react_1["default"].createElement("div", { className: "text-xs text-green-300 mt-1" },
                        "\u041A\u043E\u043C\u0438\u0441\u0441\u0438\u044F WB: FBW ",
                        selectedCategory.commissions.fbw,
                        "% \u2022 ID: ",
                        selectedCategory.wbSubjectId || selectedCategory.id)),
                react_1["default"].createElement("button", { onClick: function () {
                        onCategorySelect(null);
                        clearSearch();
                    }, className: "ml-3 p-1 text-green-400 hover:text-green-300 transition-colors" },
                    react_1["default"].createElement(lucide_react_1.X, { className: "w-4 h-4" }))))),
        isDropdownOpen && categories.length > 0 && !selectedCategory && (react_1["default"].createElement("div", { className: "absolute z-50 w-full mt-2 max-h-60 overflow-y-auto glass-container border border-blue-400/30" },
            react_1["default"].createElement("div", { className: "p-2" },
                react_1["default"].createElement("h4", { className: "text-sm font-medium text-gray-300 mb-2 px-2" },
                    "\u041D\u0430\u0439\u0434\u0435\u043D\u043D\u044B\u0435 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438 (",
                    categories.length,
                    "):"),
                categories.map(function (category) { return (react_1["default"].createElement("div", { key: category.id, onClick: function () {
                        console.log('✅ Выбрана категория:', category.name);
                        onCategorySelect(category);
                        setIsDropdownOpen(false);
                        setQuery('');
                    }, className: "p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-blue-600/20 border border-transparent hover:border-blue-500/30" },
                    react_1["default"].createElement("div", { className: "font-medium text-white text-sm" }, category.displayName),
                    react_1["default"].createElement("div", { className: "text-xs text-gray-400 mt-1" },
                        "\u041A\u043E\u043C\u0438\u0441\u0441\u0438\u044F: ",
                        category.commissions.fbw,
                        "% \u2022 WB ID: ",
                        category.wbSubjectId || category.id))); })))),
        isDropdownOpen && (react_1["default"].createElement("div", { className: "fixed inset-0 z-40", onClick: function () { return setIsDropdownOpen(false); } }))));
}
exports["default"] = CategorySelector;
