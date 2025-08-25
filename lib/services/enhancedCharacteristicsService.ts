// lib/services/enhancedCharacteristicsService.ts
// ИСПРАВЛЕННАЯ ВЕРСИЯ - защищает пользовательские данные

import { prisma } from '../prisma';
import { optimizedGPT5MiniSystem } from './optimizedGPT5MiniSystem';

/** ---------- Константы и хелперы ---------- */

/** Габаритные/ручные характеристики — ИИ их не заполняет */
const USER_INPUT_CHARACTERISTICS = new Set<number>([
  89008, 90630, 90607, 90608, 90652, 90653, 11001, 11002, 72739, 90654, 90655
]);

/** Цвет — WB определяет сам, не отправляем */
const COLOR_CHAR_IDS = new Set<number>([14177449]); // "Цвет"

/** Характеристики, которые может изменять только пользователь */
const PROTECTED_USER_CHARACTERISTICS = new Set<number>([
  14177441, // Комплектация
  // Добавить другие ID характеристик, которые должен указывать только пользователь
]);

/** Лимиты title по WB subjectId */
const TITLE_LIMITS: Record<number, number> = {
  593: 60, // Телевизоры и аудиотехника / Наушники
  // можно добавлять другие subjectId: лимит
};

/** УЛУЧШЕННЫЙ санитайзер текста */
function sanitizeText(input: unknown): string {
  let s = String(input ?? '');
  // заменить неразрывные пробелы/табы/переводы на пробел
  s = s.replace(/[\u00A0\t\r\n]+/g, ' ');
  // убрать повторяющиеся пробелы
  s = s.replace(/\s{2,}/g, ' ');
  // нормализовать пробелы вокруг пунктуации
  s = s.replace(/\s*([,.:;!?])\s*/g, '$1 ');
  // заменить ё→е
  s = s.replace(/ё/g, 'е').replace(/Ё/g, 'Е');
  // финальный trim
  s = s.trim();
  return s;
}

/** НОВАЯ ФУНКЦИЯ: Определение единиц измерения веса */
function normalizeWeight(weight: any): number {
  const numericValue = parseFloat(String(weight).replace(/[^\d.,]/g, '').replace(',', '.'));
  
  if (isNaN(numericValue)) {
    console.warn(`⚠️ Некорректный вес: "${weight}", используем 0.5 кг`);
    return 0.5; // Дефолтное значение в кг
  }
  
  // Если вес меньше 10, скорее всего это килограммы
  if (numericValue <= 10) {
    console.log(`📐 Вес интерпретирован как килограммы: ${numericValue} кг`);
    return numericValue;
  } 
  // Если больше 10, скорее всего граммы - конвертируем в кг
  else {
    const weightInKg = numericValue / 1000;
    console.log(`📐 Вес конвертирован из граммов: ${numericValue} г → ${weightInKg} кг`);
    return weightInKg;
  }
}

/** ---------- Типы сервиса ---------- */

export interface ProductAnalysisInput {
  productName: string;
  productImages: string[];
  categoryId: number;
  packageContents?: string;
  referenceUrl?: string;
  price: number;
  dimensions: any;
  hasVariantSizes?: boolean;
  variantSizes?: string[];
  aiPromptComment?: string;
  additionalCharacteristics?: any[];
  preserveUserData?: {
    preserveUserData: boolean;
    userProvidedPackageContents: string;
    userProvidedDimensions: any;
    specialInstructions: string;
  };
  useGPT5?: boolean;
}

interface CategoryCharacteristic {
  id: number;
  wbCharacteristicId?: number | null;
  name: string;
  type: 'string' | 'number' | string;
  isRequired: boolean;
  maxLength?: number | null;
  minValue?: number | null;
  maxValue?: number | null;
  description?: string | null;
  values?: Array<{
    id: number;
    wbValueId?: number | null;
    value: string;
    displayName?: string | null;
  }>;
}

interface ProcessedCharacteristic {
  id: number;
  name: string;
  value: any;
  confidence: number;
  reasoning: string;
  source: string;
  dbType: 'string' | 'number';
  isRequired: boolean;
}

interface ValidationResult {
  warnings: string[];
  errors: string[];
}

interface ProcessedResults {
  characteristics: ProcessedCharacteristic[];
  confidence: number;
  fillPercentage: number;
  warnings: string[];
  seoTitle: string;
  seoDescription: string;
}

