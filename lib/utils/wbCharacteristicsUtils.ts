// lib/utils/wbCharacteristicsUtils.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ С ПОДДЕРЖКОЙ ДВУХ ЦЕН

export function generateEAN13Barcode(): string {
  let code = '22';
  for (let i = 0; i < 10; i++) {
    code += Math.floor(Math.random() * 10);
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return code + checkDigit;
}

export function generateUniqueBarcodesForSizes(sizesCount: number): string[] {
  const barcodes = new Set<string>();
  while (barcodes.size < sizesCount) {
    const barcode = generateEAN13Barcode();
    barcodes.add(barcode);
  }
  return Array.from(barcodes);
}

/**
 * ОБНОВЛЕННАЯ ФУНКЦИЯ: Создание размеров с поддержкой двух цен
 * @param hasVariantSizes - есть ли размеры у товара
 * @param variantSizes - массив размеров
 * @param originalPrice - цена до скидки (обязательная)
 * @param mainBarcode - основной штрихкод
 * @param discountPrice - цена со скидкой (опциональная)
 */
export function createWBSizes(
  hasVariantSizes: boolean,
  variantSizes: string[],
  originalPrice: number,
  mainBarcode: string,
  discountPrice?: number | null
): Array<any> {
  const basePrice = Math.max(1, Math.round(Number(originalPrice) || 1000));
  const finalPrice = discountPrice ? Math.max(1, Math.round(Number(discountPrice))) : null;

  console.log(`💰 Создание размеров WB:`);
  console.log(`   - Цена до скидки: ${basePrice}₽`);
  console.log(`   - Цена со скидкой: ${finalPrice ? finalPrice + '₽' : 'не указана'}`);
  console.log(`   - Размеры: ${hasVariantSizes ? variantSizes?.length || 0 : 'безразмерный'}`);

  if (hasVariantSizes && variantSizes && variantSizes.length > 0) {
    console.log(`👕 Создаем размеры для ${variantSizes.length} вариантов`);
    const barcodes = generateUniqueBarcodesForSizes(variantSizes.length);
    
    return variantSizes.map((size, index) => {
      const sizeData: any = {
        techSize: size,
        wbSize: size,
        price: basePrice, // Цена до скидки
        skus: [barcodes[index]]
      };

      // Добавляем цену со скидкой если есть
      if (finalPrice && finalPrice < basePrice) {
        sizeData.discountedPrice = finalPrice;
        console.log(`   📏 Размер "${size}": ${basePrice}₽ → ${finalPrice}₽`);
      } else {
        console.log(`   📏 Размер "${size}": ${basePrice}₽`);
      }

      return sizeData;
    });
  } else {
    console.log(`📦 Создаем безразмерный товар`);
    const sizeData: any = {
      price: basePrice, // Цена до скидки
      skus: [mainBarcode]
    };

    // Добавляем цену со скидкой если есть
    if (finalPrice && finalPrice < basePrice) {
      sizeData.discountedPrice = finalPrice;
      console.log(`   💰 Безразмерный: ${basePrice}₽ → ${finalPrice}₽`);
    } else {
      console.log(`   💰 Безразмерный: ${basePrice}₽`);
    }

    return [sizeData];
  }
}

/**
 * НОВАЯ ФУНКЦИЯ: Создание размеров специально для WB API v2 с двумя ценами
 */
export function createWBSizesWithDualPricing(
  hasVariantSizes: boolean,
  variantSizes: string[],
  priceInfo: {
    original: number;
    discount?: number | null;
    final: number;
  },
  mainBarcode: string
): Array<any> {
  const originalPrice = Math.max(1, Math.round(Number(priceInfo.original) || 1000));
  const discountPrice = priceInfo.discount ? Math.max(1, Math.round(Number(priceInfo.discount))) : null;
  const hasDiscount = discountPrice && discountPrice < originalPrice;

  console.log(`💰 WB API v2 - Создание размеров с ценовой информацией:`);
  console.log(`   - Оригинальная цена: ${originalPrice}₽`);
  console.log(`   - Цена со скидкой: ${discountPrice ? discountPrice + '₽' : 'отсутствует'}`);
  console.log(`   - Есть скидка: ${hasDiscount ? 'да' : 'нет'}`);

  if (hasVariantSizes && variantSizes && variantSizes.length > 0) {
    const barcodes = generateUniqueBarcodesForSizes(variantSizes.length);
    
    return variantSizes.map((size, index) => {
      const sizeObject: any = {
        techSize: size,
        wbSize: size,
        price: originalPrice, // WB требует основную цену
        skus: [barcodes[index]]
      };

      // Если есть скидка, добавляем discountedPrice
      if (hasDiscount) {
        sizeObject.discountedPrice = discountPrice;
      }

      return sizeObject;
    });
  } else {
    const sizeObject: any = {
      price: originalPrice, // WB требует основную цену
      skus: [mainBarcode]
    };

    // Если есть скидка, добавляем discountedPrice
    if (hasDiscount) {
      sizeObject.discountedPrice = discountPrice;
    }

    return [sizeObject];
  }
}

export function validateProductSizes(
  hasVariantSizes: boolean,
  variantSizes: string[],
  categoryId: number
): { isValid: boolean; error?: string } {
  if (hasVariantSizes) {
    if (!variantSizes || variantSizes.length === 0) {
      return {
        isValid: false,
        error: 'Для товара с размерами необходимо указать хотя бы один размер'
      };
    }

    for (const size of variantSizes) {
      if (!size || size.trim() === '') {
        return {
          isValid: false,
          error: 'Размеры не могут быть пустыми'
        };
      }
    }

    const uniqueSizes = new Set(variantSizes);
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

/**
 * ОБНОВЛЕННАЯ ВАЛИДАЦИЯ: Проверка цен в размерах с поддержкой двух цен
 */
export function validateCardForWB(cardData: any): { isValid: boolean; errors: string[] } {
  const errors = [];

  if (!cardData.subjectID) {
    errors.push('Отсутствует ID категории (subjectID)');
  }

  if (!cardData.variants || !Array.isArray(cardData.variants) || cardData.variants.length === 0) {
    errors.push('Отсутствуют варианты товара');
    return { isValid: false, errors };
  }

  const variant = cardData.variants[0];

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
  } else {
    const dims = variant.dimensions;
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
  } else {
    for (const size of variant.sizes) {
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
  } else if (variant.characteristics.length < 3) {
    errors.push('Слишком мало характеристик (рекомендуется минимум 3)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * ОБНОВЛЕННОЕ ЛОГИРОВАНИЕ: Показывает информацию о ценах
 */
export function logCardStructure(cardData: any, title: string = 'Структура карточки'): void {
  console.log(`📋 ${title}:`);
  console.log('├── subjectID:', cardData.subjectID);
  console.log('└── variants[0]:');
  
  if (cardData.variants && cardData.variants[0]) {
    const variant = cardData.variants[0];
    console.log('    ├── vendorCode:', variant.vendorCode);
    console.log('    ├── title:', variant.title?.slice(0, 50) + '...');
    console.log('    ├── brand:', variant.brand);
    console.log('    ├── dimensions:', variant.dimensions);
    console.log('    ├── characteristics:', `${variant.characteristics?.length || 0} шт.`);
    console.log('    └── sizes:', `${variant.sizes?.length || 0} шт.`);
    
    if (variant.characteristics && variant.characteristics.length > 0) {
      console.log('    📊 Характеристики:');
      variant.characteristics.slice(0, 5).forEach((char: any, index: number) => {
        const valueType = typeof char.value;
        const valuePreview = Array.isArray(char.value) 
          ? `[${char.value.join(', ')}]` 
          : String(char.value);
        console.log(`        ${index + 1}. ID ${char.id}: ${valuePreview} (${valueType})`);
      });
      if (variant.characteristics.length > 5) {
        console.log(`        ... и еще ${variant.characteristics.length - 5} характеристик`);
      }
    }
    
    if (variant.sizes && variant.sizes.length > 0) {
      console.log('    📏 Размеры и цены:');
      variant.sizes.forEach((size: any, index: number) => {
        const sizeLabel = size.techSize || 'Без размера';
        const priceInfo = size.discountedPrice 
          ? `${size.price}₽ → ${size.discountedPrice}₽` 
          : `${size.price}₽`;
        console.log(`        ${index + 1}. ${sizeLabel} - ${priceInfo} (штрихкодов: ${size.skus?.length || 0})`);
      });
    }
  }
}

/**
 * НОВАЯ УТИЛИТА: Валидация ценовой информации
 */
export function validatePriceInfo(priceInfo: {
  original: number;
  discount?: number | null;
  final: number;
}): { isValid: boolean; errors: string[] } {
  const errors = [];
  
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
    errors
  };
}

/**
 * НОВАЯ УТИЛИТА: Анализ скидки
 */
export function analyzeDiscount(originalPrice: number, discountPrice: number): {
  discountAmount: number;
  discountPercent: number;
  savings: number;
  isSignificant: boolean;
} {
  const discountAmount = originalPrice - discountPrice;
  const discountPercent = Math.round((discountAmount / originalPrice) * 100);
  const savings = discountAmount;
  const isSignificant = discountPercent >= 10; // Скидка считается значительной если >= 10%

  return {
    discountAmount,
    discountPercent,
    savings,
    isSignificant
  };
}

/**
 * НОВАЯ УТИЛИТА: Форматирование цен для отображения
 */
export function formatPriceDisplay(priceInfo: {
  original: number;
  discount?: number | null;
  final: number;
}): {
  originalFormatted: string;
  discountFormatted?: string;
  finalFormatted: string;
  hasDiscount: boolean;
  discountText?: string;
} {
  const originalFormatted = `${priceInfo.original.toLocaleString('ru-RU')}₽`;
  const finalFormatted = `${priceInfo.final.toLocaleString('ru-RU')}₽`;
  const hasDiscount = !!(priceInfo.discount && priceInfo.discount < priceInfo.original);
  
  let discountFormatted = undefined;
  let discountText = undefined;
  
  if (hasDiscount && priceInfo.discount) {
    discountFormatted = `${priceInfo.discount.toLocaleString('ru-RU')}₽`;
    const discountPercent = Math.round(((priceInfo.original - priceInfo.discount) / priceInfo.original) * 100);
    discountText = `-${discountPercent}%`;
  }

  return {
    originalFormatted,
    discountFormatted,
    finalFormatted,
    hasDiscount,
    discountText
  };
}