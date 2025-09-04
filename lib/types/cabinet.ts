// types/cabinet.ts - Правильные типы для кабинета

export interface Cabinet {
  id: string;
  name: string;
  apiToken: string; // Добавляем поле apiToken
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  productCabinets?: ProductCabinet[];
  stats?: {
    totalProducts: number;
    publishedProducts: number;
    processingProducts: number;
  };
}

export interface ProductCabinet {
  id: string;
  productId: string;
  cabinetId: string;
  isSelected: boolean;
  createdAt: Date;
  updatedAt: Date;
  cabinet?: Cabinet;
  product?: Product;
}

export interface Product {
  id: string;
  originalName: string;
  generatedName?: string;
  originalImage?: string;
  price: number;
  status: ProductStatus;
  dimensions?: string;
  seoDescription?: string;
  aiCharacteristics?: string;
  suggestedCategory?: string;
  colorAnalysis?: string;
  referenceUrl?: string;
  wbData?: string;
  publishedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum ProductStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING', 
  READY = 'READY',
  PUBLISHING = 'PUBLISHING',
  PUBLISHED = 'PUBLISHED',
  ERROR = 'ERROR'
}