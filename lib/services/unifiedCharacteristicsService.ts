// lib/services/enhancedTypingProcessor.ts - УЛУЧШЕННЫЙ ПРОЦЕССОР ТИПИЗАЦИИ

interface CharacteristicWithType {
  id: number;
  name: string;
  type: 'string' | 'number';
  value: any;
  confidence: number;
  source: string;
  reasoning: string;
}

interface TypingRule {
  pattern: RegExp;
  stringFormat: (value: number) => string;
  examples: string[];
}

export class UnifiedCharacteristicsService {

  /**
   * ГЛАВНАЯ ФУНКЦИЯ - улучшенная обработка типизации с правилами
   */
  processCharacteristicsWithEnhancedTyping(
    aiCharacteristics: any[],
    categoryCharacteristics: any[]
  ): CharacteristicWithType[] {
    console.log('🔧 ENHANCED TYPING: Обработка характеристик с улучшенной типизацией');
    
    const processed: CharacteristicWithType[] = [];
    const typingRules = this.getTypingRules();
    
    for (const aiChar of aiCharacteristics) {
      const dbChar = categoryCharacteristics.find(c => c.id === aiChar.id);
      if (!dbChar) continue;
      
      console.log(`\n🔍 PROCESSING: ${dbChar.name} (ID: ${aiChar.id})`);
      console.log(`   📊 DB Type: ${dbChar.type}`);
      console.log(`   🎯 AI Value: "${aiChar.value}"`);
      
      const processedChar = this.applyEnhancedTyping(aiChar, dbChar, typingRules);
      if (processedChar) {
        processed.push(processedChar);
        console.log(`   ✅ RESULT: ${JSON.stringify(processedChar.value)} (${dbChar.type})`);
      }
    }
    
    return processed;
  }

  /**
   * ПРАВИЛА ТИПИЗАЦИИ для различных характеристик
   */
  private getTypingRules(): Map<string, TypingRule> {
    const rules = new Map<string, TypingRule>();
    
    // ВРЕМЯ ЗАРЯДКИ
    rules.set('время_зарядки', {
      pattern: /время.*зарядк/i,
      stringFormat: (value: number) => {
        if (value === 1) return '1 час';
        if (value === 2) return '2 часа';
        if (value <= 4) return `${value} часа`;
        if (value <= 10) return `${value} часов`;
        if (value <= 120) return `${value} минут`;
        return `${Math.round(value / 60)} часов`;
      },
      examples: ['1 час', '2 часа', '3 часа', '120 минут']
    });
    
    // ВРЕМЯ РАБОТЫ
    rules.set('время_работы', {
      pattern: /время.*работ|автономн/i,
      stringFormat: (value: number) => {
        if (value === 1) return '1 час';
        if (value <= 4) return `${value} часа`;
        if (value <= 100) return `${value} часов`;
        return `${Math.round(value / 60)} часов`;
      },
      examples: ['8 часов', '60 часов', '24 часа']
    });
    
    // ЕМКОСТЬ АККУМУЛЯТОРА
    rules.set('емкость', {
      pattern: /емкость/i,
      stringFormat: (value: number) => {
        if (value >= 100) return `${value} мАч`;
        return `${value * 1000} мАч`;
      },
      examples: ['400 мАч', '3000 мАч', '5000 мАч']
    });
    
    // ИМПЕДАНС
    rules.set('импеданс', {
      pattern: /импеданс/i,
      stringFormat: (value: number) => `${value} Ом`,
      examples: ['16 Ом', '32 Ом', '64 Ом']
    });
    
    // ЧАСТОТА
    rules.set('частота', {
      pattern: /частота/i,
      stringFormat: (value: number) => {
        if (value >= 1000) return `${value / 1000} кГц`;
        return `${value} Гц`;
      },
      examples: ['20 Гц', '1 кГц', '20 кГц']
    });
    
    // ЧУВСТВИТЕЛЬНОСТЬ
    rules.set('чувствительность', {
      pattern: /чувствительност/i,
      stringFormat: (value: number) => `${value} дБ`,
      examples: ['100 дБ', '104 дБ', '110 дБ']
    });
    
    // МОЩНОСТЬ
    rules.set('мощность', {
      pattern: /мощность/i,
      stringFormat: (value: number) => `${value} Вт`,
      examples: ['5 Вт', '10 Вт', '20 Вт']
    });
    
    // НАПРЯЖЕНИЕ
    rules.set('напряжение', {
      pattern: /напряжен/i,
      stringFormat: (value: number) => `${value} В`,
      examples: ['3.7 В', '5 В', '12 В']
    });
    
    // ГАРАНТИЙНЫЙ СРОК
    rules.set('гарантия', {
      pattern: /гарантия|срок/i,
      stringFormat: (value: number) => {
        if (value >= 12) {
          const years = Math.round(value / 12);
          if (years === 1) return '1 год';
          if (years <= 4) return `${years} года`;
          return `${years} лет`;
        }
        if (value === 1) return '1 месяц';
        if (value <= 4) return `${value} месяца`;
        return `${value} месяцев`;
      },
      examples: ['6 месяцев', '1 год', '2 года']
    });
    
    return rules;
  }

