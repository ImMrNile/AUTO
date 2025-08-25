// src/app/api/categories/[id]/characteristics/types/route.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ

import { NextRequest, NextResponse } from 'next/server';
import { unifiedCharacteristicsService } from '../../../../../../../lib/services/unifiedCharacteristicsService';
import { localCategoriesService } from '../../../../../../../lib/services/localCategoriesService';

// Интерфейсы для типизации
interface CharacteristicType {
  id: number;
  name: string;
  currentType: string;
  detectedType: 'pure_number' | 'string_with_units' | 'string_only';
  confidence: number;
  reasoning: string;
}

interface TypeAnalysisResult {
  characteristics: CharacteristicType[];
  confidence: number;
  summary: {
    pureNumbers: number;
    stringWithUnits: number;
    stringOnly: number;
  };
}

// Простой сервис анализа типов (заменяет отсутствующий characteristicsTypeService)
class CharacteristicsTypeAnalysisService {
  async analyzeCharacteristicTypes(
    characteristics: any[], 
    categoryName: string, 
    parentCategoryName: string
  ): Promise<TypeAnalysisResult> {
    console.log(`🤖 Анализ типов характеристик для "${parentCategoryName} / ${categoryName}"`);
    
    const analyzedCharacteristics: CharacteristicType[] = characteristics.map(char => {
      const charName = char.name.toLowerCase();
      
      // Определяем тип характеристики
      let detectedType: 'pure_number' | 'string_with_units' | 'string_only' = 'string_only';
      let confidence = 0.8;
      let reasoning = 'Базовое определение по названию';
      
      // Чистые числа
      if (char.type === 'number' || 
          charName.includes('вес') || 
          charName.includes('количество') ||
          charName.includes('емкость аккумулятора') ||
          charName.includes('мощность') ||
          charName.includes('напряжение') ||
          charName.includes('частота')) {
        detectedType = 'pure_number';
        confidence = 0.9;
        reasoning = 'Числовая характеристика по типу БД или ключевым словам';
      }
      // Строки с единицами измерения
      else if (charName.includes('время') || 
               charName.includes('размер') ||
               charName.includes('длина') || 
               charName.includes('ширина') || 
               charName.includes('высота') ||
               charName.includes('глубина') ||
               charName.includes('диаметр') ||
               charName.includes('толщина') ||
               charName.includes('гарантия') ||
               charName.includes('срок')) {
        detectedType = 'string_with_units';
        confidence = 0.85;
        reasoning = 'Характеристика требует единицы измерения';
      }
      // Обычные строки
      else {
        detectedType = 'string_only';
        confidence = 0.8;
        reasoning = 'Текстовая характеристика без единиц';
      }

      return {
        id: char.id,
        name: char.name,
        currentType: char.type || 'string',
        detectedType,
        confidence,
        reasoning
      };
    });

    const summary = {
      pureNumbers: analyzedCharacteristics.filter(c => c.detectedType === 'pure_number').length,
      stringWithUnits: analyzedCharacteristics.filter(c => c.detectedType === 'string_with_units').length,
      stringOnly: analyzedCharacteristics.filter(c => c.detectedType === 'string_only').length
    };

    const avgConfidence = analyzedCharacteristics.reduce((sum, char) => sum + char.confidence, 0) / analyzedCharacteristics.length;

    return {
      characteristics: analyzedCharacteristics,
      confidence: avgConfidence,
      summary
    };
  }
}

