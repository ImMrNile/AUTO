"use strict";
// lib/utils/wbCharacteristicsUtils.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ С ПОДДЕРЖКОЙ ДВУХ ЦЕН
exports.__esModule = true;
exports.formatPriceDisplay = exports.analyzeDiscount = exports.validatePriceInfo = exports.logCardStructure = exports.validateCardForWB = exports.validateProductSizes = exports.createWBSizesWithDualPricing = exports.createWBSizes = exports.generateUniqueBarcodesForSizes = exports.generateEAN13Barcode = void 0;
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
exports.generateEAN13Barcode = generateEAN13Barcode;
function generateUniqueBarcodesForSizes(sizesCount) {
    var barcodes = new Set();
    while (barcodes.size < sizesCount) {
        var barcode = generateEAN13Barcode();
        barcodes.add(barcode);
    }
    return Array.from(barcodes);
}
exports.generateUniqueBarcodesForSizes = generateUniqueBarcodesForSizes;
/**
 * ОБНОВЛЕННАЯ ФУНКЦИЯ: Создание размеров с поддержкой двух цен
 * @param hasVariantSizes - есть ли размеры у товара
 * @param variantSizes - массив размеров
 * @param originalPrice - цена до скидки (обязательная)
 * @param mainBarcode - основной штрихкод
 * @param discountPrice - цена со скидкой (опциональная)
 */
function createWBSizes(hasVariantSizes, variantSizes, originalPrice, mainBarcode, discountPrice) {
    var basePrice = Math.max(1, Math.round(Number(originalPrice) || 1000));
    var finalPrice = discountPrice ? Math.max(1, Math.round(Number(discountPrice))) : null;
    console.log("\uD83D\uDCB0 \u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0440\u0430\u0437\u043C\u0435\u0440\u043E\u0432 WB:");
    console.log("   - \u0426\u0435\u043D\u0430 \u0434\u043E \u0441\u043A\u0438\u0434\u043A\u0438: " + basePrice + "\u20BD");
    console.log("   - \u0426\u0435\u043D\u0430 \u0441\u043E \u0441\u043A\u0438\u0434\u043A\u043E\u0439: " + (finalPrice ? finalPrice + '₽' : 'не указана'));
    console.log("   - \u0420\u0430\u0437\u043C\u0435\u0440\u044B: " + (hasVariantSizes ? (variantSizes === null || variantSizes === void 0 ? void 0 : variantSizes.length) || 0 : 'безразмерный'));
    if (hasVariantSizes && variantSizes && variantSizes.length > 0) {
        console.log("\uD83D\uDC55 \u0421\u043E\u0437\u0434\u0430\u0435\u043C \u0440\u0430\u0437\u043C\u0435\u0440\u044B \u0434\u043B\u044F " + variantSizes.length + " \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u043E\u0432");
        var barcodes_1 = generateUniqueBarcodesForSizes(variantSizes.length);
        return variantSizes.map(function (size, index) {
            var sizeData = {
                techSize: size,
                wbSize: size,
                price: basePrice,
                skus: [barcodes_1[index]]
            };
            // Добавляем цену со скидкой если есть
            if (finalPrice && finalPrice < basePrice) {
                sizeData.discountedPrice = finalPrice;
                console.log("   \uD83D\uDCCF \u0420\u0430\u0437\u043C\u0435\u0440 \"" + size + "\": " + basePrice + "\u20BD \u2192 " + finalPrice + "\u20BD");
            }
            else {
                console.log("   \uD83D\uDCCF \u0420\u0430\u0437\u043C\u0435\u0440 \"" + size + "\": " + basePrice + "\u20BD");
            }
            return sizeData;
        });
    }
    else {
        console.log("\uD83D\uDCE6 \u0421\u043E\u0437\u0434\u0430\u0435\u043C \u0431\u0435\u0437\u0440\u0430\u0437\u043C\u0435\u0440\u043D\u044B\u0439 \u0442\u043E\u0432\u0430\u0440");
        var sizeData = {
            price: basePrice,
            skus: [mainBarcode]
        };
        // Добавляем цену со скидкой если есть
        if (finalPrice && finalPrice < basePrice) {
            sizeData.discountedPrice = finalPrice;
            console.log("   \uD83D\uDCB0 \u0411\u0435\u0437\u0440\u0430\u0437\u043C\u0435\u0440\u043D\u044B\u0439: " + basePrice + "\u20BD \u2192 " + finalPrice + "\u20BD");
        }
        else {
            console.log("   \uD83D\uDCB0 \u0411\u0435\u0437\u0440\u0430\u0437\u043C\u0435\u0440\u043D\u044B\u0439: " + basePrice + "\u20BD");
        }
        return [sizeData];
    }
}
exports.createWBSizes = createWBSizes;
/**
 * НОВАЯ ФУНКЦИЯ: Создание размеров специально для WB API v2 с двумя ценами
 */