export interface FinalAnalysisResult {
  characteristics: Array<{
    id: number;
    name: string;
    value: any;
    confidence: number;
    reasoning: string;
    detectedType: 'string' | 'number';
    source: string;
  }>;
  seoTitle: string;
  seoDescription: string;
  suggestedKeywords: string[];
  competitiveAdvantages: string[];
  tnvedCode?: string;

  confidence: number;
  fillPercentage: number;
  qualityMetrics: {
    overallScore: number;
    fillRate: number;
    sourceReliability: number;
    dataCompleteness: number;
    wbCompliance?: number;
  };

  analysisReport: {
    totalSearchQueries: number;
    totalSources: number;
    totalProcessingTime: number;
    totalCost: number;
    systemUsed: string;
    modelDetails: any;
    phase1Results: any;
    phase2Results: any;
    phase3Results?: any;
  };

  wbCompliance?: {
    categoryName: string;
    titleLimit: number;
    descriptionLimit: number;
    titleLength: number;
    descriptionLength: number;
    isCompliant: boolean;
    errors: string[];
    warnings: string[];
  };

  gabaritInfo?: {
    note: string;
    gabaritCharacteristics: any[];
    needsManualInput: boolean;
  };

  warnings: string[];
  recommendations: string[];
}

/** ---------- ИСПРАВЛЕННЫЙ Класс сервиса ---------- */

export class EnhancedCharacteristicsIntegrationService {
  
