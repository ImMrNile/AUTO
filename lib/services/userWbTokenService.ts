// lib/services/userWbTokenService.ts - Сервис для работы с WB токенами пользователей

import { prisma } from '../prisma';
import { AuthService } from '../auth/auth-service';

export interface UserWbTokenInfo {
  token: string | null;
  cabinetId: string;
  cabinetName: string;
  sellerId?: string;
  shopName?: string;
  isActive: boolean;
}

export class UserWbTokenService {
  /**
   * Получение WB токена текущего пользователя
   */
  static async getCurrentUserWbToken(cabinetId?: string): Promise<UserWbTokenInfo | null> {
    try {
      const user = await AuthService.getCurrentUser();
      if (!user) {
        console.warn('⚠️ Пользователь не авторизован');
        return null;
      }

      // Если указан конкретный кабинет
      if (cabinetId) {
        const cabinet = await prisma.cabinet.findFirst({
          where: {
            id: cabinetId,
            userId: user.id,
            isActive: true
          }
        });

        if (!cabinet) {
          console.warn(`⚠️ Кабинет ${cabinetId} не найден или неактивен`);
          return null;
        }

        return {
          token: cabinet.apiToken,
          cabinetId: cabinet.id,
          cabinetName: cabinet.name,
          sellerId: cabinet.sellerId || undefined,
          shopName: cabinet.shopName || undefined,
          isActive: cabinet.isActive
        };
      }

      // Иначе берем первый активный кабинет
      const cabinet = await prisma.cabinet.findFirst({
        where: {
          userId: user.id,
          isActive: true,
          apiToken: {
            not: null
          }
        },
        orderBy: {
          createdAt: 'desc' // Самый новый
        }
      });

      if (!cabinet) {
        console.warn('⚠️ Активный кабинет с WB токеном не найден');
        return null;
      }

      return {
        token: cabinet.apiToken,
        cabinetId: cabinet.id,
        cabinetName: cabinet.name,
        sellerId: cabinet.sellerId || undefined,
        shopName: cabinet.shopName || undefined,
        isActive: cabinet.isActive
      };

    } catch (error) {
      console.error('❌ Ошибка получения WB токена пользователя:', error);
      return null;
    }
  }

  /**
   * Получение всех кабинетов пользователя с токенами
   */
  static async getUserCabinetsWithTokens(): Promise<UserWbTokenInfo[]> {
    try {
      const user = await AuthService.getCurrentUser();
      if (!user) {
        return [];
      }

      const cabinets = await prisma.cabinet.findMany({
        where: {
          userId: user.id,
          isActive: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return cabinets.map(cabinet => ({
        token: cabinet.apiToken,
        cabinetId: cabinet.id,
        cabinetName: cabinet.name,
        sellerId: cabinet.sellerId || undefined,
        shopName: cabinet.shopName || undefined,
        isActive: cabinet.isActive
      }));

    } catch (error) {
      console.error('❌ Ошибка получения кабинетов пользователя:', error);
      return [];
    }
  }

  /**
   * Проверка валидности WB токена
   */
  static async validateWbToken(token: string): Promise<{
    isValid: boolean;
    sellerId?: string;
    permissions?: number;
    expiresAt?: Date;
    error?: string;
  }> {
    try {
      if (!token) {
        return { isValid: false, error: 'Токен не указан' };
      }

      // Проверяем формат JWT токена
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { isValid: false, error: 'Неверный формат токена' };
      }

      // Декодируем payload
      const payload = JSON.parse(atob(parts[1]));
      
      // Проверяем истечение срока
      const expiresAt = new Date(payload.exp * 1000);
      const isExpired = Date.now() > payload.exp * 1000;
      
      if (isExpired) {
        return { 
          isValid: false, 
          error: 'Токен истек',
          expiresAt 
        };
      }

      // Проверяем подключение к WB API
      const response = await fetch('https://content-api.wildberries.ru/ping', {
        method: 'GET',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      });

      const isValid = response.ok || response.status === 401; // 401 тоже означает, что API доступен

      return {
        isValid,
        sellerId: payload.sid,
        permissions: payload.s,
        expiresAt,
        error: isValid ? undefined : `HTTP ${response.status}: ${response.statusText}`
      };

    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Ошибка валидации токена'
      };
    }
  }

  /**
   * Обновление информации о кабинете на основе токена
   */
  static async updateCabinetInfoFromToken(cabinetId: string): Promise<boolean> {
    try {
      const cabinet = await prisma.cabinet.findUnique({
        where: { id: cabinetId }
      });

      if (!cabinet?.apiToken) {
        console.warn('⚠️ Кабинет или токен не найден');
        return false;
      }

      const tokenInfo = await this.validateWbToken(cabinet.apiToken);
      
      if (!tokenInfo.isValid) {
        console.warn('⚠️ Токен недействителен:', tokenInfo.error);
        
        // Деактивируем кабинет с недействительным токеном
        await prisma.cabinet.update({
          where: { id: cabinetId },
          data: { isActive: false }
        });
        
        return false;
      }

      // Получаем информацию о продавце через WB API
      let shopName = cabinet.shopName;
      let sellerId = cabinet.sellerId || tokenInfo.sellerId;

      try {
        const response = await fetch('https://common-api.wildberries.ru/api/v1/seller-info', {
          method: 'GET',
          headers: {
            'Authorization': cabinet.apiToken,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const sellerInfo = await response.json();
          shopName = sellerInfo.tradeMark || sellerInfo.name || shopName;
          sellerId = sellerInfo.sid || sellerId;
        }
      } catch (error) {
        console.warn('⚠️ Не удалось получить информацию о продавце:', error);
      }

      // Обновляем информацию о кабинете
      await prisma.cabinet.update({
        where: { id: cabinetId },
        data: {
          sellerId,
          shopName,
          isActive: true,
          updatedAt: new Date()
        }
      });

      console.log(`✅ Информация о кабинете ${cabinet.name} обновлена`);
      return true;

    } catch (error) {
      console.error('❌ Ошибка обновления информации о кабинете:', error);
      return false;
    }
  }

  /**
   * Получение токена по ID кабинета (для использования в API)
   */
  static async getTokenByCabinetId(cabinetId: string, userId?: string): Promise<string | null> {
    try {
      const where: any = {
        id: cabinetId,
        isActive: true,
        apiToken: {
          not: null
        }
      };

      // Если указан userId, проверяем принадлежность
      if (userId) {
        where.userId = userId;
      }

      const cabinet = await prisma.cabinet.findFirst({ where });

      return cabinet?.apiToken || null;

    } catch (error) {
      console.error('❌ Ошибка получения токена по ID кабинета:', error);
      return null;
    }
  }
}

