// API endpoint для автоматической проверки кампании AI
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
// TODO: Реализовать функции autoCheckCampaign, askCampaignAdvice, getCampaignHistory
// import { autoCheckCampaign, askCampaignAdvice, getCampaignHistory } from '@/lib/ai/campaign-assistant';

/**
 * POST /api/campaigns/[id]/auto-check
 * Автоматическая проверка кампании AI
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const campaignId = parseInt(params.id);

    console.log(`🤖 [Auto-Check] Запуск автоматической проверки кампании ${campaignId}`);

    // TODO: Реализовать autoCheckCampaign
    // const advice = await autoCheckCampaign(campaignId);
    
    return NextResponse.json({
      success: false,
      error: 'Функция autoCheckCampaign не реализована. Добавьте модель Campaign в Prisma schema.',
      campaignId,
      timestamp: new Date().toISOString()
    }, { status: 501 });

  } catch (error: any) {
    console.error('❌ [Auto-Check] Ошибка:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка автоматической проверки' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/campaigns/[id]/auto-check
 * Получить историю решений AI по кампании
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const campaignId = parseInt(params.id);

    console.log(`📜 [Auto-Check] Получение истории кампании ${campaignId}`);

    // TODO: Реализовать getCampaignHistory
    // const history = await getCampaignHistory(campaignId);

    return NextResponse.json({
      success: false,
      error: 'Функция getCampaignHistory не реализована. Добавьте модель Campaign в Prisma schema.',
      campaignId,
      history: [],
      total: 0
    }, { status: 501 });

  } catch (error: any) {
    console.error('❌ [Auto-Check] Ошибка:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка получения истории' },
      { status: 500 }
    );
  }
}