function createWBSizesWithDualPricing(hasVariantSizes, variantSizes, priceInfo, mainBarcode) {
    var originalPrice = Math.max(1, Math.round(Number(priceInfo.original) || 1000));
    var discountPrice = priceInfo.discount ? Math.max(1, Math.round(Number(priceInfo.discount))) : null;
    var hasDiscount = discountPrice && discountPrice < originalPrice;
    console.log("\uD83D\uDCB0 WB API v2 - \u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0440\u0430\u0437\u043C\u0435\u0440\u043E\u0432 \u0441 \u0446\u0435\u043D\u043E\u0432\u043E\u0439 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u0435\u0439:");
    console.log("   - \u041E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u044C\u043D\u0430\u044F \u0446\u0435\u043D\u0430: " + originalPrice + "\u20BD");
    console.log("   - \u0426\u0435\u043D\u0430 \u0441\u043E \u0441\u043A\u0438\u0434\u043A\u043E\u0439: " + (discountPrice ? discountPrice + '₽' : 'отсутствует'));
    console.log("   - \u0415\u0441\u0442\u044C \u0441\u043A\u0438\u0434\u043A\u0430: " + (hasDiscount ? 'да' : 'нет'));
    if (hasVariantSizes && variantSizes && variantSizes.length > 0) {
        var barcodes_2 = generateUniqueBarcodesForSizes(variantSizes.length);
        return variantSizes.map(function (size, index) {
            var sizeObject = {
                techSize: size,
                wbSize: size,
                price: originalPrice,
                skus: [barcodes_2[index]]
            };
            // Если есть скидка, добавляем discountedPrice
            if (hasDiscount) {
                sizeObject.discountedPrice = discountPrice;
            }
            return sizeObject;
        });
    }
    else {
        var sizeObject = {
            price: originalPrice,
            skus: [mainBarcode]
        };
        // Если есть скидка, добавляем discountedPrice
        if (hasDiscount) {
            sizeObject.discountedPrice = discountPrice;
        }
        return [sizeObject];
    }
}
exports.createWBSizesWithDualPricing = createWBSizesWithDualPricing;
function validateProductSizes(hasVariantSizes, variantSizes, categoryId) {
    if (hasVariantSizes) {
        if (!variantSizes || variantSizes.length === 0) {
            return {
                isValid: false,
                error: 'Для товара с размерами необходимо указать хотя бы один размер'
            };
        }
        for (var _i = 0, variantSizes_1 = variantSizes; _i < variantSizes_1.length; _i++) {
            var size = variantSizes_1[_i];
            if (!size || size.trim() === '') {
                return {
                    isValid: false,
                    error: 'Размеры не могут быть пустыми'
                };
            }
        }
        var uniqueSizes = new Set(variantSizes);
        if (uniqueSizes.size !== variantSizes.length) {
            return {
                isValid: false,
                error: 'Размеры должны быть уникальными'
            };
        }
        if (variantSizes.length > 20) {
            return {
                isValid: false,
                error: 'Слишком много размеров (максимум 20)'
            };
        }
    }
    return { isValid: true };
}
exports.validateProductSizes = validateProductSizes;
/**
 * ОБНОВЛЕННАЯ ВАЛИДАЦИЯ: Проверка цен в размерах с поддержкой двух цен
 */
