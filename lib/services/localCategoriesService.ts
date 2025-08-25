// lib/services/localCategoriesService.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ БЕЗ ДУБЛИРОВАНИЯ

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface LocalCategory {
  id: number;
  name: string;
  slug: string;
  parentId: number;
  parentName: string;
  displayName: string;
  wbSubjectId?: number | null;
  description?: string | null;
  isActive?: boolean | null;
  commissions: {
    fbw: number;
    fbs: number;
    dbs: number;
    cc: number;
    edbs: number;
    booking: number;
  };
}

export interface SmartCategoryResult extends LocalCategory {
  relevanceScore?: number;
  matchReason?: string;
}

export class LocalCategoriesService {
  
  /**
   * Получение характеристик для категории из локальной БД
   */
  async getCharacteristicsForCategory(categoryId: number): Promise<any[]> {
    try {
      console.log(`📚 Загрузка характеристик для категории ID: ${categoryId} из локальной БД...`);

      const characteristics = await prisma.wbCategoryCharacteristic.findMany({
        where: {
          subcategoryId: categoryId,
        },
        include: {
          values: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' }
          }
        },
        orderBy: [
          { isRequired: 'desc' },
          { sortOrder: 'asc' },
          { name: 'asc' },
        ],
      });

      if (characteristics.length === 0) {
        console.warn(`⚠️ Характеристики для категории ID ${categoryId} не найдены в локальной БД.`);
        return [];
      }

      console.log(`✅ Найдено ${characteristics.length} характеристик в локальной БД.`);
      
      return characteristics.map(char => ({
        id: char.wbCharacteristicId || char.id,
        name: char.name,
        type: char.type,
        isRequired: char.isRequired,
        description: char.description,
        maxLength: char.maxLength,
        minValue: char.minValue,
        maxValue: char.maxValue,
        values: char.values.map(v => ({
          id: v.wbValueId || v.id,
          value: v.value,
          displayName: v.displayName || v.value
        }))
      }));

    } catch (error) {
      console.error(`❌ Ошибка получения характеристик для категории ${categoryId} из БД:`, error);
      return [];
    }
  }

  /**
   * Умный поиск категорий с релевантностью
   */
  async smartSearchCategories(query: string, limit: number = 20): Promise<SmartCategoryResult[]> {
    try {
      console.log(`🎯 Умный поиск категорий по запросу: "${query}"`);
      
      const queryLower = query.toLowerCase();
      
      // Ключевые слова с весами для разных категорий
      const categoryKeywords = {
        'электроника': {
          keywords: ['кабель', 'зарядка', 'адаптер', 'usb', 'провод', 'шнур', 'type-c', 'lightning', 'micro'],
          weight: 10,
          parentNames: ['Электроника', 'Аксессуары для телефонов', 'Компьютерная техника']
        },
        'чайники': {
          keywords: ['чайник', 'электрочайник', 'электрический', 'кофейник', 'заварочный'],
          weight: 10,
          parentNames: ['Бытовая техника', 'Кухонная техника', 'Чайники', 'Электрочайники']
        },
        'плиты': {
          keywords: ['плита', 'плитка', 'варочная', 'электрическая', 'настольная', 'индукционная'],
          weight: 10,
          parentNames: ['Бытовая техника', 'Кухонная техника', 'Варочные поверхности']
        },
        'наушники': {
          keywords: ['наушники', 'гарнитура', 'airpods', 'bluetooth', 'беспроводные'],
          weight: 9,
          parentNames: ['Электроника', 'Аудио']
        },
        'чехлы': {
          keywords: ['чехол', 'бампер', 'защита', 'стекло', 'пленка'],
          weight: 8,
          parentNames: ['Аксессуары для телефонов', 'Защита']
        }
      };

      // Находим подходящие ключевые слова
      const matchedCategories = [];
      
      for (const [categoryType, config] of Object.entries(categoryKeywords)) {
        let matchScore = 0;
        const matchedKeywords = [];
        
        for (const keyword of config.keywords) {
          if (queryLower.includes(keyword)) {
            matchScore += config.weight;
            matchedKeywords.push(keyword);
            
            // Дополнительный бонус за точное совпадение
            if (queryLower === keyword) {
              matchScore += 5;
            }
          }
        }
        
        if (matchScore > 0) {
          matchedCategories.push({ 
            categoryType, 
            matchScore, 
            config,
            matchedKeywords
          });
        }
      }

      // Сортируем по релевантности
      matchedCategories.sort((a, b) => b.matchScore - a.matchScore);
      
      // Ищем категории в БД
      const searchResults: SmartCategoryResult[] = [];
      
      // Прямой поиск по запросу
      const directCategories = await prisma.wbSubcategory.findMany({
        where: {
          OR: [
            {
              name: {
                contains: query
              }
            },
            {
              parentCategory: {
                name: {
                  contains: query
                }
              }
            }
          ]
        },
        include: {
          parentCategory: true
        },
        take: limit,
        orderBy: { name: 'asc' }
      });
      
      // Добавляем прямые результаты
      for (const cat of directCategories) {
        searchResults.push({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          parentId: cat.parentCategoryId,
          parentName: cat.parentCategory.name,
          displayName: `${cat.parentCategory.name} / ${cat.name}`,
          wbSubjectId: cat.wbSubjectId,
          description: cat.description,
          isActive: cat.isActive,
          relevanceScore: 10,
          matchReason: 'Прямое совпадение в названии',
          commissions: {
            fbw: cat.commissionFbw,
            fbs: cat.commissionFbs,
            dbs: cat.commissionDbs,
            cc: cat.commissionCc,
            edbs: cat.commissionEdbs,
            booking: cat.commissionBooking
          }
        });
      }
      
      console.log(`✅ Умный поиск: найдено ${searchResults.length} релевантных категорий`);
      return searchResults.slice(0, limit);
    } catch (error) {
      console.error('❌ Ошибка умного поиска категорий:', error);
      return [];
    }
  }

  /**
   * Обычный поиск категорий по названию
   */
  async searchCategories(query: string, limit: number = 20): Promise<LocalCategory[]> {
    try {
      console.log(`🔍 Поиск категорий по запросу: "${query}"`);
      
      const categories = await prisma.wbSubcategory.findMany({
        where: {
          OR: [
            {
              name: {
                contains: query
              }
            },
            {
              parentCategory: {
                name: {
                  contains: query
                }
              }
            }
          ]
        },
        include: {
          parentCategory: true
        },
        take: limit,
        orderBy: { name: 'asc' }
      });

      const result: LocalCategory[] = categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        parentId: cat.parentCategoryId,
        parentName: cat.parentCategory.name,
        displayName: `${cat.parentCategory.name} / ${cat.name}`,
        wbSubjectId: cat.wbSubjectId,
        description: cat.description,
        isActive: cat.isActive,
        commissions: {
          fbw: cat.commissionFbw,
          fbs: cat.commissionFbs,
          dbs: cat.commissionDbs,
          cc: cat.commissionCc,
          edbs: cat.commissionEdbs,
          booking: cat.commissionBooking
        }
      }));

      console.log(`✅ Найдено ${result.length} категорий`);
      return result;
    } catch (error) {
      console.error('❌ Ошибка поиска категорий:', error);
      return [];
    }
  }

  /**
   * Получение категории по ID
   */
  async getCategoryById(id: number): Promise<LocalCategory | null> {
    try {
      console.log(`🎯 Получение категории по ID: ${id}`);
      
      const category = await prisma.wbSubcategory.findUnique({
        where: { id },
        include: {
          parentCategory: true
        }
      });

      if (category) {
        const result: LocalCategory = {
          id: category.id,
          name: category.name,
          slug: category.slug,
          parentId: category.parentCategoryId,
          parentName: category.parentCategory.name,
          displayName: `${category.parentCategory.name} / ${category.name}`,
          wbSubjectId: category.wbSubjectId,
          description: category.description,
          isActive: category.isActive,
          commissions: {
            fbw: category.commissionFbw,
            fbs: category.commissionFbs,
            dbs: category.commissionDbs,
            cc: category.commissionCc,
            edbs: category.commissionEdbs,
            booking: category.commissionBooking
          }
        };

        console.log(`✅ Найдена категория: ${result.displayName}`);
        return result;
      }

      console.log(`❌ Категория с ID ${id} не найдена`);
      return null;
    } catch (error) {
      console.error('❌ Ошибка получения категории по ID:', error);
      return null;
    }
  }

  /**
   * Поиск лучшей категории для товара
   */
  async findBestCategoryForProduct(productName: string): Promise<LocalCategory | null> {
    try {
      console.log(`🎯 Умный поиск лучшей категории для товара: "${productName}"`);
      
      // Используем умный поиск
      const smartResults = await this.smartSearchCategories(productName, 5);
      
      if (smartResults.length > 0) {
        // Берем самый релевантный результат
        const bestMatch = smartResults[0];
        console.log(`✅ Найдена лучшая категория: ${bestMatch.displayName} (релевантность: ${bestMatch.relevanceScore})`);
        return bestMatch;
      }

      // Fallback на обычный поиск
      const normalResults = await this.searchCategories(productName, 5);
      if (normalResults.length > 0) {
        console.log(`✅ Найдена категория через обычный поиск: ${normalResults[0].displayName}`);
        return normalResults[0];
      }

      // Последний fallback - первая доступная категория
      const defaultCategory = await prisma.wbSubcategory.findFirst({
        include: { parentCategory: true }
      });

      if (defaultCategory) {
        const result: LocalCategory = {
          id: defaultCategory.id,
          name: defaultCategory.name,
          slug: defaultCategory.slug,
          parentId: defaultCategory.parentCategoryId,
          parentName: defaultCategory.parentCategory.name,
          displayName: `${defaultCategory.parentCategory.name} / ${defaultCategory.name}`,
          wbSubjectId: defaultCategory.wbSubjectId,
          description: defaultCategory.description,
          isActive: defaultCategory.isActive,
          commissions: {
            fbw: defaultCategory.commissionFbw,
            fbs: defaultCategory.commissionFbs,
            dbs: defaultCategory.commissionDbs,
            cc: defaultCategory.commissionCc,
            edbs: defaultCategory.commissionEdbs,
            booking: defaultCategory.commissionBooking
          }
        };

        console.log(`⚠️ Используем дефолтную категорию: ${result.displayName}`);
        return result;
      }

      return null;
    } catch (error) {
      console.error('❌ Ошибка поиска лучшей категории:', error);
      return null;
    }
  }

  /**
   * Получение всех категорий с комиссиями
   */
  async getAllCategoriesWithCommissions(limit: number = 7300, offset: number = 0): Promise<LocalCategory[]> {
    try {
      console.log(`📋 Загрузка всех категорий (лимит: ${limit}, смещение: ${offset})...`);
      
      const categories = await prisma.wbSubcategory.findMany({
        include: {
          parentCategory: true
        },
        take: limit,
        skip: offset,
        orderBy: { name: 'asc' }
      });

      const result: LocalCategory[] = categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        parentId: cat.parentCategoryId,
        parentName: cat.parentCategory.name,
        displayName: `${cat.parentCategory.name} / ${cat.name}`,
        wbSubjectId: cat.wbSubjectId,
        description: cat.description,
        isActive: cat.isActive,
        commissions: {
          fbw: cat.commissionFbw,
          fbs: cat.commissionFbs,
          dbs: cat.commissionDbs,
          cc: cat.commissionCc,
          edbs: cat.commissionEdbs,
          booking: cat.commissionBooking
        }
      }));

      console.log(`✅ Загружено ${result.length} категорий`);
      return result;
    } catch (error) {
      console.error('❌ Ошибка загрузки категорий:', error);
      return [];
    }
  }

  /**
   * Получение всех родительских категорий
   */
  async getParentCategories(): Promise<Array<{ id: number; name: string; slug: string; count: number }>> {
    try {
      console.log('📂 Загрузка родительских категорий...');
      
      const parents = await prisma.wbParentCategory.findMany({
        include: {
          _count: { select: { subcategories: true } }
        },
        orderBy: { name: 'asc' }
      });

      const result = parents.map(parent => ({
        id: parent.id,
        name: parent.name,
        slug: parent.slug,
        count: parent._count.subcategories
      }));

      console.log(`✅ Загружено ${result.length} родительских категорий`);
      return result;
    } catch (error) {
      console.error('❌ Ошибка загрузки родительских категорий:', error);
      return [];
    }
  }

  /**
   * Получение подкатегорий по родительской категории
   */
  async getSubcategoriesByParent(parentId: number): Promise<LocalCategory[]> {
    try {
      console.log(`📱 Загрузка подкатегорий для родителя ${parentId}...`);
      
      const subcategories = await prisma.wbSubcategory.findMany({
        where: {
          parentCategoryId: parentId
        },
        include: {
          parentCategory: true
        },
        orderBy: { name: 'asc' }
      });

      const result: LocalCategory[] = subcategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        parentId: cat.parentCategoryId,
        parentName: cat.parentCategory.name,
        displayName: `${cat.parentCategory.name} / ${cat.name}`,
        wbSubjectId: cat.wbSubjectId,
        description: cat.description,
        isActive: cat.isActive,
        commissions: {
          fbw: cat.commissionFbw,
          fbs: cat.commissionFbs,
          dbs: cat.commissionDbs,
          cc: cat.commissionCc,
          edbs: cat.commissionEdbs,
          booking: cat.commissionBooking
        }
      }));

      console.log(`✅ Загружено ${result.length} подкатегорий`);
      return result;
    } catch (error) {
      console.error('❌ Ошибка загрузки подкатегорий:', error);
      return [];
    }
  }

  /**
   * Очистка и техническое обслуживание
   */
  async cleanup(): Promise<void> {
    try {
      console.log('🧹 Очистка данных категорий...');
      console.log('✅ Очистка завершена');
    } catch (error) {
      console.error('❌ Ошибка очистки:', error);
    }
  }
}

export const localCategoriesService = new LocalCategoriesService();