// types/categories.ts - Унифицированные типы для категорий

export interface WBSubcategory {
  id: number;
  name: string;
  slug: string;
  parentId: number;
  parentName: string;
  displayName: string;
  parentCategory?: {
    id: number;
    name: string;
  };
  relevanceScore?: number;
  matchReason?: string;
  commissions: {
    fbw: number;
    fbs: number;
    dbs: number;
    cc: number;
    edbs: number;
    booking: number;
  };
}

export interface WBParentCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
  subcategories?: WBSubcategory[];
}

export interface ProfitCalculation {
  revenue: number;
  commission: number;
  commissionRate: number;
  logisticsCost: number;
  productCost: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  category: {
    name: string;
    parentName: string;
  };
}

export interface SmartCategoryResult extends WBSubcategory {
  relevanceScore?: number;
  matchReason?: string;
}

export type DeliveryType = 'fbw' | 'fbs' | 'dbs' | 'cc' | 'edbs' | 'booking';

export interface CategoriesSelectorProps {
  onCategorySelect: (category: WBSubcategory, profit?: ProfitCalculation) => void;
  selectedCategoryId?: number;
  className?: string;
  showProfitCalculator?: boolean;
  defaultPrice?: number;
  defaultCost?: number;
}

export interface Cabinet {
  id: string;
  name: string;
  apiToken: string;
  isActive: boolean;
  description?: string;
}

export interface ProcessingStatus {
  stage: 'uploading' | 'processing' | 'wb-creation' | 'completed' | 'error';
  message: string;
  progress: number;
}