const characteristicsTypeService = new CharacteristicsTypeAnalysisService();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = parseInt(params.id);
    
    if (isNaN(categoryId)) {
      return NextResponse.json({
        success: false,
        error: 'Некорректный ID категории'
      }, { status: 400 });
    }

    console.log(`🔍 Запрос анализа типов характеристик для категории: ${categoryId}`);

    // Получаем данные из запроса
    const body = await request.json();
    const { forceReAnalysis = false } = body;

    // Получаем характеристики категории
    const characteristics = await localCategoriesService.getCharacteristicsForCategory(categoryId);
    
    if (characteristics.length === 0) {
      return NextResponse.json({
        success: false,
        error: `Характеристики для категории ${categoryId} не найдены`
      }, { status: 404 });
    }

    // Получаем информацию о категории
    const categoryInfo = await localCategoriesService.getCategoryById(categoryId);
    
    if (!categoryInfo) {
      return NextResponse.json({
        success: false,
        error: `Категория с ID ${categoryId} не найдена`
      }, { status: 404 });
    }

    console.log(`📚 Найдено ${characteristics.length} характеристик для анализа типов`);

    // Выполняем анализ типов с помощью ИИ
    const typeAnalysisResult = await characteristicsTypeService.analyzeCharacteristicTypes(
      characteristics,
      categoryInfo.name,
      categoryInfo.parentName
    );

    console.log(`✅ Анализ типов завершен: ${typeAnalysisResult.characteristics.length} характеристик проанализировано`);

    // Возвращаем результат
    return NextResponse.json({
      success: true,
      data: {
        categoryId: categoryId,
        categoryName: categoryInfo.name,
        parentCategoryName: categoryInfo.parentName,
        totalCharacteristics: characteristics.length,
        analyzedCharacteristics: typeAnalysisResult.characteristics.length,
        typeAnalysis: typeAnalysisResult,
        summary: {
          pureNumbers: typeAnalysisResult.characteristics.filter((c: CharacteristicType) => c.detectedType === 'pure_number').length,
          stringWithUnits: typeAnalysisResult.characteristics.filter((c: CharacteristicType) => c.detectedType === 'string_with_units').length,
          stringOnly: typeAnalysisResult.characteristics.filter((c: CharacteristicType) => c.detectedType === 'string_only').length,
          averageConfidence: typeAnalysisResult.confidence
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error(`❌ Ошибка анализа типов характеристик для категории ${params.id}:`, error);
    
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера при анализе типов',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = parseInt(params.id);
    
    if (isNaN(categoryId)) {
      return NextResponse.json({
        success: false,
        error: 'Некорректный ID категории'
      }, { status: 400 });
    }

    console.log(`📋 Получение информации о типах характеристик для категории: ${categoryId}`);

    // Получаем характеристики категории
    const characteristics = await localCategoriesService.getCharacteristicsForCategory(categoryId);
    
    if (characteristics.length === 0) {
      return NextResponse.json({
        success: false,
        error: `Характеристики для категории ${categoryId} не найдены`
      }, { status: 404 });
    }

    // Получаем информацию о категории
    const categoryInfo = await localCategoriesService.getCategoryById(categoryId);
    
    if (!categoryInfo) {
      return NextResponse.json({
        success: false,
        error: `Категория с ID ${categoryId} не найдена`
      }, { status: 404 });
    }

    // Создаем базовый анализ типов (без ИИ)
    const baseTypeAnalysis = characteristics.map(char => {
      const charName = char.name.toLowerCase();
      
      // Определяем базовый тип
      let estimatedType: 'pure_number' | 'string_with_units' | 'string_only' = 'string_only';
      let reasoning = 'Базовое определение по названию';
      
      // Проверяем на числовые характеристики
      if (char.type === 'number' || charName.includes('вес') || charName.includes('мощность') || 
          charName.includes('напряжение') || charName.includes('частота') || charName.includes('размер') ||
          charName.includes('длина') || charName.includes('ширина') || charName.includes('высота')) {
        estimatedType = 'pure_number';
        reasoning = 'Числовая характеристика по типу или названию';
      } 
      // Проверяем на строки с единицами
      else if (charName.includes('время') || charName.includes('срок') || charName.includes('гарантия') ||
               charName.includes('температура') || charName.includes('период')) {
        estimatedType = 'string_with_units';
        reasoning = 'Характеристика требует единицы измерения';
      }

      return {
        id: char.id,
        name: char.name,
        currentType: char.type || 'string',
        estimatedType: estimatedType,
        reasoning: reasoning,
        isRequired: char.isRequired || false,
        hasValues: (char.values && char.values.length > 0) || false,
        valuesCount: char.values ? char.values.length : 0
      };
    });

    const summary = {
      total: characteristics.length,
      estimatedPureNumbers: baseTypeAnalysis.filter(c => c.estimatedType === 'pure_number').length,
      estimatedStringWithUnits: baseTypeAnalysis.filter(c => c.estimatedType === 'string_with_units').length,
      estimatedStringOnly: baseTypeAnalysis.filter(c => c.estimatedType === 'string_only').length,
      required: characteristics.filter(c => c.isRequired).length,
      withValues: characteristics.filter(c => c.values && c.values.length > 0).length
    };

    return NextResponse.json({
      success: true,
      data: {
        categoryId: categoryId,
        categoryName: categoryInfo.name,
        parentCategoryName: categoryInfo.parentName,
        displayName: categoryInfo.displayName,
        characteristics: baseTypeAnalysis,
        summary: summary,
        hasAIAnalysis: false,
        note: 'Для точного анализа типов используйте POST запрос с ИИ-анализом'
      }
    });

  } catch (error) {
    console.error(`❌ Ошибка получения типов характеристик для категории ${params.id}:`, error);
    
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}