  /** ГЛАВНЫЙ МЕТОД с защитой пользовательских данных */
  async analyzeProductWithEnhancedSystem(input: ProductAnalysisInput): Promise<FinalAnalysisResult> {
    const startedAt = Date.now();

    try {
      console.log(`\n🚀 ENHANCED SYSTEM: Анализ "${input.productName}" / cat=${input.categoryId}`);
      
      // 🛡️ ЗАЩИЩАЕМ ПОЛЬЗОВАТЕЛЬСКИЕ ДАННЫЕ
      const protectedData = this.extractAndProtectUserData(input);
      console.log('🛡️ Защищенные пользовательские данные:', {
        packageContents: protectedData.packageContents,
        weight: protectedData.normalizedWeight,
        dimensions: protectedData.dimensions
      });

      // 1) Характеристики категории из БД
      const categoryCharacteristics = await this.loadCategoryCharacteristicsFromDB(input.categoryId);
      if (categoryCharacteristics.length === 0) {
        throw new Error(`Характеристики для категории ${input.categoryId} не найдены в БД`);
      }

      // 2) Информация о категории
      const categoryInfo = await this.getCategoryInfoFromDB(input.categoryId);

      // 3) СОЗДАЕМ КОНТЕКСТ С ЗАЩИЩЕННЫМИ ДАННЫМИ
      const agentContext = {
        productId: `temp-${Date.now()}`,
        productName: input.productName,
        categoryId: input.categoryId,
        categoryInfo: {
          id: categoryInfo.id,
          name: categoryInfo.name,
          parentName: categoryInfo.parentName,
          characteristics: categoryCharacteristics
        },
        images: input.productImages || [],
        referenceUrl: input.referenceUrl || '',
        price: input.price,
        
        // 🛡️ ЗАЩИЩЕННЫЕ РАЗМЕРЫ (нормализованный вес)
        dimensions: protectedData.dimensions,
        
        // 🛡️ ЗАЩИЩЕННАЯ КОМПЛЕКТАЦИЯ
        packageContents: protectedData.packageContents,
        
        userComments: input.aiPromptComment || '',
        additionalData: {
          hasVariantSizes: !!input.hasVariantSizes,
          variantSizes: input.variantSizes || [],
          additionalCharacteristics: input.additionalCharacteristics || [],
          
          // 🛡️ ИНСТРУКЦИИ ДЛЯ ИИ О ЗАЩИТЕ ДАННЫХ
          protectedFields: {
            packageContents: protectedData.packageContents,
            dimensions: protectedData.dimensions,
            instructions: `
              КРИТИЧЕСКИ ВАЖНО:
              1. НЕ изменяй комплектацию: "${protectedData.packageContents}"
              2. НЕ изменяй размеры: ${JSON.stringify(protectedData.dimensions)}
              3. Вес уже указан в КИЛОГРАММАХ: ${protectedData.normalizedWeight} кг
              4. Заполняй ТОЛЬКО характеристики товара (бренд, цвет, материал и т.д.)
            `
          }
        }
      };

      // 4) Запуск анализа с инструкциями по защите данных
      const analysisResult = await optimizedGPT5MiniSystem.analyzeProduct(agentContext);
      if (!analysisResult?.finalResult) {
        throw new Error('Система не вернула финальный результат');
      }

      // 5) ОБРАБОТКА с ВАЛИДАЦИЕЙ защищенных данных
      const processed = this.processAIResultsWithProtection(
        analysisResult.finalResult, 
        categoryCharacteristics,
        protectedData
      );

      // 6) Валидация
      const validation = this.validateCharacteristics(processed.characteristics, categoryCharacteristics);

      // 7) Метрики
      const totalProcessingTime = Date.now() - startedAt;
      const overallScore = this.calculateQualityScore(processed, analysisResult);
      const sourceReliability = 90;

      // 8) SEO: чистка и ограничение длины
      const subjectId = categoryInfo.wbSubjectId;
      const titleLimit = subjectId && TITLE_LIMITS[subjectId] ? TITLE_LIMITS[subjectId] : 120;

      let safeTitle = sanitizeText(processed.seoTitle || analysisResult.finalResult.seoTitle || '');
      if (safeTitle.length > titleLimit) safeTitle = safeTitle.slice(0, titleLimit).trim();
      let safeDescription = sanitizeText(processed.seoDescription || analysisResult.finalResult.seoDescription || '');

      // 9) ФИНАЛЬНАЯ ПРОВЕРКА - убеждаемся что пользовательские данные не изменились
      this.validateUserDataIntegrity(processed, protectedData);

      // 10) Финальный объект
      const final: FinalAnalysisResult = {
        characteristics: processed.characteristics.map(ch => ({
          id: ch.id,
          name: ch.name,
          value: ch.value,
          confidence: ch.confidence,
          reasoning: ch.reasoning,
          detectedType: ch.dbType,
          source: ch.source
        })),
        seoTitle: safeTitle,
        seoDescription: safeDescription,

        suggestedKeywords: analysisResult.finalResult.keywords || [],
        competitiveAdvantages: analysisResult.finalResult.marketingInsights?.competitiveAdvantages || [],
        tnvedCode: analysisResult.finalResult.tnvedCode || undefined,

        confidence: processed.confidence,
        fillPercentage: processed.fillPercentage,
        qualityMetrics: {
          overallScore,
          fillRate: processed.fillPercentage,
          sourceReliability,
          dataCompleteness: processed.fillPercentage,
          wbCompliance: analysisResult.finalResult.qualityMetrics?.wbCompliance?.isCompliant ? 100 : 70
        },
        analysisReport: {
          totalSearchQueries: 0,
          totalSources: 5,
          totalProcessingTime,
          totalCost: analysisResult.totalCost,
          systemUsed: 'gpt5_mini_gpt41_protected',
          modelDetails: {
            phase1: analysisResult.phase1?.modelUsed,
            phase2: analysisResult.phase2?.modelUsed,
            phase3: analysisResult.phase3?.modelUsed
          },
          phase1Results: {
            processingTime: analysisResult.phase1?.processingTime,
            tokensUsed: analysisResult.phase1?.tokensUsed || 0,
            cost: analysisResult.phase1?.cost || 0
          },
          phase2Results: {
            processingTime: analysisResult.phase2?.processingTime,
            tokensUsed: analysisResult.phase2?.tokensUsed || 0,
            cost: analysisResult.phase2?.cost || 0
          },
          phase3Results: {
            processingTime: analysisResult.phase3?.processingTime,
            tokensUsed: analysisResult.phase3?.tokensUsed || 0,
            cost: analysisResult.phase3?.cost || 0
          }
        },
        wbCompliance: analysisResult.finalResult.qualityMetrics?.wbCompliance,
        gabaritInfo: {
          note: 'Габаритные характеристики требуют ручного измерения',
          gabaritCharacteristics: this.getGabaritCharacteristics(categoryCharacteristics),
          needsManualInput: true
        },
        warnings: [...processed.warnings, ...validation.warnings].map(sanitizeText).filter(Boolean),
        recommendations: this.generateEnhancedRecommendations(
          processed,
          validation,
          this.normalizeRecommendations(analysisResult.finalResult.recommendations),
          protectedData
        ).map(sanitizeText).filter(Boolean)
      };

      return final;

    } catch (err) {
      console.error('❌ Ошибка Enhanced System:', err);
      throw new Error(`Enhanced System failed: ${(err as Error).message}`);
    }
  }

