// src/app/api/user/cabinets/route.ts - API для управления кабинетами пользователя

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../../lib/auth/auth-service';
import { UserWbTokenService } from '../../../../../lib/services/userWbTokenService';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('📋 Получение кабинетов пользователя');

    // Авторизация
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ 
        error: 'Не авторизован'
      }, { status: 401 });
    }

    // Получаем все кабинеты пользователя
    const cabinets = await UserWbTokenService.getUserCabinetsWithTokens();

    return NextResponse.json({
      success: true,
      data: {
        cabinets: cabinets.map(cabinet => ({
          id: cabinet.cabinetId,
          name: cabinet.cabinetName,
          hasToken: !!cabinet.token,
          sellerId: cabinet.sellerId,
          shopName: cabinet.shopName,
          isActive: cabinet.isActive
        })),
        totalCabinets: cabinets.length,
        cabinetsWithTokens: cabinets.filter(c => !!c.token).length
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения кабинетов:', error);
    
    return NextResponse.json({
      error: 'Ошибка получения кабинетов',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔑 Валидация WB токена');

    // Авторизация
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ 
        error: 'Не авторизован'
      }, { status: 401 });
    }

    const body = await request.json();
    const { action, cabinetId, token } = body;

    switch (action) {
      case 'validate_token':
        if (!token) {
          return NextResponse.json({
            error: 'Не указан токен для валидации'
          }, { status: 400 });
        }

        const validation = await UserWbTokenService.validateWbToken(token);
        
        return NextResponse.json({
          success: true,
          data: {
            isValid: validation.isValid,
            sellerId: validation.sellerId,
            permissions: validation.permissions,
            expiresAt: validation.expiresAt,
            error: validation.error,
            permissionsDecoded: validation.permissions ? {
              hasContent: !!(validation.permissions & (1 << 0)),
              hasAnalytics: !!(validation.permissions & (1 << 1)),
              hasPrices: !!(validation.permissions & (1 << 2)),
              hasMarketplace: !!(validation.permissions & (1 << 3)),
              hasStatistics: !!(validation.permissions & (1 << 4))
            } : undefined
          }
        });

      case 'update_cabinet_info':
        if (!cabinetId) {
          return NextResponse.json({
            error: 'Не указан ID кабинета'
          }, { status: 400 });
        }

        const updateResult = await UserWbTokenService.updateCabinetInfoFromToken(cabinetId);
        
        return NextResponse.json({
          success: updateResult,
          message: updateResult 
            ? 'Информация о кабинете обновлена' 
            : 'Не удалось обновить информацию о кабинете'
        });

      default:
        return NextResponse.json({
          error: 'Неизвестное действие',
          availableActions: ['validate_token', 'update_cabinet_info']
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Ошибка обработки запроса кабинетов:', error);
    
    return NextResponse.json({
      error: 'Ошибка обработки запроса',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