  /**
   * ПРИМЕНЕНИЕ УЛУЧШЕННОЙ ТИПИЗАЦИИ
   */
  private applyEnhancedTyping(
    aiChar: any,
    dbChar: any,
    typingRules: Map<string, TypingRule>
  ): CharacteristicWithType | null {
    
    const name = dbChar.name;
    const type = dbChar.type;
    let value = aiChar.value;
    
    // Находим подходящее правило типизации
    const applicableRule = this.findApplicableRule(name, typingRules);
    
    if (type === 'string') {
      // ДЛЯ СТРОКОВЫХ ПОЛЕЙ - добавляем единицы измерения
      const processedValue = this.processStringValue(value, applicableRule, name);
      
      return {
        id: aiChar.id,
        name: name,
        type: 'string',
        value: processedValue,
        confidence: aiChar.confidence || 0.8,
        source: aiChar.source || 'Enhanced Typing',
        reasoning: `STRING тип: ${applicableRule ? 'применено правило типизации' : 'обработано как строка'}`
      };
      
    } else if (type === 'number') {
      // ДЛЯ ЧИСЛОВЫХ ПОЛЕЙ - извлекаем чистое число
      const processedValue = this.processNumberValue(value, name);
      
      if (processedValue !== null) {
        return {
          id: aiChar.id,
          name: name,
          type: 'number',
          value: processedValue,
          confidence: aiChar.confidence || 0.8,
          source: aiChar.source || 'Enhanced Typing',
          reasoning: `NUMBER тип: извлечено чистое число`
        };
      }
    }
    
    return null;
  }

  /**
   * ПОИСК ПРИМЕНИМОГО ПРАВИЛА
   */
  private findApplicableRule(name: string, rules: Map<string, TypingRule>): TypingRule | null {
    for (const [key, rule] of rules) {
      if (rule.pattern.test(name)) {
        console.log(`   🎯 Найдено правило: ${key}`);
        return rule;
      }
    }
    return null;
  }

  /**
   * ОБРАБОТКА СТРОКОВЫХ ЗНАЧЕНИЙ с правилами
   */
  private processStringValue(value: any, rule: TypingRule | null, name: string): string {
    const stringValue = String(value).trim();
    
    // Если единицы уже есть - возвращаем как есть
    if (this.hasUnits(stringValue)) {
      console.log(`   ✅ Единицы уже есть: "${stringValue}"`);
      return stringValue;
    }
    
    // Если есть правило типизации - применяем его
    if (rule) {
      const numValue = this.extractNumber(stringValue);
      if (numValue !== null) {
        const formatted = rule.stringFormat(numValue);
        console.log(`   🔧 Применено правило: "${stringValue}" → "${formatted}"`);
        return formatted;
      }
    }
    
    // Общие правила для строк без специальных правил
    return this.applyGeneralStringRules(stringValue, name);
  }