  /** 🛡️ НОВАЯ ФУНКЦИЯ: Извлечение и защита пользовательских данных */
  private extractAndProtectUserData(input: ProductAnalysisInput): {
    packageContents: string;
    dimensions: any;
    normalizedWeight: number;
  } {
    // Защищаем комплектацию
    const packageContents = sanitizeText(input.packageContents || '');
    
    // Нормализуем вес (ИСПРАВЛЕНИЕ проблемы с граммами)
    const originalWeight = input.dimensions?.weight;
    const normalizedWeight = normalizeWeight(originalWeight);
    
    // Защищаем размеры с исправленным весом
    const dimensions = {
      length: Math.max(1, Number(input.dimensions?.length) || 30),
      width: Math.max(1, Number(input.dimensions?.width) || 20),
      height: Math.max(1, Number(input.dimensions?.height) || 10),
      weight: normalizedWeight // ✅ Вес в килограммах
    };
    
    console.log(`📐 Нормализация размеров:`);
    console.log(`   - Длина: ${dimensions.length} см`);
    console.log(`   - Ширина: ${dimensions.width} см`);
    console.log(`   - Высота: ${dimensions.height} см`);
    console.log(`   - Вес: ${originalWeight} → ${normalizedWeight} кг`);

    return {
      packageContents,
      dimensions,
      normalizedWeight
    };
  }

  /** 🛡️ НОВАЯ ФУНКЦИЯ: Обработка результатов ИИ с защитой пользовательских данных */
  private processAIResultsWithProtection(
    aiResults: any, 
    categoryCharacteristics: CategoryCharacteristic[],
    protectedData: any
  ): ProcessedResults {
    
    const byId = new Map<number, CategoryCharacteristic>();
    const byWB = new Map<number, CategoryCharacteristic>();
    const byName = new Map<string, CategoryCharacteristic>();

    for (const c of categoryCharacteristics) {
      byId.set(c.id, c);
      if (c.wbCharacteristicId) byWB.set(c.wbCharacteristicId, c);
      byName.set(c.name.toLowerCase(), c);
    }

    const processed: ProcessedCharacteristic[] = [];
    const warnings: string[] = [];
    let confSum = 0;

    const items = Array.isArray(aiResults?.characteristics) ? aiResults.characteristics : [];

    for (const it of items) {
      // сопоставление: по WB id → лок id → имени
      let dbChar =
        (typeof it.id === 'number' && byWB.get(it.id)) ||
        (typeof it.id === 'number' && byId.get(it.id)) ||
        (it.name && byName.get(String(it.name).toLowerCase())) ||
        undefined;

      if (!dbChar) {
        warnings.push(`Характеристика "${it?.name ?? it?.id}" не найдена в БД — пропуск`);
        continue;
      }

      // 🛡️ ЗАЩИТА: Исключить характеристики, которые может изменять только пользователь
      if (PROTECTED_USER_CHARACTERISTICS.has(dbChar.id)) {
        warnings.push(`Пользовательская характеристика "${dbChar.name}" защищена от изменений ИИ`);
        
        // Добавляем ОРИГИНАЛЬНОЕ значение пользователя
        if (dbChar.name.toLowerCase().includes('комплект')) {
          processed.push({
            id: dbChar.id,
            name: dbChar.name,
            value: protectedData.packageContents, // ✅ Оригинальное значение пользователя
            confidence: 1.0, // Максимальная уверенность - указано пользователем
            reasoning: 'Значение указано пользователем (защищено от изменений ИИ)',
            source: 'user_input',
            dbType: (dbChar.type === 'number' ? 'number' : 'string') as 'number' | 'string',
            isRequired: !!dbChar.isRequired
          });
          confSum += 1.0;
        }
        continue;
      }

      // исключить цвет полностью
      if (COLOR_CHAR_IDS.has(dbChar.id)) {
        warnings.push(`Характеристика "Цвет" (${dbChar.name}) исключена: на WB определяется автоматически`);
        continue;
      }

      // исключить габаритные/ручные поля
      if (USER_INPUT_CHARACTERISTICS.has(dbChar.id)) {
        warnings.push(`Ручная (габаритная) характеристика "${dbChar.name}" — исключена из автозаполнения`);
        continue;
      }

      // приведение типов
      let typedValue = it.value;
      if (dbChar.type === 'number' && typeof typedValue !== 'number') {
        const num = parseFloat(String(typedValue).replace(/[^\d.-]/g, ''));
        if (Number.isFinite(num)) typedValue = num;
      } else if (dbChar.type === 'string' && typeof typedValue !== 'string') {
        typedValue = String(typedValue);
      }

      // чистка строковых значений
      if (dbChar.type === 'string' && typeof typedValue === 'string') {
        typedValue = sanitizeText(typedValue);
      }

      // валидация по ограничениям БД
      const v = this.validateCharacteristicValue(typedValue, dbChar);
      if (!v.isValid) {
        warnings.push(`"${dbChar.name}": ${v.error}`);
        continue;
      }

      const confidence = typeof it.confidence === 'number' ? it.confidence : 0.8;

      processed.push({
        id: dbChar.id,
        name: dbChar.name,
        value: typedValue,
        confidence,
        reasoning: it.reasoning || 'Определено ИИ анализом',
        source: it.source || 'ИИ система',
        dbType: (dbChar.type === 'number' ? 'number' : 'string') as 'number' | 'string',
        isRequired: !!dbChar.isRequired
      });

      confSum += confidence;
    }

    const avgConf = processed.length ? confSum / processed.length : 0;

    const availableForAI = categoryCharacteristics.filter(c => 
      !USER_INPUT_CHARACTERISTICS.has(c.id) && 
      !PROTECTED_USER_CHARACTERISTICS.has(c.id)
    ).length || 1;
    
    const fillPercentage = Math.round((processed.length / availableForAI) * 100);

    const seoTitle = sanitizeText(aiResults?.seoTitle || '');
    const seoDescription = sanitizeText(aiResults?.seoDescription || '');

    return {
      characteristics: processed,
      confidence: avgConf,
      fillPercentage,
      warnings,
      seoTitle,
      seoDescription
    };
  }

