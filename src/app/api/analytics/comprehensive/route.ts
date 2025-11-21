/**
 * src/app/api/analytics/comprehensive/route.ts
 * 
 * Comprehensive Analytics API Endpoint
 * 
 * Features:
 * - Fetches all orders for date range
 * - Calculates expenses with KTR coefficients
 * - Aggregates data by category, delivery type
 * - Reconciles with WB official report
 * - Returns detailed breakdown for UI display
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { prismaAnalytics } from '@/lib/prisma-analytics';
import { safePrismaOperation } from '@/lib/prisma-utils';
import { WbAnalyticsEngine } from '@/lib/services/wbAnalyticsEngine';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET - Comprehensive analytics with reconciliation
 * 
 * Query params:
 * - dateFrom: Start date (YYYY-MM-DD)
 * - dateTo: End date (YYYY-MM-DD)
 * - forceRefresh: Skip cache (true/false)
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📊 [Comprehensive Analytics] Request received');
    
    // 1. Authentication
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({
        error: 'Не авторизован'
      }, { status: 401 });
    }
    
    // 2. Get query parameters
    const { searchParams } = new URL(request.url);
    const dateFromStr = searchParams.get('dateFrom');
    const dateToStr = searchParams.get('dateTo');
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    
    // Default to last 30 days if not specified
    const dateTo = dateToStr ? new Date(dateToStr) : new Date();
    const dateFrom = dateFromStr ? new Date(dateFromStr) : new Date(dateTo.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    console.log(`📅 [Comprehensive Analytics] Period: ${dateFrom.toISOString().split('T')[0]} to ${dateTo.toISOString().split('T')[0]}`);
    
    // 3. Get active cabinet
    const cabinets = await safePrismaOperation(
      () => prismaAnalytics.cabinet.findMany({
        where: { userId: user.id, isActive: true }
      }),
      'получение кабинетов'
    );
    
    if (cabinets.length === 0) {
      return NextResponse.json({
        error: 'У пользователя нет активных кабинетов'
      }, { status: 400 });
    }
    
    const cabinet = cabinets[0];
    if (!cabinet.apiToken) {
      return NextResponse.json({
        error: 'У кабинета отсутствует API токен'
      }, { status: 400 });
    }
    
    console.log(`✅ [Comprehensive Analytics] Using cabinet: ${cabinet.name || cabinet.id}`);
    
    // 4. Check cache (unless force refresh)
    const cacheKey = `comprehensive_analytics_${cabinet.id}_${dateFrom.toISOString().split('T')[0]}_${dateTo.toISOString().split('T')[0]}`;
    
    if (!forceRefresh) {
      const cachedData = await safePrismaOperation(
        () => prismaAnalytics.wbApiCache.findUnique({
          where: { cacheKey }
        }),
        'проверка кеша'
      );
      
      if (cachedData && cachedData.expiresAt > new Date()) {
        const cacheAge = Math.floor((Date.now() - cachedData.createdAt.getTime()) / 60000);
        console.log(`✅ [Comprehensive Analytics] Returning cached data (age: ${cacheAge} min)`);
        
        return NextResponse.json({
          ...(cachedData.data as any),
          fromCache: true,
          cacheAge
        });
      }
    }
    
    // 5. Run comprehensive analysis
    console.log('🚀 [Comprehensive Analytics] Running analysis engine...');
    const engine = new WbAnalyticsEngine(cabinet.apiToken, user.id);
    const result = await engine.runCompleteAnalysis(dateFrom, dateTo);
    
    // 6. Format response for UI
    const response = {
      success: true,
      data: {
        // Period
        period: {
          from: dateFrom.toISOString(),
          to: dateTo.toISOString()
        },
        
        // Summary
        summary: {
          totalOrders: result.analytics.totalOrders,
          orderedAmount: Math.round(result.analytics.orderedAmount),
          redeemedAmount: Math.round(result.analytics.redeemedAmount),
          purchaseRate: Math.round(result.analytics.purchaseRate * 100) / 100,
          returnRate: Math.round(result.analytics.returnRate * 100) / 100,
          finalTransferAmount: Math.round(result.analytics.finalTransferAmount)
        },
        
        // Expenses breakdown
        expenses: {
          commission: {
            total: Math.round(result.analytics.expenses.commission.total),
            byCategory: Array.from(result.analytics.expenses.commission.byCategory.entries())
              .map(([category, amount]) => ({
                category,
                amount: Math.round(amount)
              }))
              .sort((a, b) => b.amount - a.amount)
          },
          logistics: {
            delivered: Math.round(result.analytics.expenses.logistics.delivered),
            returned: Math.round(result.analytics.expenses.logistics.returned),
            total: Math.round(result.analytics.expenses.logistics.total),
            averageKtr: Math.round(result.analytics.expenses.logistics.averageKtr * 100) / 100
          },
          storage: Math.round(result.analytics.expenses.storage),
          acceptance: Math.round(result.analytics.expenses.acceptance),
          penalties: Math.round(result.analytics.expenses.penalties),
          total: Math.round(result.analytics.expenses.total)
        },
        
        // By delivery type
        byDeliveryType: Array.from(result.analytics.byDeliveryType.entries())
          .map(([type, data]) => ({
            type,
            orders: data.orders,
            revenue: Math.round(data.revenue),
            expenses: Math.round(data.expenses),
            profit: Math.round(data.revenue - data.expenses)
          }))
          .sort((a, b) => b.revenue - a.revenue),
        
        // By category
        byCategory: Array.from(result.analytics.byCategory.entries())
          .map(([category, data]) => ({
            category,
            orders: data.orders,
            revenue: Math.round(data.revenue),
            commission: Math.round(data.commission),
            commissionRate: Math.round(data.commissionRate * 100) / 100
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10), // Top 10 categories
        
        // Reconciliation with WB report
        reconciliation: {
          matchQuality: result.reconciliation.matchQuality,
          overallAccuracy: Math.round(result.reconciliation.overallAccuracy * 100) / 100,
          
          comparison: {
            revenue: {
              calculated: Math.round(result.reconciliation.calculated.revenue),
              wbReport: Math.round(result.reconciliation.wbReport.revenue),
              diff: Math.round(result.reconciliation.discrepancies.revenue.diff),
              diffPercent: Math.round(result.reconciliation.discrepancies.revenue.percent * 100) / 100
            },
            commission: {
              calculated: Math.round(result.reconciliation.calculated.commission),
              wbReport: Math.round(result.reconciliation.wbReport.commission),
              diff: Math.round(result.reconciliation.discrepancies.commission.diff),
              diffPercent: Math.round(result.reconciliation.discrepancies.commission.percent * 100) / 100
            },
            logistics: {
              calculated: Math.round(result.reconciliation.calculated.logistics),
              wbReport: Math.round(result.reconciliation.wbReport.logistics),
              diff: Math.round(result.reconciliation.discrepancies.logistics.diff),
              diffPercent: Math.round(result.reconciliation.discrepancies.logistics.percent * 100) / 100
            },
            storage: {
              calculated: Math.round(result.reconciliation.calculated.storage),
              wbReport: Math.round(result.reconciliation.wbReport.storage),
              diff: Math.round(result.reconciliation.discrepancies.storage.diff),
              diffPercent: Math.round(result.reconciliation.discrepancies.storage.percent * 100) / 100
            },
            acceptance: {
              calculated: Math.round(result.reconciliation.calculated.acceptance),
              wbReport: Math.round(result.reconciliation.wbReport.acceptance),
              diff: Math.round(result.reconciliation.discrepancies.acceptance.diff),
              diffPercent: Math.round(result.reconciliation.discrepancies.acceptance.percent * 100) / 100
            },
            penalties: {
              calculated: Math.round(result.reconciliation.calculated.penalties),
              wbReport: Math.round(result.reconciliation.wbReport.penalties),
              diff: Math.round(result.reconciliation.discrepancies.penalties.diff),
              diffPercent: Math.round(result.reconciliation.discrepancies.penalties.percent * 100) / 100
            },
            totalExpenses: {
              calculated: Math.round(result.reconciliation.calculated.totalExpenses),
              wbReport: Math.round(result.reconciliation.wbReport.totalExpenses),
              diff: Math.round(result.reconciliation.discrepancies.totalExpenses.diff),
              diffPercent: Math.round(result.reconciliation.discrepancies.totalExpenses.percent * 100) / 100
            },
            toTransfer: {
              calculated: Math.round(result.reconciliation.calculated.toTransfer),
              wbReport: Math.round(result.reconciliation.wbReport.toTransfer),
              diff: Math.round(result.reconciliation.discrepancies.toTransfer.diff),
              diffPercent: Math.round(result.reconciliation.discrepancies.toTransfer.percent * 100) / 100
            }
          },
          
          // Highlight significant discrepancies
          significantDiscrepancies: Object.entries(result.reconciliation.discrepancies)
            .filter(([_, disc]) => Math.abs(disc.percent) > 5) // More than 5% difference
            .map(([field, disc]) => ({
              field,
              diff: Math.round(disc.diff),
              diffPercent: Math.round(disc.percent * 100) / 100
            }))
            .sort((a, b) => Math.abs(b.diffPercent) - Math.abs(a.diffPercent))
        },
        
        // Detailed orders (first 100 for display)
        detailedOrders: result.expenses.slice(0, 100).map(exp => ({
          orderId: exp.orderId,
          nmId: exp.nmId,
          finishedPrice: Math.round(exp.finishedPrice),
          commission: Math.round(exp.commission),
          commissionRate: Math.round(exp.commissionRate * 100) / 100,
          logistics: Math.round(exp.totalLogistics),
          ktr: Math.round(exp.ktr * 100) / 100,
          storage: Math.round(exp.storage),
          acceptance: Math.round(exp.acceptance),
          penalty: Math.round(exp.penalty),
          totalExpenses: Math.round(exp.totalExpenses),
          toTransfer: Math.round(exp.toTransfer),
          isReturned: exp.isReturned,
          isPurchased: exp.isPurchased
        }))
      },
      generatedAt: new Date().toISOString()
    };
    
    // 7. Cache the result (6 hours TTL)
    try {
      const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000);
      await safePrismaOperation(
        () => prismaAnalytics.wbApiCache.upsert({
          where: { cacheKey },
          create: {
            cacheKey,
            data: response as any,
            expiresAt,
            createdAt: new Date()
          },
          update: {
            data: response as any,
            expiresAt,
            createdAt: new Date()
          }
        }),
        'сохранение в кеш'
      );
      console.log(`✅ [Comprehensive Analytics] Cached for 6 hours`);
    } catch (cacheError) {
      console.warn('⚠️ [Comprehensive Analytics] Cache save failed:', cacheError);
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ [Comprehensive Analytics] Error:', error);
    return NextResponse.json({
      error: 'Ошибка получения аналитики',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
