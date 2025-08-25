// lib/services/wbMediaService.ts - Упрощенный сервис без Sharp

import { WB_API_CONFIG } from '../config/wbApiConfig';

export interface WBMediaResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class WBMediaService {
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor() {
    this.baseUrl = WB_API_CONFIG.BASE_URLS.CONTENT;
    this.timeout = WB_API_CONFIG.TIMEOUTS.DEFAULT;
  }

  /**
   * Загрузка медиафайла в WB (упрощенная версия)
   */
  async uploadMediaToWB(imageBuffer: Buffer, vendorCode: string, apiToken: string): Promise<WBMediaResponse> {
    try {
      console.log(`📤 Загружаем медиафайл для артикула: ${vendorCode}`);

      // Создаем FormData для загрузки
      const formData = new FormData();
      const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
      // Используем правильное название поля для WB API
      formData.append('file', blob, `${vendorCode}.jpg`);

      // Загружаем через WB API (обновленный эндпоинт)
      const response = await fetch(`${this.baseUrl}${WB_API_CONFIG.ENDPOINTS.UPLOAD_MEDIA}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          // Добавляем дополнительные заголовки для совместимости
          'Accept': 'application/json'
        },
        body: formData
      });

      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = `Failed to read error response: ${e}`;
        }
        
        console.error(`❌ Ошибка загрузки медиафайла (${response.status}):`, {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorText
        });
        
        return {
          success: false,
          error: `WB Media API Error ${response.status}: ${errorText}`
        };
      }

      let result;
      try {
        result = await response.json();
        console.log('✅ Медиафайл успешно загружен в WB:', result);
      } catch (e) {
        console.log('✅ Медиафайл загружен, но ответ не в формате JSON');
        result = { uploaded: true };
      }

      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error('❌ Ошибка загрузки медиафайла:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка загрузки медиафайла'
      };
    }
  }

  /**
   * Валидация изображения для WB
   */
  validateImageForWB(file: File): { valid: boolean; error?: string } {
    if (!file.type.startsWith('image/')) {
      return { valid: false, error: 'Файл должен быть изображением' };
    }

    if (file.size > 10 * 1024 * 1024) {
      return { valid: false, error: 'Размер файла не должен превышать 10MB' };
    }

    const allowedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedFormats.includes(file.type)) {
      return { valid: false, error: 'Поддерживаются только форматы: JPEG, PNG, WebP' };
    }

    return { valid: true };
  }
}

export const wbMediaService = new WBMediaService();