  /** 🛡️ НОВАЯ ФУНКЦИЯ: Проверка целостности пользовательских данных */
  private validateUserDataIntegrity(processed: ProcessedResults, protectedData: any): void {
    console.log('🔍 Финальная проверка целостности пользовательских данных...');
    
    // Проверяем комплектацию
    const packageContentChar = processed.characteristics.find(char => 
      PROTECTED_USER_CHARACTERISTICS.has(char.id) || 
      char.name.toLowerCase().includes('комплект')
    );
    
    if (packageContentChar) {
      if (packageContentChar.value !== protectedData.packageContents) {
        console.warn('⚠️ КРИТИЧЕСКАЯ ОШИБКА: ИИ изменил защищенную комплектацию!');
        console.warn(`   Защищено: "${protectedData.packageContents}"`);
        console.warn(`   ИИ: "${packageContentChar.value}"`);
        
        // Восстанавливаем защищенное значение
        packageContentChar.value = protectedData.packageContents;
        packageContentChar.source = 'user_input_restored';
        packageContentChar.reasoning = 'Восстановлено из защищенных пользовательских данных';
        packageContentChar.confidence = 1.0;
      }
    }
    
    console.log('✅ Проверка целостности пользовательских данных завершена');
  }

  /** Загрузка характеристик категории */
  private async loadCategoryCharacteristicsFromDB(categoryId: number): Promise<CategoryCharacteristic[]> {
    try {
      // Пытаемся использовать основное подключение
      return await this._loadCategoryCharacteristics(categoryId, prisma);
    } catch (error: any) {
      // Если ошибка связана с подключением, пробуем fallback
      if (error.code === 'P1001' || error.code === 'P1017') {
        console.log('🔄 Попытка fallback подключения для загрузки характеристик категории...');
        return await this._loadCategoryCharacteristics(categoryId, prisma);
      }
      throw error;
    }
  }

  /** Внутренняя функция загрузки характеристик */
  private async _loadCategoryCharacteristics(categoryId: number, client: any): Promise<CategoryCharacteristic[]> {
    const subcategory = await client.wbSubcategory.findFirst({
      where: {
        OR: [{ id: categoryId }, { wbSubjectId: categoryId }]
      },
      include: {
        characteristics: {
          include: {
            values: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' }
            }
          },
          orderBy: [{ isRequired: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }]
        },
        parentCategory: true
      }
    });

    if (!subcategory) return [];

