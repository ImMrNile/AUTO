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
var navigation_1 = require("next/navigation");
// Импортируем существующий компонент ProductForm
var ProductForm_1 = require("./components/ProductForm/ProductForm");
// Компонент анимированного фона
var AnimatedBackground = function () { return (React.createElement(React.Fragment, null,
    React.createElement("div", { className: "animated-background" }),
    React.createElement("div", { className: "floating-shapes" },
        React.createElement("div", { className: "floating-shape shape-1" }),
        React.createElement("div", { className: "floating-shape shape-2" }),
        React.createElement("div", { className: "floating-shape shape-3" })))); };
// Основной компонент страницы
function HomePage() {
    var _this = this;
    var searchParams = navigation_1.useSearchParams();
    var router = navigation_1.useRouter();
    var _a = react_1.useState('upload'), activeTab = _a[0], setActiveTab = _a[1];
    react_1.useEffect(function () {
        var tab = searchParams === null || searchParams === void 0 ? void 0 : searchParams.get('tab');
        if (tab && ['upload', 'products', 'cabinets', 'analytics'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);
    var handleTabChange = function (tab) {
        setActiveTab(tab);
        var url = new URL(window.location.href);
        url.searchParams.set('tab', tab);
        router.push(url.pathname + url.search);
    };
    var loadStats = function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            try {
                console.log('Обновление данных...');
            }
            catch (e) {
                console.error('Ошибка обновления данных:', e);
            }
            return [2 /*return*/];
        });
    }); };
    var tabs = [
        {
            id: 'upload',
            label: 'Создать',
            icon: lucide_react_1.Plus,
            description: 'Новый товар'
        },
        {
            id: 'products',
            label: 'Товары',
            icon: lucide_react_1.Package,
            description: 'Управление'
        },
        {
            id: 'cabinets',
            label: 'Кабинеты',
            icon: lucide_react_1.Users,
            description: 'Настройки'
        },
        {
            id: 'analytics',
            label: 'Аналитика',
            icon: lucide_react_1.BarChart3,
            description: 'Отчёты'
        },
    ];
    return (React.createElement(React.Fragment, null,
        React.createElement(AnimatedBackground, null),
        React.createElement("div", { className: "min-h-screen" },
            React.createElement("div", { className: "max-w-6xl mx-auto px-4 py-6" },
                React.createElement("div", { className: "text-center mb-8 fade-in" },
                    React.createElement("h1", { className: "text-4xl font-bold bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent mb-4" }, "WB Automation"),
                    React.createElement("p", { className: "text-xl text-gray-300" }, "\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u044F \u0440\u0430\u0431\u043E\u0442\u044B \u0441 Wildberries"),
                    React.createElement("div", { className: "flex items-center justify-center gap-6 mt-4 text-sm text-gray-400" },
                        React.createElement("span", { className: "flex items-center gap-2" },
                            React.createElement("div", { className: "w-2 h-2 bg-blue-400 rounded-full animate-pulse" }),
                            "\u0418\u0418-\u0430\u043D\u0430\u043B\u0438\u0437 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439"),
                        React.createElement("span", { className: "flex items-center gap-2" },
                            React.createElement("div", { className: "w-2 h-2 bg-purple-400 rounded-full animate-pulse" }),
                            "\u0410\u0432\u0442\u043E\u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A"),
                        React.createElement("span", { className: "flex items-center gap-2" },
                            React.createElement("div", { className: "w-2 h-2 bg-green-400 rounded-full animate-pulse" }),
                            "\u0413\u043E\u0442\u043E\u0432\u043E \u043A \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438"))),
                React.createElement("div", { className: "flex flex-wrap justify-center gap-2 mb-8 glass-container p-2 max-w-2xl mx-auto scale-in" }, tabs.map(function (tab) {
                    var IconComponent = tab.icon;
                    return (React.createElement("button", { key: tab.id, className: "flex-1 min-w-[120px] p-4 rounded-xl transition-all duration-300 " + (activeTab === tab.id
                            ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg scale-105'
                            : 'text-gray-300 hover:bg-black/30 hover:text-white'), onClick: function () { return handleTabChange(tab.id); } },
                        React.createElement("div", { className: "flex flex-col items-center gap-2" },
                            React.createElement(IconComponent, { size: 20 }),
                            React.createElement("div", { className: "text-sm font-semibold" }, tab.label),
                            React.createElement("div", { className: "text-xs opacity-70" }, tab.description))));
                })),
                activeTab === 'upload' && (React.createElement(ProductForm_1["default"], { onSuccess: loadStats })),
                activeTab === 'products' && (React.createElement("div", { className: "glass-container p-8 text-center fade-in" },
                    React.createElement(lucide_react_1.Package, { className: "w-16 h-16 mx-auto text-green-400 mb-4" }),
                    React.createElement("h2", { className: "text-2xl font-bold text-white mb-4" }, "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0442\u043E\u0432\u0430\u0440\u0430\u043C\u0438"),
                    React.createElement("p", { className: "text-gray-300 mb-6" }, "\u041F\u0440\u043E\u0441\u043C\u0430\u0442\u0440\u0438\u0432\u0430\u0439\u0442\u0435, \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u0443\u0439\u0442\u0435 \u0438 \u043F\u0443\u0431\u043B\u0438\u043A\u0443\u0439\u0442\u0435 \u0441\u043E\u0437\u0434\u0430\u043D\u043D\u044B\u0435 \u0442\u043E\u0432\u0430\u0440\u044B"),
                    React.createElement("div", { className: "glass-container p-6 bg-gray-800/20" },
                        React.createElement("div", { className: "text-gray-400" },
                            React.createElement(lucide_react_1.Package, { className: "w-12 h-12 mx-auto mb-4 opacity-50" }),
                            React.createElement("p", { className: "mb-4" }, "\u0423 \u0432\u0430\u0441 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0441\u043E\u0437\u0434\u0430\u043D\u043D\u044B\u0445 \u0442\u043E\u0432\u0430\u0440\u043E\u0432"),
                            React.createElement("button", { className: "glass-button-primary", onClick: function () { return handleTabChange('upload'); } },
                                React.createElement(lucide_react_1.Plus, { className: "w-4 h-4" }),
                                "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u0435\u0440\u0432\u044B\u0439 \u0442\u043E\u0432\u0430\u0440"))))),
                activeTab === 'cabinets' && (React.createElement("div", { className: "glass-container p-8 text-center fade-in" },
                    React.createElement(lucide_react_1.Users, { className: "w-16 h-16 mx-auto text-purple-400 mb-4" }),
                    React.createElement("h2", { className: "text-2xl font-bold text-white mb-4" }, "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0430\u043C\u0438"),
                    React.createElement("p", { className: "text-gray-300 mb-6" }, "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 \u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0430\u043C\u0438 Wildberries"),
                    React.createElement("div", { className: "space-y-4" },
                        React.createElement("button", { className: "glass-button-primary w-full py-4" },
                            React.createElement(lucide_react_1.Plus, { className: "w-5 h-5" }),
                            "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043A\u0430\u0431\u0438\u043D\u0435\u0442"),
                        React.createElement("div", { className: "glass-container p-6 bg-gray-800/20" },
                            React.createElement("div", { className: "text-gray-400" },
                                React.createElement(lucide_react_1.Users, { className: "w-12 h-12 mx-auto mb-4 opacity-50" }),
                                React.createElement("p", null, "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043F\u0435\u0440\u0432\u044B\u0439 \u043A\u0430\u0431\u0438\u043D\u0435\u0442 \u0434\u043B\u044F \u0440\u0430\u0431\u043E\u0442\u044B")))))),
                activeTab === 'analytics' && (React.createElement("div", { className: "glass-container p-8 fade-in" },
                    React.createElement("div", { className: "text-center mb-8" },
                        React.createElement(lucide_react_1.BarChart3, { className: "w-16 h-16 mx-auto text-orange-400 mb-4" }),
                        React.createElement("h2", { className: "text-2xl font-bold text-white mb-4" }, "\u0410\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430 \u0438 \u043E\u0442\u0447\u0451\u0442\u044B"),
                        React.createElement("p", { className: "text-gray-300" }, "\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430 \u043F\u0440\u043E\u0434\u0430\u0436, \u0430\u043D\u0430\u043B\u0438\u0437 \u044D\u0444\u0444\u0435\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438 \u0438 \u0434\u0435\u0442\u0430\u043B\u044C\u043D\u044B\u0435 \u043E\u0442\u0447\u0451\u0442\u044B")),
                    React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 mb-8" },
                        React.createElement("div", { className: "glass-container p-6" },
                            React.createElement("div", { className: "flex items-center gap-3 mb-4" },
                                React.createElement("div", { className: "w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center" },
                                    React.createElement(lucide_react_1.BarChart3, { className: "w-6 h-6 text-blue-400" })),
                                React.createElement("div", null,
                                    React.createElement("h3", { className: "font-semibold text-white text-lg" }, "\u041F\u0440\u043E\u0434\u0430\u0436\u0438"),
                                    React.createElement("p", { className: "text-sm text-gray-400" }, "\u0417\u0430 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 30 \u0434\u043D\u0435\u0439"))),
                            React.createElement("div", { className: "text-3xl font-bold text-white mb-2" }, "0 \u20BD"),
                            React.createElement("p", { className: "text-sm text-gray-400" }, "\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u0434\u043B\u044F \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F")),
                        React.createElement("div", { className: "glass-container p-6" },
                            React.createElement("div", { className: "flex items-center gap-3 mb-4" },
                                React.createElement("div", { className: "w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center" },
                                    React.createElement(lucide_react_1.Package, { className: "w-6 h-6 text-green-400" })),
                                React.createElement("div", null,
                                    React.createElement("h3", { className: "font-semibold text-white text-lg" }, "\u0422\u043E\u0432\u0430\u0440\u044B"),
                                    React.createElement("p", { className: "text-sm text-gray-400" }, "\u0412\u0441\u0435\u0433\u043E \u0441\u043E\u0437\u0434\u0430\u043D\u043E"))),
                            React.createElement("div", { className: "text-3xl font-bold text-white mb-2" }, "0"),
                            React.createElement("p", { className: "text-sm text-gray-400" }, "\u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043F\u0435\u0440\u0432\u044B\u0439 \u0442\u043E\u0432\u0430\u0440"))),
                    React.createElement("div", { className: "glass-container p-6 text-center bg-gray-800/20" },
                        React.createElement(lucide_react_1.BarChart3, { className: "w-12 h-12 mx-auto mb-4 opacity-50 text-gray-400" }),
                        React.createElement("p", { className: "text-gray-400" }, "\u0410\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430 \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u0442\u043E\u0432\u0430\u0440\u043E\u0432"))))))));
}
exports["default"] = HomePage;
