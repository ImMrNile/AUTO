"use strict";
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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
// Импорты компонентов шагов
var Step1BasicInfo_1 = require("./Step1BasicInfo");
var Step4Results_1 = require("./Step4Results");
// Начальное состояние формы
var initialFormData = {
    name: '',
    originalPrice: '',
    discountPrice: '',
    costPrice: '',
    packageContents: 'Товар - 1 шт., упаковка - 1 шт.',
    length: '',
    width: '',
    height: '',
    weight: '',
    referenceUrl: '',
    cabinetId: '',
    vendorCode: '',
    autoGenerateVendorCode: true,
    barcode: '',
    hasVariantSizes: false,
    variantSizes: [],
    description: '',
    mainImage: null,
    additionalImages: [],
    imageComments: ''
};
// Генерация EAN-13 штрихкода
function generateEAN13Barcode() {
    var code = '22';
    for (var i = 0; i < 10; i++) {
        code += Math.floor(Math.random() * 10);
    }
    var sum = 0;
    for (var i = 0; i < 12; i++) {
        var digit = parseInt(code[i]);
        sum += i % 2 === 0 ? digit : digit * 3;
    }
    var checkDigit = (10 - (sum % 10)) % 10;
    return code + checkDigit;
}
function ProductForm(_a) {
    var _this = this;
    var _b, _c, _d;
    var onSuccess = _a.onSuccess;
    // Состояния
    var _e = react_1.useState(1), currentStep = _e[0], setCurrentStep = _e[1];
    var _f = react_1.useState(initialFormData), formData = _f[0], setFormData = _f[1];
    var _g = react_1.useState(null), selectedImage = _g[0], setSelectedImage = _g[1];
    var _h = react_1.useState(''), imagePreview = _h[0], setImagePreview = _h[1];
    var _j = react_1.useState([]), additionalImages = _j[0], setAdditionalImages = _j[1];
    var _k = react_1.useState([]), additionalImagePreviews = _k[0], setAdditionalImagePreviews = _k[1];
    var _l = react_1.useState([]), cabinets = _l[0], setCabinets = _l[1];
    var _m = react_1.useState(null), selectedCategory = _m[0], setSelectedCategory = _m[1];
    var _o = react_1.useState(false), isSubmitting = _o[0], setIsSubmitting = _o[1];
    var _p = react_1.useState(null), processingStatus = _p[0], setProcessingStatus = _p[1];
    var _q = react_1.useState(''), error = _q[0], setError = _q[1];
    var _r = react_1.useState(''), success = _r[0], setSuccess = _r[1];
    var _s = react_1.useState(false), isLoadingCabinets = _s[0], setIsLoadingCabinets = _s[1];
    var _t = react_1.useState('pending'), aiAnalysisStatus = _t[0], setAiAnalysisStatus = _t[1];
    var _u = react_1.useState(null), aiAnalysisData = _u[0], setAiAnalysisData = _u[1];
    var _v = react_1.useState(''), createdProductId = _v[0], setCreatedProductId = _v[1];
    // useRef для хранения интервала polling
    var aiAnalysisPollingIntervalRef = react_1.useRef(null);
    // Загрузка кабинетов при монтировании
    react_1.useEffect(function () {
        console.log('🚀 Инициализация ProductForm');
        loadCabinets();
    }, []);
    // Очистка интервалов при размонтировании
    react_1.useEffect(function () {
        return function () {
            if (aiAnalysisPollingIntervalRef.current) {
                clearInterval(aiAnalysisPollingIntervalRef.current);
                aiAnalysisPollingIntervalRef.current = null;
            }
        };
    }, []);
    // Автогенерация кодов
    react_1.useEffect(function () {
        if (formData.autoGenerateVendorCode && formData.name.trim()) {
            generateVendorCode();
            generateBarcode();
        }
    }, [formData.autoGenerateVendorCode, formData.name]);
    // Проверяем статус AI-анализа при загрузке, если товар уже создан (только один раз)
    react_1.useEffect(function () {
        if (createdProductId && aiAnalysisStatus === 'pending') {
            console.log('🔄 Проверяем статус при загрузке для товара:', createdProductId);
            checkAiAnalysisStatus(createdProductId);
        }
    }, [createdProductId]); // Убираем aiAnalysisStatus из зависимостей
    // Принудительно обновляем статус при изменении aiAnalysisStatus
    react_1.useEffect(function () {
        if (aiAnalysisStatus === 'completed' && processingStatus && processingStatus.stage !== 'completed') {
            console.log('🔄 Обновляем processingStatus после завершения ИИ-анализа');
            setProcessingStatus({
                stage: 'completed',
                message: 'AI-анализ завершен успешно!',
                progress: 100,
                details: "\u0422\u043E\u0432\u0430\u0440 \u043F\u0440\u043E\u0430\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D. ID: " + createdProductId,
                currentStep: 'Завершено',
                totalSteps: 4
            });
        }
    }, [aiAnalysisStatus, processingStatus, createdProductId]);
    var loadCabinets = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, activeCabinets_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('📦 Загрузка кабинетов...');
                    setIsLoadingCabinets(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, 7, 8]);
                    return [4 /*yield*/, fetch('/api/cabinets', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'Cache-Control': 'no-cache'
                            },
                            credentials: 'include'
                        })];
                case 2:
                    response = _a.sent();
                    console.log('📡 Статус ответа API кабинетов:', response.status);
                    if (!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    console.log('📊 Данные от API:', data);
                    if (data.success && Array.isArray(data.cabinets)) {
                        activeCabinets_1 = data.cabinets.filter(function (c) { return c.isActive; });
                        setCabinets(activeCabinets_1);
                        console.log('✅ Загружено активных кабинетов:', activeCabinets_1.length);
                        // Автовыбор первого кабинета
                        if (activeCabinets_1.length > 0 && !formData.cabinetId) {
                            setFormData(function (prev) { return (__assign(__assign({}, prev), { cabinetId: activeCabinets_1[0].id })); });
                            console.log('🎯 Автовыбран кабинет:', activeCabinets_1[0].name);
                        }
                        setError('');
                        return [2 /*return*/];
                    }
                    else {
                        console.log('⚠️ API не вернул кабинеты или вернул неверный формат');
                        setCabinets([]);
                        setError('');
                    }
                    return [3 /*break*/, 5];
                case 4:
                    console.log('⚠️ API вернул ошибку:', response.status);
                    setCabinets([]);
                    setError('');
                    _a.label = 5;
                case 5: return [3 /*break*/, 8];
                case 6:
                    error_1 = _a.sent();
                    console.error('❌ Ошибка загрузки кабинетов:', error_1);
                    setCabinets([]);
                    setError('');
                    return [3 /*break*/, 8];
                case 7:
                    setIsLoadingCabinets(false);
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    }); };
    var generateVendorCode = function () {
        var productPrefix = formData.name ? formData.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '') || 'PRD' : 'PRD';
        var timestamp = Date.now().toString(36).toUpperCase();
        var random = Math.random().toString(36).substring(2, 5).toUpperCase();
        var newVendorCode = ("" + productPrefix + timestamp + random).substring(0, 13);
        setFormData(function (prev) { return (__assign(__assign({}, prev), { vendorCode: newVendorCode })); });
        return newVendorCode;
    };
    var generateBarcode = function () {
        var newBarcode = generateEAN13Barcode();
        setFormData(function (prev) { return (__assign(__assign({}, prev), { barcode: newBarcode })); });
    };
    var handleInputChange = function (e) {
        var _a = e.target, name = _a.name, value = _a.value, type = _a.type;
        if (type === 'checkbox') {
            var checked_1 = e.target.checked;
            setFormData(function (prev) {
                var _a;
                return (__assign(__assign({}, prev), (_a = {}, _a[name] = checked_1, _a)));
            });
        }
        else {
            setFormData(function (prev) {
                var _a;
                return (__assign(__assign({}, prev), (_a = {}, _a[name] = value, _a)));
            });
        }
        // Очищаем сообщения при изменении данных
        setError('');
        setSuccess('');
    };
    var handleImageChange = function (e) {
        var _a;
        var file = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0];
        if (file) {
            var ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!ALLOWED_TYPES.includes(file.type)) {
                setError('Поддерживаются только форматы: JPEG, PNG, WebP');
                return;
            }
            var MAX_FILE_SIZE = 5 * 1024 * 1024;
            if (file.size > MAX_FILE_SIZE) {
                setError('Размер файла не должен превышать 5MB');
                return;
            }
            setSelectedImage(file);
            setFormData(function (prev) { return (__assign(__assign({}, prev), { mainImage: file })); });
            setError('');
            var reader = new FileReader();
            reader.onload = function (e) {
                var _a;
                setImagePreview((_a = e.target) === null || _a === void 0 ? void 0 : _a.result);
            };
            reader.readAsDataURL(file);
        }
    };
    var handleAdditionalImagesChange = function (e) {
        var files = Array.from(e.target.files || []);
        if (files.length > 0) {
            var ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            var MAX_FILE_SIZE = 5 * 1024 * 1024;
            // Проверяем каждый файл
            for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
                var file = files_1[_i];
                if (!ALLOWED_TYPES.includes(file.type)) {
                    setError("\u0424\u0430\u0439\u043B " + file.name + " \u0438\u043C\u0435\u0435\u0442 \u043D\u0435\u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043C\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442. \u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E: JPEG, PNG, WebP");
                    return;
                }
                if (file.size > MAX_FILE_SIZE) {
                    setError("\u0424\u0430\u0439\u043B " + file.name + " \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439. \u041C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u044B\u0439 \u0440\u0430\u0437\u043C\u0435\u0440: 5MB");
                    return;
                }
            }
            // Добавляем новые изображения к существующим
            setFormData(function (prev) { return (__assign(__assign({}, prev), { additionalImages: __spreadArrays(prev.additionalImages, files) })); });
            // Обновляем превью дополнительных изображений
            var newPreviews = files.map(function (file) {
                return new Promise(function (resolve) {
                    var reader = new FileReader();
                    reader.onload = function (e) { var _a; return resolve((_a = e.target) === null || _a === void 0 ? void 0 : _a.result); };
                    reader.readAsDataURL(file);
                });
            });
            Promise.all(newPreviews).then(function (previews) {
                setAdditionalImagePreviews(function (prev) { return __spreadArrays(prev, previews); });
            });
            setError('');
        }
    };
    var removeAdditionalImage = function (index) {
        setFormData(function (prev) { return (__assign(__assign({}, prev), { additionalImages: prev.additionalImages.filter(function (_, i) { return i !== index; }) })); });
        setAdditionalImagePreviews(function (prev) { return prev.filter(function (_, i) { return i !== index; }); });
    };
    var checkAiAnalysisStatus = function (productId) { return __awaiter(_this, void 0, void 0, function () {
        var response, data, product, error_2;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 4, , 5]);
                    console.log('🔍 Проверяем статус товара:', productId);
                    return [4 /*yield*/, fetch("/api/products/" + productId)];
                case 1:
                    response = _c.sent();
                    if (!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _c.sent();
                    product = (data === null || data === void 0 ? void 0 : data.product) || data;
                    console.log('📊 Статус товара:', product.status);
                    console.log('🤖 Характеристики (массив):', Array.isArray(product.characteristics) ? product.characteristics.length : 0);
                    console.log('📝 Полные данные товара:', product);
                    // Проверяем статус и наличие AI-характеристик
                    if (product.status === 'READY' || (Array.isArray(product.characteristics) && product.characteristics.length > 0)) {
                        console.log('✅ Товар готов или имеет AI-характеристики');
                        setAiAnalysisStatus('completed');
                        // Обновляем processingStatus при завершении ИИ-анализа
                        setProcessingStatus({
                            stage: 'completed',
                            message: 'AI-анализ завершен успешно!',
                            progress: 100,
                            details: "\u0422\u043E\u0432\u0430\u0440 \u043F\u0440\u043E\u0430\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D. ID: " + productId,
                            currentStep: 'Завершено',
                            totalSteps: 4
                        });
                        // Сохраняем AI-данные для отображения
                        if (Array.isArray(product.characteristics) && product.characteristics.length > 0) {
                            console.log('💾 Сохраняем характеристики из API:', product.characteristics.length);
                            setAiAnalysisData({
                                generatedName: product.generatedName || formData.name,
                                seoDescription: product.seoDescription || '',
                                characteristics: product.characteristics,
                                qualityScore: ((_a = product.aiAnalysis) === null || _a === void 0 ? void 0 : _a.qualityScore) || 85
                            });
                        }
                        else if (product.generatedName || product.seoDescription) {
                            // Если нет aiCharacteristics, но есть другие AI-данные
                            console.log('💾 Сохраняем альтернативные AI-данные');
                            setAiAnalysisData({
                                generatedName: product.generatedName,
                                seoDescription: product.seoDescription,
                                characteristics: product.characteristics || [],
                                qualityScore: ((_b = product.aiAnalysis) === null || _b === void 0 ? void 0 : _b.qualityScore) || 85
                            });
                        }
                        return [2 /*return*/, true];
                    }
                    else if (product.status === 'DRAFT') {
                        console.log('📝 Товар в статусе DRAFT');
                        // Проверяем, есть ли ошибка AI-анализа
                        if (product.errorMessage && product.errorMessage.includes('AI')) {
                            console.log('❌ Ошибка AI-анализа:', product.errorMessage);
                            setAiAnalysisStatus('failed');
                            return [2 /*return*/, false];
                        }
                        else {
                            console.log('⏳ AI-анализ еще в процессе');
                            // Товар создан, но AI-анализ еще в процессе
                            setAiAnalysisStatus('processing');
                            return [2 /*return*/, false];
                        }
                    }
                    _c.label = 3;
                case 3: return [3 /*break*/, 5];
                case 4:
                    error_2 = _c.sent();
                    console.error('❌ Ошибка проверки статуса AI-анализа:', error_2);
                    setAiAnalysisStatus('failed');
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/, false];
            }
        });
    }); };
    // Функция для периодической проверки статуса AI-анализа
    var startAiAnalysisPolling = function (productId) {
        console.log('🚀 Запуск polling для товара:', productId);
        // Очищаем предыдущий интервал, если он существует
        if (aiAnalysisPollingIntervalRef.current) {
            clearInterval(aiAnalysisPollingIntervalRef.current);
        }
        var interval = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
            var isCompleted;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('🔍 Проверяем статус AI-анализа для товара:', productId);
                        return [4 /*yield*/, checkAiAnalysisStatus(productId)];
                    case 1:
                        isCompleted = _a.sent();
                        if (isCompleted) {
                            console.log('✅ AI-анализ завершен для товара:', productId);
                            clearInterval(interval);
                            aiAnalysisPollingIntervalRef.current = null;
                            // Принудительно обновляем статус AI-анализа
                            setAiAnalysisStatus('completed');
                            // processingStatus уже обновлен в checkAiAnalysisStatus
                        }
                        else {
                            console.log('⏳ AI-анализ еще в процессе для товара:', productId);
                            // Обновляем статус загрузки характеристик только если еще не завершен
                            if (aiAnalysisStatus !== 'completed') {
                                setProcessingStatus({
                                    stage: 'ai-analysis',
                                    message: 'AI-анализ в процессе...',
                                    progress: 80,
                                    details: 'ИИ анализирует товар и создает характеристики...',
                                    currentStep: 'AI-анализ',
                                    totalSteps: 4
                                });
                            }
                        }
                        return [2 /*return*/];
                }
            });
        }); }, 10000); // Проверяем каждые 5 секунд
        // Сохраняем ссылку на интервал
        aiAnalysisPollingIntervalRef.current = interval;
        // Останавливаем проверку через 5 минут
        setTimeout(function () {
            console.log('⏰ Таймаут polling для товара:', productId);
            if (aiAnalysisPollingIntervalRef.current === interval) {
                clearInterval(interval);
                aiAnalysisPollingIntervalRef.current = null;
                if (aiAnalysisStatus === 'processing') {
                    setAiAnalysisStatus('failed');
                }
            }
        }, 300000);
    };
    // Функция для публикации товара на Wildberries
    var publishToWildberries = function (productId) { return __awaiter(_this, void 0, void 0, function () {
        var response, result, errorData, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    setProcessingStatus({
                        stage: 'wb-creation',
                        message: 'Публикуем товар на Wildberries...',
                        progress: 90,
                        details: 'Отправляем данные на Wildberries...',
                        currentStep: 'Публикация на WB',
                        totalSteps: 4
                    });
                    return [4 /*yield*/, fetch("/api/products/" + productId + "/publish", {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        })];
                case 1:
                    response = _a.sent();
                    if (!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.json()];
                case 2:
                    result = _a.sent();
                    setProcessingStatus({
                        stage: 'completed',
                        message: 'Товар успешно опубликован на Wildberries!',
                        progress: 100,
                        details: "ID \u0442\u043E\u0432\u0430\u0440\u0430 \u043D\u0430 WB: " + (result.wbProductId || 'N/A'),
                        currentStep: 'Завершено',
                        totalSteps: 4
                    });
                    setSuccess("\u0422\u043E\u0432\u0430\u0440 \"" + formData.name + "\" \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D \u043D\u0430 Wildberries!");
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, response.json()];
                case 4:
                    errorData = _a.sent();
                    throw new Error(errorData.error || 'Ошибка публикации на Wildberries');
                case 5: return [3 /*break*/, 7];
                case 6:
                    error_3 = _a.sent();
                    console.error('❌ Ошибка публикации на Wildberries:', error_3);
                    setProcessingStatus({
                        stage: 'error',
                        message: 'Ошибка публикации на Wildberries',
                        progress: 0,
                        details: error_3.message || 'Неизвестная ошибка',
                        currentStep: 'Ошибка',
                        totalSteps: 4
                    });
                    setError(error_3.message || 'Произошла ошибка при публикации на Wildberries');
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    }); };
    var validateStep = function (step) {
        setError('');
        switch (step) {
            case 1:
                if (!formData.name.trim()) {
                    setError('Введите название товара');
                    return false;
                }
                if (!selectedCategory) {
                    setError('Выберите категорию товара');
                    return false;
                }
                if (!formData.originalPrice || parseFloat(formData.originalPrice) <= 0) {
                    setError('Введите корректную цену товара');
                    return false;
                }
                break;
            case 2:
                if (!selectedImage) {
                    setError('Выберите основное изображение товара');
                    return false;
                }
                break;
            case 3:
                if (!formData.length || !formData.width || !formData.height || !formData.weight) {
                    setError('Заполните все габариты товара');
                    return false;
                }
                if (!formData.cabinetId) {
                    setError('Выберите кабинет для публикации');
                    return false;
                }
                break;
        }
        return true;
    };
    var nextStep = function () {
        if (validateStep(currentStep)) {
            setCurrentStep(function (prev) { return Math.min(prev + 1, 4); });
            // Очищаем сообщения при переходе на следующий шаг
            setError('');
            setSuccess('');
        }
    };
    var prevStep = function () {
        setCurrentStep(function (prev) { return Math.max(prev - 1, 1); });
        // Очищаем сообщения при переходе на предыдущий шаг
        setError('');
        setSuccess('');
    };
    var handleSubmit = function () { return __awaiter(_this, void 0, void 0, function () {
        var formDataToSend_1, dimensions, response, errorData, result, error_4;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!validateStep(3))
                        return [2 /*return*/];
                    setIsSubmitting(true);
                    setError('');
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 6, , 7]);
                    // Статус загрузки
                    setProcessingStatus({
                        stage: 'uploading',
                        message: 'Загружаем изображения и создаем товар...',
                        progress: 10,
                        details: 'Подготавливаем данные для отправки на сервер...',
                        currentStep: 'Подготовка данных',
                        totalSteps: 4
                    });
                    formDataToSend_1 = new FormData();
                    // Основные данные
                    formDataToSend_1.append('name', formData.name);
                    formDataToSend_1.append('originalPrice', formData.originalPrice);
                    formDataToSend_1.append('discountPrice', formData.discountPrice);
                    formDataToSend_1.append('costPrice', formData.costPrice || '');
                    formDataToSend_1.append('packageContents', formData.packageContents);
                    dimensions = {
                        length: parseFloat(formData.length),
                        width: parseFloat(formData.width),
                        height: parseFloat(formData.height),
                        weight: parseFloat(formData.weight)
                    };
                    formDataToSend_1.append('dimensions', JSON.stringify(dimensions));
                    formDataToSend_1.append('referenceUrl', formData.referenceUrl);
                    formDataToSend_1.append('cabinetId', formData.cabinetId);
                    formDataToSend_1.append('vendorCode', formData.vendorCode);
                    formDataToSend_1.append('autoGenerateVendorCode', formData.autoGenerateVendorCode.toString());
                    formDataToSend_1.append('barcode', formData.barcode);
                    formDataToSend_1.append('hasVariantSizes', formData.hasVariantSizes.toString());
                    formDataToSend_1.append('variantSizes', JSON.stringify(formData.variantSizes));
                    formDataToSend_1.append('description', formData.description || '');
                    formDataToSend_1.append('imageComments', formData.imageComments || '');
                    // Категория
                    if (selectedCategory) {
                        formDataToSend_1.append('categoryId', selectedCategory.id.toString());
                        formDataToSend_1.append('categoryName', selectedCategory.name);
                        formDataToSend_1.append('parentCategoryName', selectedCategory.parentName);
                    }
                    // Изображения
                    if (selectedImage) {
                        formDataToSend_1.append('image', selectedImage);
                    }
                    // Дополнительные изображения
                    if (formData.additionalImages.length > 0) {
                        formDataToSend_1.append('additionalImagesCount', formData.additionalImages.length.toString());
                        formData.additionalImages.forEach(function (image, index) {
                            formDataToSend_1.append("additionalImage" + index, image);
                        });
                    }
                    // Отправляем запрос на создание продукта
                    setProcessingStatus({
                        stage: 'processing',
                        message: 'Создаем товар в базе данных...',
                        progress: 30,
                        details: 'Сохраняем основную информацию...',
                        currentStep: 'Создание товара',
                        totalSteps: 4
                    });
                    return [4 /*yield*/, fetch('/api/products', {
                            method: 'POST',
                            body: formDataToSend_1
                        })];
                case 2:
                    response = _c.sent();
                    if (!!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.json()];
                case 3:
                    errorData = _c.sent();
                    throw new Error(errorData.error || "HTTP " + response.status + ": " + response.statusText);
                case 4: return [4 /*yield*/, response.json()];
                case 5:
                    result = _c.sent();
                    if (result.success) {
                        // Сохраняем ID созданного товара
                        setCreatedProductId(result.productId);
                        // Проверяем, был ли AI-анализ успешным
                        if (((_a = result.data) === null || _a === void 0 ? void 0 : _a.aiAnalysisStatus) === 'completed' || ((_b = result.data) === null || _b === void 0 ? void 0 : _b.status) === 'READY') {
                            // AI-анализ завершен успешно
                            setProcessingStatus({
                                stage: 'completed',
                                message: 'Товар успешно создан и проанализирован!',
                                progress: 100,
                                details: "ID \u0442\u043E\u0432\u0430\u0440\u0430: " + result.productId + ". AI-\u0430\u043D\u0430\u043B\u0438\u0437 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D.",
                                currentStep: 'Завершено',
                                totalSteps: 4
                            });
                            setAiAnalysisStatus('completed');
                            setSuccess("\u0422\u043E\u0432\u0430\u0440 \"" + formData.name + "\" \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0441\u043E\u0437\u0434\u0430\u043D \u0438 \u043F\u0440\u043E\u0430\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D \u0418\u0418! ID: " + result.productId);
                            setCurrentStep(4);
                            setIsSubmitting(false);
                            if (onSuccess) {
                                onSuccess();
                            }
                        }
                        else {
                            // AI-анализ не завершен или упал
                            setProcessingStatus({
                                stage: 'ai-analysis',
                                message: 'AI-анализ в процессе...',
                                progress: 80,
                                details: 'ИИ анализирует товар и создает характеристики...',
                                currentStep: 'AI-анализ',
                                totalSteps: 4
                            });
                            // Запускаем периодическую проверку статуса AI-анализа
                            startAiAnalysisPolling(result.productId);
                            setSuccess("\u0422\u043E\u0432\u0430\u0440 \"" + formData.name + "\" \u0441\u043E\u0437\u0434\u0430\u043D! ID: " + result.productId + ". AI-\u0430\u043D\u0430\u043B\u0438\u0437 \u0432 \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u0435...");
                            setCurrentStep(4);
                            setIsSubmitting(false);
                            if (onSuccess) {
                                onSuccess();
                            }
                        }
                    }
                    else {
                        throw new Error(result.error || 'Неизвестная ошибка');
                    }
                    return [3 /*break*/, 7];
                case 6:
                    error_4 = _c.sent();
                    console.error('❌ Ошибка создания товара:', error_4);
                    setProcessingStatus({
                        stage: 'error',
                        message: 'Ошибка создания товара',
                        progress: 0,
                        details: error_4.message || 'Неизвестная ошибка',
                        currentStep: 'Ошибка',
                        totalSteps: 4
                    });
                    setError(error_4.message || 'Произошла ошибка при создании товара');
                    setIsSubmitting(false);
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    }); };
    var clearForm = function () {
        setFormData(initialFormData);
        setSelectedImage(null);
        setImagePreview('');
        setAdditionalImages([]);
        setAdditionalImagePreviews([]);
        setSelectedCategory(null);
        setError('');
        setSuccess('');
        setProcessingStatus(null);
        setAiAnalysisStatus('pending');
        setAiAnalysisData(null);
        setCreatedProductId('');
        setCurrentStep(1);
        // Очищаем все интервалы polling
        if (aiAnalysisPollingIntervalRef.current) {
            clearInterval(aiAnalysisPollingIntervalRef.current);
            aiAnalysisPollingIntervalRef.current = null;
        }
        var fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(function (input) {
            input.value = '';
        });
    };
    var handleCategorySelect = function (category) {
        console.log('🔍 [Form] Выбрана категория:', {
            id: category === null || category === void 0 ? void 0 : category.id,
            name: category === null || category === void 0 ? void 0 : category.name,
            parentName: category === null || category === void 0 ? void 0 : category.parentName,
            wbSubjectId: category === null || category === void 0 ? void 0 : category.wbSubjectId,
            displayName: category === null || category === void 0 ? void 0 : category.displayName
        });
        setSelectedCategory(category);
    };
    var handleVariantSizeChange = function (size, checked) {
        setFormData(function (prev) { return (__assign(__assign({}, prev), { variantSizes: checked
                ? __spreadArrays(prev.variantSizes, [size]) : prev.variantSizes.filter(function (s) { return s !== size; }) })); });
    };
    var getSizeOptionsForCategory = function () {
        if (!selectedCategory)
            return [];
        var categoryName = selectedCategory.name.toLowerCase();
        var parentName = selectedCategory.parentName.toLowerCase();
        var fullText = categoryName + " " + parentName;
        if (fullText.includes('обувь') || fullText.includes('кроссовки') ||
            fullText.includes('ботинки') || fullText.includes('туфли')) {
            return ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];
        }
        if (fullText.includes('детская') || fullText.includes('детский')) {
            return ['80-86', '86-92', '98-104', '110-116', '122-128', '134-140', '146-152', '158-164'];
        }
        if (fullText.includes('мужская') || fullText.includes('мужской')) {
            return ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', '48', '50', '52', '54', '56', '58', '60'];
        }
        if (fullText.includes('женская') || fullText.includes('женский')) {
            return ['XS', 'S', 'M', 'L', 'XL', 'XXL', '40', '42', '44', '46', '48', '50', '52'];
        }
        return ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    };
    var getStageColor = function (stage) {
        switch (stage) {
            case 'uploading': return 'bg-blue-600';
            case 'processing': return 'bg-purple-600';
            case 'ai-analysis': return 'bg-indigo-600';
            case 'wb-creation': return 'bg-orange-600';
            case 'completed': return 'bg-green-600';
            case 'error': return 'bg-red-600';
            default: return 'bg-gray-600';
        }
    };
    var renderStepIndicator = function () { return (react_1["default"].createElement("div", { className: "flex items-center justify-center mb-6" }, [1, 2, 3, 4].map(function (step, index) { return (react_1["default"].createElement(react_1["default"].Fragment, { key: step },
        react_1["default"].createElement("div", { className: "w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all duration-500 " + (step <= currentStep
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg transform scale-110'
                : 'bg-gray-700 text-gray-400') + " " + (step === currentStep ? 'animate-pulse shadow-xl' : '') },
            step === 1 && react_1["default"].createElement(lucide_react_1.Package, { className: "w-5 h-5" }),
            step === 2 && react_1["default"].createElement(lucide_react_1.Camera, { className: "w-5 h-5" }),
            step === 3 && react_1["default"].createElement(lucide_react_1.Settings, { className: "w-5 h-5" }),
            step === 4 && react_1["default"].createElement(lucide_react_1.Eye, { className: "w-5 h-5" })),
        index < 3 && (react_1["default"].createElement("div", { className: "w-12 h-1 mx-2 transition-all duration-500 " + (step < currentStep
                ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                : 'bg-gray-700') + " " + (step === currentStep - 1 ? 'animate-pulse' : '') })))); }))); };
    // Расчет процента скидки
    var discountPercent = formData.originalPrice && formData.discountPrice ?
        Math.round((1 - parseFloat(formData.discountPrice) / parseFloat(formData.originalPrice)) * 100) : undefined;
    return (react_1["default"].createElement("div", { className: "min-h-screen py-4 fade-in" },
        react_1["default"].createElement("div", { className: "max-w-3xl mx-auto px-4" },
            react_1["default"].createElement("div", { className: "text-center mb-6" },
                react_1["default"].createElement("h1", { className: "text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-3" }, "\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0442\u043E\u0432\u0430\u0440\u0430 \u043D\u0430 Wildberries"),
                react_1["default"].createElement("p", { className: "text-base text-gray-300 max-w-xl mx-auto" }, "\u0418\u0418-\u0430\u0441\u0441\u0438\u0441\u0442\u0435\u043D\u0442 \u043F\u043E\u043C\u043E\u0436\u0435\u0442 \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u0443\u044E \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443 \u0442\u043E\u0432\u0430\u0440\u0430 \u0441 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u043C \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435\u043C \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A")),
            renderStepIndicator(),
            processingStatus && (react_1["default"].createElement("div", { className: "mb-4 glass-container p-4 scale-in" },
                react_1["default"].createElement("div", { className: "flex items-center gap-3 mb-3" },
                    react_1["default"].createElement("div", { className: "p-1.5 rounded-full " + getStageColor(processingStatus.stage) }, processingStatus.stage === 'completed' ? (react_1["default"].createElement(lucide_react_1.CheckCircle, { className: "w-4 h-4 text-white" })) : processingStatus.stage === 'error' ? (react_1["default"].createElement(lucide_react_1.AlertCircle, { className: "w-4 h-4 text-white" })) : (react_1["default"].createElement(lucide_react_1.Loader, { className: "w-4 h-4 text-white animate-spin" }))),
                    react_1["default"].createElement("div", { className: "flex-1" },
                        react_1["default"].createElement("h3", { className: "text-base font-semibold text-white" }, processingStatus.message),
                        processingStatus.details && (react_1["default"].createElement("p", { className: "text-sm text-gray-300 mt-1" }, processingStatus.details)))),
                react_1["default"].createElement("div", { className: "progress-bar mb-3" },
                    react_1["default"].createElement("div", { className: "progress-fill", style: { width: processingStatus.progress + "%" } })),
                react_1["default"].createElement("div", { className: "flex items-center justify-between text-xs text-gray-300" },
                    react_1["default"].createElement("span", null,
                        processingStatus.progress,
                        "% \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E"),
                    processingStatus.currentStep && (react_1["default"].createElement("span", { className: "flex items-center gap-2" },
                        react_1["default"].createElement("div", { className: "w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" }),
                        processingStatus.currentStep))),
                aiAnalysisStatus === 'completed' && processingStatus.stage !== 'completed' && (react_1["default"].createElement("div", { className: "mt-3 p-2 bg-green-900/30 border border-green-600/50 rounded-lg" },
                    react_1["default"].createElement("p", { className: "text-green-400 text-sm" }, "\u2705 \u0418\u0418-\u0430\u043D\u0430\u043B\u0438\u0437 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D! \u041E\u0431\u043D\u043E\u0432\u043B\u044F\u0435\u043C \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441..."))))),
            react_1["default"].createElement("div", { className: "glass-container p-6 transition-all duration-500" },
                react_1["default"].createElement("div", { className: "space-y-4" },
                    currentStep === 1 && (react_1["default"].createElement(Step1BasicInfo_1["default"], { formData: formData, selectedCategory: selectedCategory, cabinets: cabinets, onInputChange: handleInputChange, onCategorySelect: handleCategorySelect, onVariantSizeChange: handleVariantSizeChange, getSizeOptionsForCategory: getSizeOptionsForCategory, discountPercent: discountPercent, generateVendorCode: generateVendorCode, isLoadingCabinets: isLoadingCabinets })),
                    currentStep === 2 && (react_1["default"].createElement("div", { className: "space-y-6" },
                        react_1["default"].createElement("div", { className: "text-center mb-6" },
                            react_1["default"].createElement("h2", { className: "text-2xl font-bold text-white mb-2" }, "\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u0442\u043E\u0432\u0430\u0440\u0430"),
                            react_1["default"].createElement("p", { className: "text-gray-300" }, "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0435 \u0444\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0438\u0438 \u0442\u043E\u0432\u0430\u0440\u0430 \u0434\u043B\u044F \u043B\u0443\u0447\u0448\u0435\u0433\u043E \u0430\u043D\u0430\u043B\u0438\u0437\u0430 \u0418\u0418")),
                        react_1["default"].createElement("div", { className: "space-y-4" },
                            react_1["default"].createElement("label", { className: "block text-lg font-semibold text-white flex items-center gap-2" },
                                react_1["default"].createElement(lucide_react_1.Upload, { className: "w-5 h-5 text-blue-400" }),
                                "\u041E\u0441\u043D\u043E\u0432\u043D\u043E\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 *"),
                            react_1["default"].createElement("div", { className: "border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer" },
                                react_1["default"].createElement("input", { type: "file", onChange: handleImageChange, accept: "image/jpeg,image/jpg,image/png,image/webp", className: "hidden", id: "main-image" }),
                                react_1["default"].createElement("label", { htmlFor: "main-image", className: "cursor-pointer" }, imagePreview ? (react_1["default"].createElement("div", { className: "space-y-4" },
                                    react_1["default"].createElement("img", { src: imagePreview, alt: "\u041F\u0440\u0435\u0432\u044C\u044E", className: "max-w-xs mx-auto rounded-lg shadow-lg" }),
                                    react_1["default"].createElement("p", { className: "text-green-400" }, "\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E"),
                                    react_1["default"].createElement("p", { className: "text-gray-400 text-sm" }, "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0434\u043B\u044F \u0437\u0430\u043C\u0435\u043D\u044B"))) : (react_1["default"].createElement("div", { className: "space-y-4" },
                                    react_1["default"].createElement(lucide_react_1.Upload, { className: "w-12 h-12 mx-auto text-gray-400" }),
                                    react_1["default"].createElement("div", null,
                                        react_1["default"].createElement("p", { className: "text-gray-300" }, "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0434\u043B\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F"),
                                        react_1["default"].createElement("p", { className: "text-gray-500 text-sm" }, "JPEG, PNG, WebP \u0434\u043E 5MB"))))))),
                        react_1["default"].createElement("div", { className: "space-y-4" },
                            react_1["default"].createElement("div", { className: "flex items-center justify-between" },
                                react_1["default"].createElement("label", { className: "block text-lg font-semibold text-white flex items-center gap-2" },
                                    react_1["default"].createElement(lucide_react_1.Image, { className: "w-5 h-5 text-blue-400" }),
                                    "\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F"),
                                formData.additionalImages.length > 0 && (react_1["default"].createElement("button", { type: "button", onClick: function () {
                                        setFormData(function (prev) { return (__assign(__assign({}, prev), { additionalImages: [] })); });
                                        setAdditionalImagePreviews([]);
                                    }, className: "px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 font-medium flex items-center gap-2 backdrop-blur-sm border border-red-500/50 text-sm" },
                                    react_1["default"].createElement(lucide_react_1.Trash2, { className: "w-4 h-4" }),
                                    "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u0432\u0441\u0435"))),
                            react_1["default"].createElement("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3" },
                                additionalImagePreviews.map(function (preview, index) { return (react_1["default"].createElement("div", { key: index, className: "relative group" },
                                    react_1["default"].createElement("img", { src: preview, alt: "\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 " + (index + 1), className: "w-full h-32 object-cover rounded-lg border border-blue-500/30 shadow-md" }),
                                    react_1["default"].createElement("button", { type: "button", onClick: function () { return removeAdditionalImage(index); }, className: "absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all duration-300 opacity-0 group-hover:opacity-100 shadow-lg hover:shadow-xl transform hover:scale-110 backdrop-blur-sm border border-red-500/50 flex items-center justify-center" },
                                        react_1["default"].createElement(lucide_react_1.X, { className: "w-3 h-3" })))); }),
                                formData.additionalImages.length < 9 && (react_1["default"].createElement("div", { className: "w-full h-32 border-2 border-dashed border-blue-500/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-900/20 transition-all duration-300 bg-black/40 backdrop-blur-md" },
                                    react_1["default"].createElement(lucide_react_1.Plus, { className: "w-6 h-6 text-gray-400 mb-2" }),
                                    react_1["default"].createElement("p", { className: "text-xs text-gray-300 text-center" }, "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0444\u043E\u0442\u043E"),
                                    react_1["default"].createElement("input", { type: "file", accept: "image/*", multiple: true, onChange: handleAdditionalImagesChange, className: "absolute inset-0 w-full h-full opacity-0 cursor-pointer" })))),
                            formData.additionalImages.length === 9 && (react_1["default"].createElement("div", { className: "px-3 py-2 bg-blue-900/30 border border-blue-600/50 rounded-lg" },
                                react_1["default"].createElement("p", { className: "text-blue-400 text-xs text-center" }, "\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442 \u043B\u0438\u043C\u0438\u0442 \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439 (9)"))),
                            react_1["default"].createElement("p", { className: "text-gray-400 text-xs px-2" }, "\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u043F\u043E\u043C\u043E\u0433\u0443\u0442 \u0418\u0418 \u043B\u0443\u0447\u0448\u0435 \u043F\u0440\u043E\u0430\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0442\u043E\u0432\u0430\u0440 \u0438 \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0435 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438")),
                        react_1["default"].createElement("div", { className: "space-y-3" },
                            react_1["default"].createElement("label", { className: "block text-lg font-semibold text-white flex items-center gap-2" },
                                react_1["default"].createElement(lucide_react_1.FileText, { className: "w-5 h-5 text-blue-400" }),
                                "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0438 \u043A \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F\u043C"),
                            react_1["default"].createElement("textarea", { name: "imageComments", value: formData.imageComments, onChange: handleInputChange, rows: 3, className: "glass-input w-full text-base", placeholder: "\u041E\u043F\u0438\u0448\u0438\u0442\u0435 \u043E\u0441\u043E\u0431\u0435\u043D\u043D\u043E\u0441\u0442\u0438 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u043F\u043E\u043C\u043E\u0433\u0443\u0442 \u0418\u0418 \u043B\u0443\u0447\u0448\u0435 \u043F\u0440\u043E\u0430\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0442\u043E\u0432\u0430\u0440..." }),
                            react_1["default"].createElement("p", { className: "text-gray-400 text-xs px-2" }, "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: \"\u0422\u043E\u0432\u0430\u0440 \u043F\u043E\u043A\u0430\u0437\u0430\u043D \u0441 \u0440\u0430\u0437\u043D\u044B\u0445 \u0440\u0430\u043A\u0443\u0440\u0441\u043E\u0432\", \"\u041E\u0441\u043E\u0431\u043E\u0435 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u0435 \u043A \u0434\u0435\u0442\u0430\u043B\u044F\u043C\", \"\u041F\u043E\u043A\u0430\u0437\u0430\u043D \u0432 \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0435\"")))),
                    currentStep === 3 && (react_1["default"].createElement("div", { className: "space-y-6" },
                        react_1["default"].createElement("div", { className: "text-center mb-6" },
                            react_1["default"].createElement("h2", { className: "text-2xl font-bold text-white mb-2" }, "\u0424\u0438\u043D\u0430\u043B\u044C\u043D\u044B\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438"),
                            react_1["default"].createElement("p", { className: "text-gray-300" }, "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0432\u0441\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u043F\u0435\u0440\u0435\u0434 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u0435\u043C")),
                        react_1["default"].createElement("div", { className: "space-y-4" },
                            react_1["default"].createElement("h3", { className: "text-lg font-semibold text-white" }, "\u0421\u0432\u043E\u0434\u043A\u0430 \u0442\u043E\u0432\u0430\u0440\u0430:"),
                            react_1["default"].createElement("div", { className: "glass-container p-4 space-y-2" },
                                react_1["default"].createElement("p", { className: "text-white" },
                                    react_1["default"].createElement("span", { className: "text-gray-400" }, "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435:"),
                                    " ",
                                    formData.name),
                                react_1["default"].createElement("p", { className: "text-white" },
                                    react_1["default"].createElement("span", { className: "text-gray-400" }, "\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F:"),
                                    " ", selectedCategory === null || selectedCategory === void 0 ? void 0 :
                                    selectedCategory.displayName),
                                react_1["default"].createElement("p", { className: "text-white" },
                                    react_1["default"].createElement("span", { className: "text-gray-400" }, "\u0426\u0435\u043D\u0430:"),
                                    " ",
                                    formData.originalPrice,
                                    " \u20BD"),
                                react_1["default"].createElement("p", { className: "text-white" },
                                    react_1["default"].createElement("span", { className: "text-gray-400" }, "\u0421\u0435\u0431\u0435\u0441\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C:"),
                                    " ",
                                    formData.costPrice ? formData.costPrice + " \u20BD" : 'Не указана'),
                                react_1["default"].createElement("p", { className: "text-white" },
                                    react_1["default"].createElement("span", { className: "text-gray-400" }, "\u041A\u0430\u0431\u0438\u043D\u0435\u0442:"),
                                    " ", (_b = cabinets.find(function (c) { return c.id === formData.cabinetId; })) === null || _b === void 0 ? void 0 :
                                    _b.name),
                                react_1["default"].createElement("p", { className: "text-white" },
                                    react_1["default"].createElement("span", { className: "text-gray-400" }, "\u0413\u043B\u0430\u0432\u043D\u043E\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435:"),
                                    " ",
                                    selectedImage ? 'Загружено' : 'Не выбрано'),
                                react_1["default"].createElement("p", { className: "text-white" },
                                    react_1["default"].createElement("span", { className: "text-gray-400" }, "\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u0444\u043E\u0442\u043E:"),
                                    " ",
                                    formData.additionalImages.length),
                                react_1["default"].createElement("p", { className: "text-white" },
                                    react_1["default"].createElement("span", { className: "text-gray-400" }, "\u0413\u0430\u0431\u0430\u0440\u0438\u0442\u044B:"),
                                    " ",
                                    formData.length,
                                    "\u00D7",
                                    formData.width,
                                    "\u00D7",
                                    formData.height,
                                    " \u0441\u043C, ",
                                    formData.weight,
                                    " \u043A\u0433"))))),
                    currentStep === 4 && (react_1["default"].createElement(react_1["default"].Fragment, null,
                        console.log('🔍 [ProductForm] Рендерим Step4Results:', {
                            createdProductId: createdProductId,
                            aiAnalysisData: aiAnalysisData,
                            characteristicsCount: ((_c = aiAnalysisData === null || aiAnalysisData === void 0 ? void 0 : aiAnalysisData.characteristics) === null || _c === void 0 ? void 0 : _c.length) || 0,
                            aiAnalysisStatus: aiAnalysisStatus
                        }),
                        react_1["default"].createElement(Step4Results_1["default"], { createdProductId: createdProductId, aiResponse: {
                                generatedName: (aiAnalysisData === null || aiAnalysisData === void 0 ? void 0 : aiAnalysisData.generatedName) || formData.name,
                                category: selectedCategory,
                                seoDescription: (aiAnalysisData === null || aiAnalysisData === void 0 ? void 0 : aiAnalysisData.seoDescription) || '',
                                characteristics: (aiAnalysisData === null || aiAnalysisData === void 0 ? void 0 : aiAnalysisData.characteristics) || [],
                                qualityScore: (aiAnalysisData === null || aiAnalysisData === void 0 ? void 0 : aiAnalysisData.qualityScore) || 85
                            }, aiCharacteristics: (aiAnalysisData === null || aiAnalysisData === void 0 ? void 0 : aiAnalysisData.characteristics) || [], allCategoryCharacteristics: [], isLoadingCharacteristics: aiAnalysisStatus === 'processing', editingCharacteristics: {}, 
                            // Добавляем логирование для отладки
                            key: "step4-" + createdProductId + "-" + (((_d = aiAnalysisData === null || aiAnalysisData === void 0 ? void 0 : aiAnalysisData.characteristics) === null || _d === void 0 ? void 0 : _d.length) || 0), onUpdateProductField: function (field, value) {
                                if (field === 'name') {
                                    setFormData(function (prev) { return (__assign(__assign({}, prev), { name: value })); });
                                }
                                else if (field === 'description') {
                                    setFormData(function (prev) { return (__assign(__assign({}, prev), { description: value })); });
                                }
                            }, onUpdateCharacteristic: function (characteristicId, newValue) {
                                if (aiAnalysisData === null || aiAnalysisData === void 0 ? void 0 : aiAnalysisData.characteristics) {
                                    var updatedCharacteristics = aiAnalysisData.characteristics.map(function (char) {
                                        return char.id === characteristicId ? __assign(__assign({}, char), { value: newValue }) : char;
                                    });
                                    setAiAnalysisData(__assign(__assign({}, aiAnalysisData), { characteristics: updatedCharacteristics }));
                                }
                            }, onDeleteCharacteristic: function (characteristicId) {
                                if (aiAnalysisData === null || aiAnalysisData === void 0 ? void 0 : aiAnalysisData.characteristics) {
                                    var updatedCharacteristics = aiAnalysisData.characteristics.filter(function (char) {
                                        return char.id !== characteristicId;
                                    });
                                    setAiAnalysisData(__assign(__assign({}, aiAnalysisData), { characteristics: updatedCharacteristics }));
                                }
                            }, onAddNewCharacteristic: function (characteristicId, value) {
                                // Добавление новой характеристики
                            }, onToggleEditCharacteristic: function (characteristicId) {
                                // Переключение режима редактирования
                            }, onPublish: function () {
                                if (createdProductId) {
                                    publishToWildberries(createdProductId);
                                }
                            }, onCreateInfographic: function () {
                                // Создание инфографики
                            }, onClearForm: clearForm, onLoadProductCharacteristics: function (productId) {
                                checkAiAnalysisStatus(productId);
                            } }))))),
            error && (react_1["default"].createElement("div", { className: "glass-container p-4 mt-6 border border-red-500/50 bg-red-500/10 scale-in" },
                react_1["default"].createElement("div", { className: "flex items-center gap-3" },
                    react_1["default"].createElement(lucide_react_1.AlertCircle, { className: "w-5 h-5 text-red-400" }),
                    react_1["default"].createElement("span", { className: "text-red-400 font-medium" }, error)))),
            success && (react_1["default"].createElement("div", { className: "glass-container p-4 mt-6 border border-green-500/10 scale-in" },
                react_1["default"].createElement("div", { className: "flex items-center gap-3" },
                    react_1["default"].createElement(lucide_react_1.CheckCircle, { className: "w-5 h-5 text-green-400" }),
                    react_1["default"].createElement("span", { className: "text-green-400 font-medium" }, success)),
                aiAnalysisStatus === 'pending' && (react_1["default"].createElement("div", { className: "mt-3 px-3 py-2 bg-blue-900/30 border border-blue-600/50 rounded-lg" },
                    react_1["default"].createElement("p", { className: "text-blue-400 text-sm" }, "\u23F3 \u041E\u0436\u0438\u0434\u0430\u043D\u0438\u0435 AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430..."))),
                aiAnalysisStatus === 'processing' && (react_1["default"].createElement("div", { className: "mt-3 px-3 py-2 bg-yellow-900/30 border border-yellow-600/50 rounded-lg" },
                    react_1["default"].createElement("p", { className: "text-yellow-400 text-sm" }, "\uD83D\uDD04 AI-\u0430\u043D\u0430\u043B\u0438\u0437 \u0432 \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u0435..."))),
                aiAnalysisStatus === 'completed' && (react_1["default"].createElement("div", { className: "mt-3 px-3 py-2 bg-green-900/30 border border-green-600/50 rounded-lg" },
                    react_1["default"].createElement("p", { className: "text-green-400 text-sm" }, "\u2705 AI-\u0430\u043D\u0430\u043B\u0438\u0437 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D \u0443\u0441\u043F\u0435\u0448\u043D\u043E!"))),
                aiAnalysisStatus === 'failed' && (react_1["default"].createElement("div", { className: "mt-3 px-3 py-2 bg-red-900/30 border border-red-600/50 rounded-lg" },
                    react_1["default"].createElement("p", { className: "text-red-400 text-sm" }, "\u274C AI-\u0430\u043D\u0430\u043B\u0438\u0437 \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F. \u0422\u043E\u0432\u0430\u0440 \u0441\u043E\u0437\u0434\u0430\u043D \u0432 \u0431\u0430\u0437\u043E\u0432\u043E\u043C \u0440\u0435\u0436\u0438\u043C\u0435."))))),
            currentStep < 4 && !isSubmitting && (react_1["default"].createElement("div", { className: "flex justify-between mt-6" },
                react_1["default"].createElement("button", { onClick: prevStep, disabled: currentStep === 1, className: "glass-button " + (currentStep === 1 ? 'opacity-50 cursor-not-allowed' : '') },
                    react_1["default"].createElement(lucide_react_1.ArrowLeft, { className: "w-4 h-4" }),
                    "\u041D\u0430\u0437\u0430\u0434"),
                currentStep === 3 ? (react_1["default"].createElement("button", { onClick: handleSubmit, disabled: isSubmitting, className: "glass-button-primary" }, isSubmitting ? (react_1["default"].createElement(react_1["default"].Fragment, null,
                    react_1["default"].createElement("div", { className: "loading-spinner w-4 h-4" }),
                    "\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0442\u043E\u0432\u0430\u0440\u0430...")) : (react_1["default"].createElement(react_1["default"].Fragment, null,
                    react_1["default"].createElement(lucide_react_1.Sparkles, { className: "w-4 h-4" }),
                    "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0442\u043E\u0432\u0430\u0440")))) : (react_1["default"].createElement("button", { onClick: nextStep, className: "glass-button-primary" },
                    "\u0414\u0430\u043B\u0435\u0435",
                    react_1["default"].createElement(lucide_react_1.ArrowRight, { className: "w-4 h-4" }))))))));
}
exports["default"] = ProductForm;
;