function validateCardForWB(cardData) {
    var errors = [];
    if (!cardData.subjectID) {
        errors.push('Отсутствует ID категории (subjectID)');
    }
    if (!cardData.variants || !Array.isArray(cardData.variants) || cardData.variants.length === 0) {
        errors.push('Отсутствуют варианты товара');
        return { isValid: false, errors: errors };
    }
    var variant = cardData.variants[0];
    if (!variant.vendorCode) {
        errors.push('Отсутствует артикул товара');
    }
    if (!variant.title || variant.title.length < 10) {
        errors.push('Название товара слишком короткое (минимум 10 символов)');
    }
    if (!variant.brand) {
        errors.push('Отсутствует бренд товара');
    }
    if (!variant.dimensions) {
        errors.push('Отсутствуют размеры упаковки');
    }
    else {
        var dims = variant.dimensions;
        if (!dims.length || dims.length < 1) {
            errors.push('Некорректная длина упаковки (минимум 1 см)');
        }
        if (!dims.width || dims.width < 1) {
            errors.push('Некорректная ширина упаковки (минимум 1 см)');
        }
        if (!dims.height || dims.height < 1) {
            errors.push('Некорректная высота упаковки (минимум 1 см)');
        }
        if (!dims.weightBrutto || dims.weightBrutto < 1) {
            errors.push('Некорректный вес упаковки (минимум 1 г)');
        }
    }
    if (!variant.sizes || !Array.isArray(variant.sizes) || variant.sizes.length === 0) {
        errors.push('Отсутствуют размеры товара');
    }
    else {
        for (var _i = 0, _a = variant.sizes; _i < _a.length; _i++) {
            var size = _a[_i];
            if (!size.price || size.price < 1) {
                errors.push('Некорректная цена в размерах (минимум 1 рубль)');
            }
            // НОВАЯ ПРОВЕРКА: валидация цены со скидкой
            if (size.discountedPrice) {
                if (size.discountedPrice < 1) {
                    errors.push('Некорректная цена со скидкой (минимум 1 рубль)');
                }
                if (size.discountedPrice >= size.price) {
                    errors.push('Цена со скидкой должна быть меньше основной цены');
                }
            }
            if (!size.skus || !Array.isArray(size.skus) || size.skus.length === 0) {
                errors.push('Отсутствуют штрихкоды в размерах');
            }
        }
    }
    if (!variant.characteristics || !Array.isArray(variant.characteristics)) {
        errors.push('Отсутствуют характеристики товара');
    }
    else if (variant.characteristics.length < 3) {
        errors.push('Слишком мало характеристик (рекомендуется минимум 3)');
    }
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}
exports.validateCardForWB = validateCardForWB;
/**
 * ОБНОВЛЕННОЕ ЛОГИРОВАНИЕ: Показывает информацию о ценах
 */