  /**
   * ОБРАБОТКА ЧИСЛОВЫХ ЗНАЧЕНИЙ
   */
  private processNumberValue(value: any, name: string): number | null {
    if (typeof value === 'number') {
      console.log(`   🔢 Уже число: ${value}`);
      return value;
    }
    
    const extracted = this.extractNumber(String(value));
    if (extracted !== null) {
      console.log(`   🔢 Извлечено число: "${value}" → ${extracted}`);
      return extracted;
    }
    
    console.warn(`   ⚠️ Не удалось извлечь число из: "${value}"`);
    return null;
  }

  /**
   * ИЗВЛЕЧЕНИЕ ЧИСЛА из строки
   */
  private extractNumber(value: string): number | null {
    // Удаляем все кроме цифр, точек и запятых
    const cleaned = value.replace(/[^\d.,]/g, '').replace(/,/g, '.');
    
    // Ищем первое число
    const match = cleaned.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      const num = parseFloat(match[1]);
      if (!isNaN(num)) {
        return num;
      }
    }
    
    return null;
  }

  /**
   * ПРОВЕРКА НАЛИЧИЯ ЕДИНИЦ ИЗМЕРЕНИЯ
   */
  private hasUnits(value: string): boolean {
    const unitsPatterns = [
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

    return unitsPatterns.some(pattern => pattern.test(value));
  }

  /**
   * ОБЩИЕ ПРАВИЛА для строк без специальных правил
   */
  private applyGeneralStringRules(value: string, name: string): string {
    const nameLower = name.toLowerCase();
    const numValue = this.extractNumber(value);
    
    if (numValue === null) {
      console.log(`   📝 Нет числа, возвращаем как строку: "${value}"`);
      return value;
    }
    
    // Дополнительные правила для неохваченных случаев
    if (nameLower.includes('диаметр') || nameLower.includes('размер')) {
      if (numValue <= 10) return `${numValue} см`;
      return `${numValue} мм`;
    }
    
    if (nameLower.includes('вес') && !nameLower.includes('упаковк')) {
      if (numValue < 1) return `${numValue * 1000} г`;
      return `${numValue} кг`;
    }
    
    if (nameLower.includes('длина') || nameLower.includes('высота') || nameLower.includes('ширина')) {
      if (numValue <= 100) return `${numValue} см`;
      return `${numValue} мм`;
    }
    
    console.log(`   📝 Неопознанная характеристика, возвращаем: "${value}"`);
    return value;
  }

  /**
   * ВАЛИДАЦИЯ ТИПИЗИРОВАННЫХ РЕЗУЛЬТАТОВ
   */
  validateTypedCharacteristics(characteristics: CharacteristicWithType[]): {
    valid: CharacteristicWithType[];
    invalid: Array<{ char: CharacteristicWithType; errors: string[] }>;
    summary: {
      totalProcessed: number;
      validCount: number;
      invalidCount: number;
      stringCount: number;
      numberCount: number;
    };
  } {
    console.log('\n🔍 ВАЛИДАЦИЯ типизированных характеристик...');
    
    const valid: CharacteristicWithType[] = [];
    const invalid: Array<{ char: CharacteristicWithType; errors: string[] }> = [];
    
    for (const char of characteristics) {
      const errors: string[] = [];
      
      // Проверка типа
      if (char.type === 'string' && typeof char.value !== 'string') {
        errors.push(`Ожидается string, получено ${typeof char.value}`);
      }
      
      if (char.type === 'number' && typeof char.value !== 'number') {
        errors.push(`Ожидается number, получено ${typeof char.value}`);
      }
      
      // Проверка наличия единиц для строковых полей с числовыми значениями
      if (char.type === 'string' && typeof char.value === 'string') {
        const hasNumber = this.extractNumber(char.value) !== null;
        const hasUnits = this.hasUnits(char.value);
        
        if (hasNumber && !hasUnits && this.needsUnits(char.name)) {
          errors.push(`Числовая характеристика без единиц измерения`);
        }
      }
      
      if (errors.length === 0) {
        valid.push(char);
        console.log(`   ✅ ВАЛИДНАЯ: ${char.name} = ${JSON.stringify(char.value)}`);
      } else {
        invalid.push({ char, errors });
        console.log(`   ❌ НЕВАЛИДНАЯ: ${char.name} - ${errors.join(', ')}`);
      }
    }
    
    const summary = {
      totalProcessed: characteristics.length,
      validCount: valid.length,
      invalidCount: invalid.length,
      stringCount: valid.filter(c => c.type === 'string').length,
      numberCount: valid.filter(c => c.type === 'number').length
    };
    
    console.log(`\n📊 ВАЛИДАЦИЯ ЗАВЕРШЕНА:`);
    console.log(`   ✅ Валидных: ${summary.validCount}`);
    console.log(`   ❌ Невалидных: ${summary.invalidCount}`);
    console.log(`   📝 Строковых: ${summary.stringCount}`);
    console.log(`   🔢 Числовых: ${summary.numberCount}`);
    
    return { valid, invalid, summary };
  }

  /**
   * ПРОВЕРКА необходимости единиц измерения
   */
  private needsUnits(name: string): boolean {
    const nameLower = name.toLowerCase();
    const needsUnitsKeywords = [
      'время', 'емкость', 'импеданс', 'частота', 'чувствительност',
      'мощность', 'напряжен', 'гарантия', 'срок', 'диаметр', 'размер'
    ];
    
    return needsUnitsKeywords.some(keyword => nameLower.includes(keyword));
  }

  /**
   * ДЕМОНСТРАЦИЯ правил типизации
   */
  demonstrateTypingRules(): void {
    console.log('\n🎯 ДЕМОНСТРАЦИЯ ПРАВИЛ ТИПИЗАЦИИ:');
    
    const rules = this.getTypingRules();
    
    for (const [key, rule] of rules) {
      console.log(`\n📋 ${key.toUpperCase()}:`);
      console.log(`   🔍 Паттерн: ${rule.pattern}`);
      console.log(`   📝 Примеры: ${rule.examples.join(', ')}`);
      
      // Демонстрируем работу правила
      const testValues = [1, 2, 8, 32, 400, 20000];
      console.log(`   🧪 Тестирование:`);
      testValues.forEach(val => {
        try {
          const result = rule.stringFormat(val);
          console.log(`      ${val} → "${result}"`);
        } catch (e) {
          console.log(`      ${val} → ошибка`);
        }
      });
    }
  }

  /**
   * ФОРМАТИРОВАНИЕ для WB API с правильными типами
   */
  formatForWB(characteristics: CharacteristicWithType[]): Array<{ id: number; value: any }> {
    console.log('\n📦 ФОРМАТИРОВАНИЕ для WB API...');
    
    return characteristics.map(char => {
      let wbValue: any;
      
      if (char.type === 'number') {
        wbValue = char.value; // Числа как есть
        console.log(`   🔢 ${char.name}: ${wbValue}`);
      } else {
        wbValue = [char.value]; // Строки в массиве
        console.log(`   📝 ${char.name}: ${JSON.stringify(wbValue)}`);
      }
      
      return {
        id: char.id,
        value: wbValue
      };
    });
  }

  /**
   * ИСПРАВЛЕНИЕ проблемных значений ПЕРЕД типизацией
   */
  fixCommonIssues(value: any, name: string): any {
    const nameLower = name.toLowerCase();
    
    // Время зарядки: исправляем "2 минуты" на "2 часа"
    if (nameLower.includes('время зарядки')) {
      if (value === '2 минуты' || value === '2 минут') {
        console.log(`🔧 ИСПРАВЛЕНО: "${value}" → "2 часа"`);
        return '2 часа';
      }
    }
    
    // Емкость: исправляем малые значения
    if (nameLower.includes('емкость')) {
      const num = this.extractNumber(String(value));
      if (num !== null && num < 10) {
        console.log(`🔧 ИСПРАВЛЕНО емкость: "${value}" → "${num * 1000} мАч"`);
        return `${num * 1000} мАч`;
      }
    }
    
    // Частота: преобразуем кГц в Гц
    if (nameLower.includes('частота') && String(value).toLowerCase().includes('кгц')) {
      const num = this.extractNumber(String(value));
      if (num !== null) {
        console.log(`🔧 ИСПРАВЛЕНО частота: "${value}" → "${num * 1000} Гц"`);
        return `${num * 1000} Гц`;
      }
    }
    
    return value;
  }
}

export const unifiedCharacteristicsService = new UnifiedCharacteristicsService();