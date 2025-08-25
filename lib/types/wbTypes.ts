// lib/types/wbTypes.ts - Типы для работы с WB API

// ===== ОСНОВНЫЕ ТИПЫ WB КАТЕГОРИЙ =====

export interface WBCategory {
  objectID: number;
  objectName: string;
  parentID?: number;
  isVisible: boolean;
}

export interface CategoryHierarchy {
  id: number;
  name: string;
  parentId?: number;
  children: CategoryHierarchy[];
}

export interface CategoryCharacteristic {
  id: number;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'dictionary' | 'date';
  required: boolean;
  multiselect?: boolean;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: string;
  defaultValue?: string;
  values?: Array<{ id: number; value: string; displayName?: string }>;
}

// ===== ТИПЫ ДЛЯ СОЗДАНИЯ КАРТОЧЕК WB =====

export interface WBCardCreateRequest {
  vendorCode: string;
  object: number; // ID категории
  brand: string;
  title: string;
  description: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };
  characteristics: Array<{
    id: number;
    value: string[];
  }>;
  composition: string;
  barcode?: string;
}

export interface WBCardCreateRequestLegacy {
  subjectID: number;
  variants: Array<{
    vendorCode: string;
    title: string;
    description: string;
    brand: string;
    dimensions: {
      length: number;
      width: number;
      height: number;
      weightBrutto: number;
    };
    characteristics: Array<{
      id: number;
      value: string[];
    }>;
    sizes: Array<{
      techSize: string;
      wbSize: string;
      price: number;
      skus: string[];
    }>;
  }>;
}

export interface ProductCardData {
  vendorCode: string;
  title: string;
  description: string;
  brand: string;
  categoryId: number;
  price: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };
  characteristics: Record<string, any>;
  packageContents: string;
  barcode?: string;
}

// ===== ТИПЫ ОТВЕТОВ API =====

export interface WBApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  taskId?: string;
  warnings?: string[];
  statusCode?: number;
}

// ===== УТИЛИТЫ ДЛЯ НОРМАЛИЗАЦИИ =====

export function normalizeCategory(category: any): WBCategory {
  return {
    objectID: category.objectID || category.id || category.subjectID,
    objectName: category.objectName || category.name || category.subjectName,
    parentID: category.parentID || category.parentId,
    isVisible: category.isVisible !== false
  };
}

export function getCategoryId(category: WBCategory): number {
  return category.objectID;
}

// ===== КОНСТАНТЫ =====

export const WB_CATEGORY_DEFAULTS = {
  FALLBACK_CATEGORY_ID: 14727, // Товары для дома
  FALLBACK_CATEGORY_NAME: 'Товары для дома'
};

// ===== ТИПЫ ДЛЯ КАТЕГОРИЙ ИЗ БД =====

export interface WBSubcategory {
  id: number;
  name: string;
  slug: string;
  parentCategoryId: number;
  commissionFbw: number;
  commissionFbs: number;
  commissionDbs: number;
  commissionCc: number;
  commissionEdbs: number;
  commissionBooking: number;
  parentCategory: {
    id: number;
    name: string;
  };
}

export interface WBParentCategory {
  id: number;
  name: string;
  subcategories: WBSubcategory[];
  _count?: { subcategories: number };
}

export interface ProfitCalculation {
  revenue: number;
  commission: number;
  logisticsCost: number;
  productCost: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  commissionRate: number;
}

// ===== ТИПЫ ДЛЯ ИИ АНАЛИЗА =====

export interface CategorySuggestion {
  category: WBCategory;
  confidence: number;
  reason: string;
  keywords?: string[];
}

export interface CharacteristicFillResult {
  characteristic: CategoryCharacteristic;
  value: string | number | boolean | string[];
  confidence: number;
  source: 'ai_analysis' | 'analog_product' | 'default' | 'unknown';
  reasoning: string;
  alternatives?: string[];
}

// ===== ЭКСПОРТ ПО УМОЛЧАНИЮ =====

export default {
  WB_CATEGORY_DEFAULTS,
  normalizeCategory,
  getCategoryId
};