function logCardStructure(cardData, title) {
    var _a, _b, _c;
    if (title === void 0) { title = 'Структура карточки'; }
    console.log("\uD83D\uDCCB " + title + ":");
    console.log('├── subjectID:', cardData.subjectID);
    console.log('└── variants[0]:');
    if (cardData.variants && cardData.variants[0]) {
        var variant = cardData.variants[0];
        console.log('    ├── vendorCode:', variant.vendorCode);
        console.log('    ├── title:', ((_a = variant.title) === null || _a === void 0 ? void 0 : _a.slice(0, 50)) + '...');
        console.log('    ├── brand:', variant.brand);
        console.log('    ├── dimensions:', variant.dimensions);
        console.log('    ├── characteristics:', (((_b = variant.characteristics) === null || _b === void 0 ? void 0 : _b.length) || 0) + " \u0448\u0442.");
        console.log('    └── sizes:', (((_c = variant.sizes) === null || _c === void 0 ? void 0 : _c.length) || 0) + " \u0448\u0442.");
        if (variant.characteristics && variant.characteristics.length > 0) {
            console.log('    📊 Характеристики:');
            variant.characteristics.slice(0, 5).forEach(function (char, index) {
                var valueType = typeof char.value;
                var valuePreview = Array.isArray(char.value)
                    ? "[" + char.value.join(', ') + "]"
                    : String(char.value);
                console.log("        " + (index + 1) + ". ID " + char.id + ": " + valuePreview + " (" + valueType + ")");
            });
            if (variant.characteristics.length > 5) {
                console.log("        ... \u0438 \u0435\u0449\u0435 " + (variant.characteristics.length - 5) + " \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A");
            }
        }
        if (variant.sizes && variant.sizes.length > 0) {
            console.log('    📏 Размеры и цены:');
            variant.sizes.forEach(function (size, index) {
                var _a;
                var sizeLabel = size.techSize || 'Без размера';
                var priceInfo = size.discountedPrice
                    ? size.price + "\u20BD \u2192 " + size.discountedPrice + "\u20BD"
                    : size.price + "\u20BD";
                console.log("        " + (index + 1) + ". " + sizeLabel + " - " + priceInfo + " (\u0448\u0442\u0440\u0438\u0445\u043A\u043E\u0434\u043E\u0432: " + (((_a = size.skus) === null || _a === void 0 ? void 0 : _a.length) || 0) + ")");
            });
        }
    }
}
exports.logCardStructure = logCardStructure;
/**
 * НОВАЯ УТИЛИТА: Валидация ценовой информации
 */
function validatePriceInfo(priceInfo) {
    var errors = [];
    if (!priceInfo.original || priceInfo.original < 1) {
        errors.push('Оригинальная цена должна быть больше 0');
    }
    if (priceInfo.discount) {
        if (priceInfo.discount < 1) {
            errors.push('Цена со скидкой должна быть больше 0');
        }
        if (priceInfo.discount >= priceInfo.original) {
            errors.push('Цена со скидкой должна быть меньше оригинальной цены');
        }
    }
    if (!priceInfo.final || priceInfo.final < 1) {
        errors.push('Финальная цена должна быть больше 0');
    }
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}
exports.validatePriceInfo = validatePriceInfo;
/**
 * НОВАЯ УТИЛИТА: Анализ скидки
 */
function analyzeDiscount(originalPrice, discountPrice) {
    var discountAmount = originalPrice - discountPrice;
    var discountPercent = Math.round((discountAmount / originalPrice) * 100);
    var savings = discountAmount;
    var isSignificant = discountPercent >= 10; // Скидка считается значительной если >= 10%
    return {
        discountAmount: discountAmount,
        discountPercent: discountPercent,
        savings: savings,
        isSignificant: isSignificant
    };
}
exports.analyzeDiscount = analyzeDiscount;
/**
 * НОВАЯ УТИЛИТА: Форматирование цен для отображения
 */
function formatPriceDisplay(priceInfo) {
    var originalFormatted = priceInfo.original.toLocaleString('ru-RU') + "\u20BD";
    var finalFormatted = priceInfo.final.toLocaleString('ru-RU') + "\u20BD";
    var hasDiscount = !!(priceInfo.discount && priceInfo.discount < priceInfo.original);
    var discountFormatted = undefined;
    var discountText = undefined;
    if (hasDiscount && priceInfo.discount) {
        discountFormatted = priceInfo.discount.toLocaleString('ru-RU') + "\u20BD";
        var discountPercent = Math.round(((priceInfo.original - priceInfo.discount) / priceInfo.original) * 100);
        discountText = "-" + discountPercent + "%";
    }
    return {
        originalFormatted: originalFormatted,
        discountFormatted: discountFormatted,
        finalFormatted: finalFormatted,
        hasDiscount: hasDiscount,
        discountText: discountText
    };
}
exports.formatPriceDisplay = formatPriceDisplay;
