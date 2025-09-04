'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Search, X, Check, Package } from 'lucide-react';

// Типы данных
interface WBSubcategory {
  id: number;
  name: string;
  slug: string;
  parentId: number;
  parentName: string;
  displayName: string;
  wbSubjectId?: number;
  score?: number;
  commissions: {
    fbw: number;
    fbs: number;
    dbs: number;
    cc: number;
    edbs: number;
    booking: number;
  };
}

interface CategorySelectorProps {
  onCategorySelect: (category: WBSubcategory | null) => void;
  selectedCategoryId?: number;
  productName: string;
}

// Кеш категорий в памяти
let categoriesCache: WBSubcategory[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

export default function CategorySelector({ 
  onCategorySelect, 
  selectedCategoryId, 
  productName 
}: CategorySelectorProps) {
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<WBSubcategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Debounce hook
  const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);

    return debouncedValue;
  };

  const debouncedQuery = useDebounce(query, 300);

  // Автопоиск при изменении названия товара
  useEffect(() => {
    if (productName && productName.trim().length > 2 && !selectedCategoryId) {
      const trimmedName = productName.trim();
      console.log('🚀 Автопоиск категории для товара:', trimmedName);
      
      // Очищаем предыдущий поиск
      setQuery('');
      setCategories([]);
      setHasSearched(false);
      
      // Запускаем автопоиск
      performSmartSearch(trimmedName, true);
      setHasSearched(true);
    } else if (productName && productName.trim().length <= 2) {
      // Очищаем поиск если название товара слишком короткое
      setQuery('');
      setCategories([]);
      setHasSearched(false);
    }
  }, [productName, selectedCategoryId]);

  // Поиск при изменении запроса (ручной поиск)
  useEffect(() => {
    if (debouncedQuery && debouncedQuery.length > 2) {
      performSmartSearch(debouncedQuery, false);
      setHasSearched(true);
    } else if (debouncedQuery === '' && hasSearched && productName.trim().length > 2) {
      // Если пользователь очистил поиск, возвращаемся к автопоиску по названию товара
      performSmartSearch(productName.trim(), true);
    }
  }, [debouncedQuery, hasSearched, productName]);

  // Умный поиск категорий
  const performSmartSearch = async (searchQuery: string, isAutoSearch = false) => {
    if (!searchQuery || searchQuery.length < 2) return;
    
    setIsLoading(true);
    setError('');
    setIsDropdownOpen(true);

    try {
      console.log(`🎯 ${isAutoSearch ? 'Автопоиск' : 'Ручной поиск'} категории: "${searchQuery}"`);
      
      // Сначала пробуем API
      const apiResponse = await fetch(`/api/categories?action=search&search=${encodeURIComponent(searchQuery)}&limit=20`);
      
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        
        if (apiData?.success && apiData.data?.length > 0) {
          console.log(`✅ API поиск: найдено ${apiData.data.length} категорий`);
          setCategories(apiData.data);
          
          // Автовыбор лучшего результата для автопоиска
          if (isAutoSearch && !selectedCategoryId && apiData.data.length > 0) {
            const bestMatch = findBestMatch(apiData.data, searchQuery);
            if (bestMatch) {
              console.log('🎯 Автовыбор категории:', bestMatch.name);
              setTimeout(() => {
                onCategorySelect(bestMatch);
                setIsDropdownOpen(false);
              }, 800);
            }
          }
          
          setError('');
          return;
        }
      }
      
      // Fallback: демо-данные
      console.log('🔄 API недоступен, используем демо-данные');
      const demoResults = await performDemoSearch(searchQuery);
      if (demoResults.length > 0) {
        setCategories(demoResults);
        
        // Автовыбор для демо-поиска
        if (isAutoSearch && !selectedCategoryId) {
          const bestMatch = findBestMatch(demoResults, searchQuery);
          if (bestMatch) {
            console.log('🎯 Автовыбор (демо-поиск):', bestMatch.name);
            setTimeout(() => {
              onCategorySelect(bestMatch);
              setIsDropdownOpen(false);
            }, 1000);
          }
        }
      } else {
        setCategories([]);
        setError(`Категории не найдены по запросу "${searchQuery}"`);
      }
      
    } catch (e: any) {
      console.error('❌ Ошибка поиска категорий:', e);
      setError('Проблема с поиском. Попробуйте еще раз.');
      setCategories([]);
      
      // Fallback на демо-данные при ошибке
      const demoResults = await performDemoSearch(searchQuery);
      if (demoResults.length > 0) {
        setCategories(demoResults);
        setError('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Демо-поиск по ключевым словам
  const performDemoSearch = async (searchQuery: string): Promise<WBSubcategory[]> => {
    const mockCategories: WBSubcategory[] = [
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

    // Поиск по ключевым словам
    const queryLower = searchQuery.toLowerCase();
    const results = mockCategories.filter(cat => {
      const nameMatch = cat.name.toLowerCase().includes(queryLower);
      const parentMatch = cat.parentName.toLowerCase().includes(queryLower);
      const displayMatch = cat.displayName.toLowerCase().includes(queryLower);
      
      return nameMatch || parentMatch || displayMatch;
    });

    return results.slice(0, 10); // Ограничиваем результат
  };

  // Поиск лучшего совпадения для автовыбора
  const findBestMatch = useCallback((results: WBSubcategory[], searchQuery: string): WBSubcategory | null => {
    if (results.length === 0) return null;
    
    const queryLower = searchQuery.toLowerCase();
    
    // Ищем точное совпадение в названии
    const exactMatch = results.find(cat => 
      cat.name.toLowerCase() === queryLower
    );
    if (exactMatch) return exactMatch;
    
    // Ищем совпадение начала названия
    const startMatch = results.find(cat => 
      cat.name.toLowerCase().startsWith(queryLower)
    );
    if (startMatch) return startMatch;
    
    // Ищем по ключевым словам
    const keywords = extractKeywords(searchQuery);
    const priorityKeywords = ['наушники', 'телефон', 'обувь', 'одежда', 'кроссовки'];
    
    // Сначала ищем по приоритетным ключевым словам
    for (const keyword of priorityKeywords) {
      if (keywords.includes(keyword)) {
        const keywordMatch = results.find(cat => 
          cat.name.toLowerCase().includes(keyword.toLowerCase())
        );
        if (keywordMatch) return keywordMatch;
      }
    }
    
    // Возвращаем первый результат
    return results[0];
  }, []);

  // Извлечение ключевых слов
  const extractKeywords = (productName: string): string[] => {
    return productName.toLowerCase()
      .split(/[\s\-_]+/)
      .filter(word => word.length > 2)
      .filter(word => !['для', 'своих', 'новый', 'хороший'].includes(word))
      .slice(0, 5);
  };

  const clearSearch = useCallback(() => {
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

  const selectedCategory = categories.find(cat => cat.id === selectedCategoryId) || null;

  return (
    <div className="space-y-3">
      {/* Поле поиска */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.length > 0) {
              setIsDropdownOpen(true);
            }
          }}
          onFocus={() => {
            if (categories.length > 0) {
              setIsDropdownOpen(true);
            }
          }}
          placeholder={
            productName?.length > 2
              ? `Поиск категории... (автоподбор по «${productName.slice(0, 20)}…»)`
              : 'Введите название товара — и начните поиск'
          }
          className="glass-input w-full pl-10 pr-4"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="loading-spinner w-4 h-4"></div>
          </div>
        )}
      </div>

      {/* Подсказка */}
      <div className="flex items-center gap-2 text-gray-400 text-xs">
        <Search className="w-3 h-3" />
        <span>
          {error ? error :
           !isLoading && !categories.length && hasSearched && (query || productName).length > 2 ?
           `Ничего не найдено по «${(query || productName).slice(0, 30)}…»` :
           !(productName && productName.trim().length > 2) ?
           'Введите название товара выше — мы подберём категории автоматически' :
           'Поиск категорий...'
          }
        </span>
      </div>

      {/* Выбранная категория */}
      {selectedCategory && (
        <div className="glass-container p-4 border border-green-400/30 bg-green-400/10">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-medium text-green-100 text-sm">{selectedCategory.displayName}</div>
              <div className="text-xs text-green-300 mt-1">
                Комиссия WB: FBW {selectedCategory.commissions.fbw}% • ID: {selectedCategory.wbSubjectId || selectedCategory.id}
              </div>
            </div>
            <button
              onClick={() => {
                onCategorySelect(null);
                clearSearch();
              }}
              className="ml-3 p-1 text-green-400 hover:text-green-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Dropdown с результатами */}
      {isDropdownOpen && categories.length > 0 && !selectedCategory && (
        <div className="absolute z-50 w-full mt-2 max-h-60 overflow-y-auto glass-container border border-blue-400/30">
          <div className="p-2">
            <h4 className="text-sm font-medium text-gray-300 mb-2 px-2">
              Найденные категории ({categories.length}):
            </h4>
            {categories.map((category) => (
              <div
                key={category.id}
                onClick={() => {
                  console.log('✅ Выбрана категория:', category.name);
                  onCategorySelect(category);
                  setIsDropdownOpen(false);
                  setQuery('');
                }}
                className="p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-blue-600/20 border border-transparent hover:border-blue-500/30"
              >
                <div className="font-medium text-white text-sm">{category.displayName}</div>
                <div className="text-xs text-gray-400 mt-1">
                  Комиссия: {category.commissions.fbw}% • WB ID: {category.wbSubjectId || category.id}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overlay для закрытия dropdown */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
}