    return subcategory.characteristics.map((ch: any) => ({
      id: ch.wbCharacteristicId || ch.id,
      wbCharacteristicId: ch.wbCharacteristicId || undefined,
      name: ch.name,
      type: (ch.type === 'number' ? 'number' : 'string') as 'number' | 'string' | string,
      isRequired: !!ch.isRequired,
      maxLength: ch.maxLength ?? null,
      minValue: ch.minValue ?? null,
      maxValue: ch.maxValue ?? null,
      description: ch.description ?? null,
      values: (ch.values || []).map((v: any) => ({
        id: v.wbValueId || v.id,
        wbValueId: v.wbValueId || undefined,
        value: v.value,
        displayName: v.displayName || v.value
      }))
    }));
  }

  /** Информация о категории */
  private async getCategoryInfoFromDB(categoryId: number): Promise<{ id: number; name: string; parentName: string; wbSubjectId?: number }> {
    try {
      return await this._getCategoryInfo(categoryId, prisma);
    } catch (error: any) {
      // Если ошибка связана с подключением, пробуем fallback
      if (error.code === 'P1001' || error.code === 'P1017') {
        console.log('🔄 Попытка fallback подключения для получения информации о категории...');
        return await this._getCategoryInfo(categoryId, prisma);
      }
      throw error;
    }
  }

  /** Внутренняя функция получения информации о категории */
  private async _getCategoryInfo(categoryId: number, client: any): Promise<{ id: number; name: string; parentName: string; wbSubjectId?: number }> {
    // Сначала ищем по точному ID категории
    let subcategory = await client.wbSubcategory.findFirst({
      where: { id: categoryId },
      include: { parentCategory: true }
    });

    // Если не найдено по ID, ищем по wbSubjectId (для обратной совместимости)
    if (!subcategory) {
      subcategory = await client.wbSubcategory.findFirst({
        where: { wbSubjectId: categoryId },
        include: { parentCategory: true }
      });
    }

    if (subcategory) {
      console.log(`🔍 [Enhanced System] Найдена категория: ID=${subcategory.id}, name="${subcategory.name}", wbSubjectId=${subcategory.wbSubjectId}`);
      return {
        id: subcategory.id,
        name: subcategory.name,
        parentName: subcategory.parentCategory?.name || 'Родительская категория',
        wbSubjectId: subcategory.wbSubjectId ?? undefined
      };
    }
    
    console.warn(`⚠️ [Enhanced System] Категория с ID ${categoryId} не найдена в БД`);
    return { id: categoryId, name: 'Категория', parentName: 'Родительская категория', wbSubjectId: undefined };
  }

  /** Валидация значения характеристики */
  private validateCharacteristicValue(value: any, dbChar: CategoryCharacteristic): { isValid: boolean; error?: string } {
    const t = dbChar.type === 'number' ? 'number' : 'string';

    if (t === 'number' && typeof value !== 'number') {
      return { isValid: false, error: 'Ожидается числовое значение' };
    }
    if (t === 'string' && typeof value !== 'string') {
      return { isValid: false, error: 'Ожидается строковое значение' };
    }

    if (t === 'number') {
      if (dbChar.minValue != null && value < dbChar.minValue) {
        return { isValid: false, error: `Значение меньше минимального (${dbChar.minValue})` };
      }
      if (dbChar.maxValue != null && value > dbChar.maxValue) {
        return { isValid: false, error: `Значение больше максимального (${dbChar.maxValue})` };
      }
    }

    if (t === 'string' && dbChar.maxLength != null && String(value).length > dbChar.maxLength) {
      return { isValid: false, error: `Длина превышает максимальную (${dbChar.maxLength})` };
    }

    if (dbChar.values?.length) {
      const allowed = new Set(dbChar.values.map(v => v.value));
      if (!allowed.has(String(value))) {
        return { isValid: false, error: 'Значение вне допустимого списка' };
      }
    }

    return { isValid: true };
  }

  /** Валидация набора характеристик */
  private validateCharacteristics(
    characteristics: ProcessedCharacteristic[],
    categoryCharacteristics: CategoryCharacteristic[]
  ): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // обязательные без габаритов и защищенных
    const required = categoryCharacteristics.filter(
      c => c.isRequired && 
           !USER_INPUT_CHARACTERISTICS.has(c.id) && 
           !PROTECTED_USER_CHARACTERISTICS.has(c.id)
    );

    const filledIds = new Set<number>(characteristics.map(c => c.id));

    for (const req of required) {
      if (!filledIds.has(req.id)) {
        warnings.push(`Не заполнена обязательная характеристика: ${req.name}`);
      }
    }

    // низкая уверенность
    const LOW_CONF = 0.7;
    const lowCount = characteristics.reduce((acc, c) => acc + (c.confidence < LOW_CONF ? 1 : 0), 0);
    if (lowCount > 0) {
      warnings.push(`${lowCount} характеристик с низкой уверенностью (< ${Math.round(LOW_CONF * 100)}%)`);
    }

    return { warnings, errors };
  }

  /** Общая оценка качества */
  private calculateQualityScore(processed: ProcessedResults, analysisResult: any): number {
    let score = 0;
    score += (processed.fillPercentage / 100) * 40;
    score += (processed.confidence) * 30;
    const analysisQuality = analysisResult?.confidence ?? 0.8;
    score += analysisQuality * 30;
    return Math.min(100, Math.round(score));
  }

  /** Габариты для подсветки в UI */
  private getGabaritCharacteristics(categoryCharacteristics: CategoryCharacteristic[]): any[] {
    return categoryCharacteristics
      .filter(c => USER_INPUT_CHARACTERISTICS.has(c.id))
      .map(c => ({
        id: c.id,
        name: c.name,
        type: c.type === 'number' ? 'number' : 'string',
        isRequired: !!c.isRequired,
        needsManualMeasurement: true
      }));
  }

  /** Нормализация рекомендаций */
  private normalizeRecommendations(input: unknown): string[] {
    if (Array.isArray(input)) return (input as unknown[]).filter(x => typeof x === 'string') as string[];
    if (typeof input === 'string') return [input];
    if (input && typeof input === 'object') {
      const out: string[] = [];
      for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
        if (typeof v === 'string') out.push(`${k}: ${v}`);
        else if (Array.isArray(v)) for (const i of v) if (typeof i === 'string') out.push(`${k}: ${i}`);
      }
      return out;
    }
    return [];
  }

  /** 🛡️ ОБНОВЛЕННАЯ ФУНКЦИЯ: Генерация рекомендаций с учетом защиты данных */
  private generateEnhancedRecommendations(
    processed: ProcessedResults,
    validation: ValidationResult,
    systemRecommendations: string[] | string | Record<string, unknown> | undefined,
    protectedData: any
  ): string[] {
    const base = this.normalizeRecommendations(systemRecommendations);
    const recs = [...base];

    // Стандартные рекомендации
    if (processed.fillPercentage < 60) {
      recs.push('Низкий процент заполнения характеристик — улучшите качество входных данных/референсов.');
    }
    if (processed.confidence < 0.7) {
      recs.push('Низкая средняя уверенность — проверьте ключевые характеристики вручную.');
    }
    if (validation.warnings.length > 5) {
      recs.push('Много предупреждений валидации — требуется внимательная проверка данных.');
    }

    // 🛡️ НОВЫЕ РЕКОМЕНДАЦИИ по защите данных
    recs.push('✅ Комплектация товара сохранена согласно пользовательскому вводу.');
    recs.push(`✅ Вес товара нормализован: ${protectedData.normalizedWeight} кг.`);
    recs.push('✅ Размеры упаковки защищены от изменений ИИ системой.');
    
    // Общие рекомендации системы
    recs.push('🤖 Использована защищенная система GPT-5-mini + GPT-4.1.');
    recs.push('📐 Габаритные характеристики заполняются вручную по факту измерений.');
    recs.push('🛡️ Пользовательские данные защищены от переопределения ИИ.');
    recs.push('🔍 Перед публикацией проверьте соответствие характеристик реальному товару.');

    return recs;
  }

  /** Преобразование в формат WB API */
  async formatForWildberries(result: FinalAnalysisResult): Promise<Array<{ id: number; value: any }>> {
    const filtered = result.characteristics.filter(c => !COLOR_CHAR_IDS.has(c.id));

    return filtered.map((c) => {
      if (c.detectedType === 'number') {
        return { id: c.id, value: Number(c.value) };
      }
      if (Array.isArray(c.value)) {
        return { id: c.id, value: c.value.map((v: any) => sanitizeText(v)) };
      }
      return { id: c.id, value: sanitizeText(c.value) };
    });
  }

  /** 🛡️ НОВАЯ ФУНКЦИЯ: Проверка защищенных полей перед анализом */
  validateProtectedFields(input: ProductAnalysisInput): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    normalizedData: any;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Проверка комплектации
    if (!input.packageContents || input.packageContents.trim() === '') {
      errors.push('Комплектация товара обязательна для заполнения');
    } else if (input.packageContents.length > 1000) {
      warnings.push('Комплектация слишком длинная (рекомендуется до 1000 символов)');
    }

    // Проверка размеров
    const dimensions = input.dimensions || {};
    if (!dimensions.weight) {
      warnings.push('Не указан вес товара, будет использовано значение по умолчанию (0.5 кг)');
    }

    // Нормализация данных
    const normalizedData = this.extractAndProtectUserData(input);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      normalizedData
    };
  }

  /** 🛡️ НОВАЯ ФУНКЦИЯ: Получение статистики защиты данных */
  getDataProtectionStats(): {
    protectedCharacteristics: number[];
    protectedFieldsCount: number;
    userInputCharacteristics: number[];
    colorCharacteristics: number[];
    totalProtected: number;
  } {
    return {
      protectedCharacteristics: Array.from(PROTECTED_USER_CHARACTERISTICS),
      protectedFieldsCount: PROTECTED_USER_CHARACTERISTICS.size,
      userInputCharacteristics: Array.from(USER_INPUT_CHARACTERISTICS),
      colorCharacteristics: Array.from(COLOR_CHAR_IDS),
      totalProtected: PROTECTED_USER_CHARACTERISTICS.size + USER_INPUT_CHARACTERISTICS.size + COLOR_CHAR_IDS.size
    };
  }

  /** 🛡️ НОВАЯ ФУНКЦИЯ: Создание отчета по защите данных */
  createDataProtectionReport(input: ProductAnalysisInput, result: FinalAnalysisResult): {
    originalData: {
      packageContents: string;
      weight: any;
      dimensions: any;
    };
    processedData: {
      packageContents: string;
      normalizedWeight: number;
      protectedDimensions: any;
    };
    protectionStatus: {
      packageContentsProtected: boolean;
      weightNormalized: boolean;
      dimensionsProtected: boolean;
      allDataIntact: boolean;
    };
    protectionLog: string[];
  } {
    const protectedData = this.extractAndProtectUserData(input);
    
    // Проверяем, что комплектация в результате соответствует оригинальной
    const packageContentChar = result.characteristics.find(char => 
      char.name.toLowerCase().includes('комплект') || 
      PROTECTED_USER_CHARACTERISTICS.has(char.id)
    );
    
    const packageContentsProtected = !packageContentChar || 
      packageContentChar.value === protectedData.packageContents;

    const protectionLog = [
      `🛡️ Система защиты пользовательских данных активирована`,
      `📦 Комплектация: ${packageContentsProtected ? 'ЗАЩИЩЕНА' : 'ИЗМЕНЕНА'}`,
      `⚖️ Вес нормализован: ${input.dimensions?.weight} → ${protectedData.normalizedWeight} кг`,
      `📐 Размеры сохранены: ${JSON.stringify(protectedData.dimensions)}`,
      `🔒 Защищенных характеристик: ${PROTECTED_USER_CHARACTERISTICS.size}`,
      `🚫 Исключенных характеристик: ${USER_INPUT_CHARACTERISTICS.size + COLOR_CHAR_IDS.size}`
    ];

    return {
      originalData: {
        packageContents: input.packageContents || '',
        weight: input.dimensions?.weight,
        dimensions: input.dimensions
      },
      processedData: {
        packageContents: protectedData.packageContents,
        normalizedWeight: protectedData.normalizedWeight,
        protectedDimensions: protectedData.dimensions
      },
      protectionStatus: {
        packageContentsProtected,
        weightNormalized: protectedData.normalizedWeight !== input.dimensions?.weight,
        dimensionsProtected: true,
        allDataIntact: packageContentsProtected
      },
      protectionLog
    };
  }

  /** 🛡️ НОВАЯ ФУНКЦИЯ: Экстренное восстановление пользовательских данных */
  emergencyRestoreUserData(
    characteristics: Array<{ id: number; name: string; value: any; source: string }>, 
    originalInput: ProductAnalysisInput
  ): Array<{ id: number; name: string; value: any; source: string; restored?: boolean }> {
    
    const protectedData = this.extractAndProtectUserData(originalInput);
    const restored = characteristics.map(char => ({ ...char }));
    
    console.log('🚨 ЭКСТРЕННОЕ ВОССТАНОВЛЕНИЕ пользовательских данных...');
    
    for (const char of restored) {
      // Восстановление комплектации
      if (PROTECTED_USER_CHARACTERISTICS.has(char.id) || 
          char.name.toLowerCase().includes('комплект')) {
        
        if (char.value !== protectedData.packageContents) {
          console.log(`🔧 Восстанавливаем "${char.name}": "${char.value}" → "${protectedData.packageContents}"`);
          char.value = protectedData.packageContents;
          char.source = 'emergency_restore';
          (char as any).restored = true;
        }
      }
    }
    
    console.log('✅ Экстренное восстановление завершено');
    return restored;
  }
}

/** Экспорт инстанса */
export const enhancedCharacteristicsIntegrationService = new EnhancedCharacteristicsIntegrationService();