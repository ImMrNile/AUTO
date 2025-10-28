import { z } from 'zod';

// Схема для данных о товаре
export const ProductDataSchema = z.object({
  name: z.string().min(1, 'Название товара обязательно'),
  price: z.number().positive('Цена должна быть положительной'),
  originalPrice: z.number().positive().optional(),
  discount: z.number().min(0).max(100).optional(),
  currency: z.string().default('RUB'),
  description: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  images: z.array(z.string().url()).optional(),
  specifications: z.record(z.string(), z.any()).optional(),
  availability: z.boolean().default(true),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().min(0).optional(),
  dimensions: z.object({
    length: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    weight: z.number().optional(),
  }).optional(),
  colors: z.array(z.string()).optional(),
  sizes: z.array(z.string()).optional(),
  materials: z.array(z.string()).optional(),
  warranty: z.string().optional(),
  vendorCode: z.string().optional(),
  barcode: z.string().optional(),
  url: z.string().url('Некорректный URL'),
  source: z.string().min(1, 'Источник обязателен'),
  parsedAt: z.string().datetime(),
});

export type ProductData = z.infer<typeof ProductDataSchema>;

// Схема для запроса парсинга
export const ParseRequestSchema = z.object({
  url: z.string().url('Некорректный URL'),
  selectors: z.record(z.string(), z.string()).optional(),
  timeout: z.number().min(1000).max(30000).default(10000),
  waitForSelector: z.string().optional(),
  screenshot: z.boolean().default(false),
  extractImages: z.boolean().default(true),
  extractSpecifications: z.boolean().default(true),
});

export type ParseRequest = z.infer<typeof ParseRequestSchema>;

// Схема для ответа парсинга
export const ParseResponseSchema = z.object({
  success: z.boolean(),
  data: ProductDataSchema.optional(),
  error: z.string().optional(),
  metadata: z.object({
    parseTime: z.number(),
    url: z.string(),
    source: z.string(),
    userAgent: z.string().optional(),
    screenshot: z.string().optional(),
  }),
});

export type ParseResponse = z.infer<typeof ParseResponseSchema>;

// Схема для конфигурации парсера
export const ParserConfigSchema = z.object({
  userAgent: z.string().default('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
  timeout: z.number().default(10000),
  retries: z.number().min(0).max(5).default(3),
  delay: z.number().min(0).max(5000).default(1000),
  headless: z.boolean().default(true),
  viewport: z.object({
    width: z.number().default(1920),
    height: z.number().default(1080),
  }),
  enableJavaScript: z.boolean().default(true),
  blockImages: z.boolean().default(false),
  blockCSS: z.boolean().default(false),
});

export type ParserConfig = z.infer<typeof ParserConfigSchema>;

// Схема для селекторов по умолчанию
export const DefaultSelectorsSchema = z.object({
  name: z.string(),
  price: z.string(),
  originalPrice: z.string().optional(),
  description: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  images: z.string(),
  specifications: z.string().optional(),
  rating: z.string().optional(),
  reviewCount: z.string().optional(),
});

export type DefaultSelectors = z.infer<typeof DefaultSelectorsSchema>;

// Константы для популярных сайтов
export const SITE_CONFIGS = {
  'wildberries.ru': {
    name: 'Wildberries',
    selectors: {
      name: 'h1[data-link="text{:product^goodsName}"], .product-page__title',
      price: '.price-block__final-price, .price-block__final-cost',
      originalPrice: '.price-block__old-price',
      description: '.product-page__description, .product-page__details',
      brand: '.product-page__brand-name, .seller-info__name',
      images: '.product-page__gallery img, .swiper-slide img',
      specifications: '.product-params__table tr',
    },
  },
  'ozon.ru': {
    name: 'Ozon',
    selectors: {
      name: 'h1[data-widget="webTitle"], .title',
      price: '.price-label, .price',
      originalPrice: '.price-label-old, .old-price',
      description: '.description, .product-description',
      brand: '.brand-name, .seller-name',
      images: '.gallery img, .product-images img',
      specifications: '.characteristics tr, .params tr',
    },
  },
  'market.yandex.ru': {
    name: 'Yandex Market',
    selectors: {
      name: 'h1[data-auto="productTitle"], .product-title',
      price: '.price .price-value, .price',
      originalPrice: '.price .price-old',
      description: '.description, .product-description',
      brand: '.brand-name, .seller-name',
      images: '.gallery img, .product-images img',
      specifications: '.characteristics tr, .params tr',
    },
  },
  'aliexpress.ru': {
    name: 'AliExpress',
    selectors: {
      name: 'h1[data-pl="product-title"], .product-title-text',
      price: '.price-current, .price',
      originalPrice: '.price-original',
      description: '.product-description, .description',
      brand: '.brand-name, .seller-name',
      images: '.images-view-item img, .product-images img',
      specifications: '.product-property-list li',
    },
  },
} as const;

export type SiteConfig = typeof SITE_CONFIGS[keyof typeof SITE_CONFIGS];
