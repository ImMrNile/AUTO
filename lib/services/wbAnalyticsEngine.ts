/**
 * lib/services/wbAnalyticsEngine.ts
 * 
 * Robust Analytical System for Wildberries Sales
 * 
 * Purpose:
 * - Fetch all orders for a date range from WB API
 * - Calculate all expenses (commission, logistics with KTR, penalties)
 * - Aggregate data for clear interface display
 * - Reconcile calculations with official WB financial report
 * 
 * Architecture:
 * 1. Data Extraction Layer - Fetch orders, products, reports
 * 2. Calculation Layer - Compute expenses with proper formulas
 * 3. Aggregation Layer - Sum up totals and breakdowns
 * 4. Reconciliation Layer - Compare with WB official report
 */

import { WbReportService, WbDetailedReportItem } from './wbReportService';
import { WbTariffService } from './wbTariffService';
import { prismaAnalytics } from '@/lib/prisma-analytics';

// ==================== INTERFACES ====================

/**
 * Order data from WB API
 */
export interface WbOrder {
  id: string;
  nmId: number;
  saleID: string;
  
  // Prices
  finishedPrice: number; // Seller's base price (after seller discount)
  priceWithDisc: number; // Customer price (with WB discount/SPP)
  forPay: number; // Amount to transfer to seller
  
  // Product info
  subject: string;
  category: string;
  barcode: string;
  
  // Volume for logistics calculation
  volumeLiters?: number;
  
  // Status
  isReturned: boolean;
  isPurchased: boolean; // Status: purchased or not
  
  // Warehouse
  warehouseName: string;
  
  // Dates
  orderDate: Date;
  saleDate?: Date;
  
  // Penalties
  penalty?: number;
}

/**
 * Calculated expenses for a single order
 */
export interface OrderExpenses {
  orderId: string;
  nmId: number;
  
  // Revenue
  finishedPrice: number; // Seller's base
  customerPrice: number; // What customer paid
  
  // Commission
  commission: number;
  commissionRate: number; // %
  
  // Logistics
  logisticsToClient: number; // Delivery cost
  logisticsFromClient: number; // Return cost (50₽ fixed)
  totalLogistics: number;
  ktr: number; // Warehouse coefficient
  
  // Other expenses
  storage: number;
  acceptance: number;
  penalty: number;
  
  // Totals
  totalExpenses: number;
  toTransfer: number; // forPay amount
  
  // Status
  isReturned: boolean;
  isPurchased: boolean;
}

/**
 * Aggregated analytics for the period
 */
export interface AggregatedAnalytics {
  // Period
  dateFrom: Date;
  dateTo: Date;
  
  // Totals
  totalOrders: number;
  orderedAmount: number; // Total ordered (all orders)
  redeemedAmount: number; // Total redeemed (purchased only)
  
  // Expenses breakdown
  expenses: {
    commission: {
      total: number;
      byCategory: Map<string, number>;
    };
    logistics: {
      delivered: number; // Logistics for delivered orders
      returned: number; // Logistics for returns (50₽ each)
      total: number;
      averageKtr: number;
    };
    storage: number;
    acceptance: number;
    penalties: number;
    total: number;
  };
  
  // Final amount
  finalTransferAmount: number; // After all expenses
  
  // Statistics
  purchaseRate: number; // % of orders that were purchased
  returnRate: number; // % of orders that were returned
  
  // By delivery type
  byDeliveryType: Map<string, {
    orders: number;
    revenue: number;
    expenses: number;
  }>;
  
  // By category
  byCategory: Map<string, {
    orders: number;
    revenue: number;
    commission: number;
    commissionRate: number;
  }>;
}

/**
 * Reconciliation result comparing our calculations with WB report
 */
export interface ReconciliationResult {
  // Our calculations
  calculated: {
    revenue: number;
    commission: number;
    logistics: number;
    storage: number;
    acceptance: number;
    penalties: number;
    totalExpenses: number;
    toTransfer: number;
  };
  
  // WB official report
  wbReport: {
    revenue: number;
    commission: number;
    logistics: number;
    storage: number;
    acceptance: number;
    penalties: number;
    totalExpenses: number;
    toTransfer: number;
  };
  
  // Discrepancies
  discrepancies: {
    revenue: { diff: number; percent: number };
    commission: { diff: number; percent: number };
    logistics: { diff: number; percent: number };
    storage: { diff: number; percent: number };
    acceptance: { diff: number; percent: number };
    penalties: { diff: number; percent: number };
    totalExpenses: { diff: number; percent: number };
    toTransfer: { diff: number; percent: number };
  };
  
  // Overall match quality
  matchQuality: 'excellent' | 'good' | 'fair' | 'poor';
  overallAccuracy: number; // %
}

// ==================== MAIN ENGINE CLASS ====================

export class WbAnalyticsEngine {
  private apiToken: string;
  private userId: string;
  private reportService: WbReportService;
  
  constructor(apiToken: string, userId: string) {
    this.apiToken = apiToken;
    this.userId = userId;
    this.reportService = new WbReportService(apiToken);
  }
  
  // ==================== DATA EXTRACTION ====================
  
  /**
   * Fetch all orders for date range from WB API
   */
  async fetchOrders(dateFrom: Date, dateTo: Date): Promise<WbOrder[]> {
    console.log(`📥 [Analytics Engine] Fetching orders from ${dateFrom.toISOString().split('T')[0]} to ${dateTo.toISOString().split('T')[0]}`);
    
    try {
      // Use WB Statistics API to get sales data
      const url = `https://statistics-api.wildberries.ru/api/v1/supplier/sales?dateFrom=${dateFrom.toISOString().split('T')[0]}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.apiToken,
          'User-Agent': 'WB-AI-Assistant/2.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`WB API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Filter orders in date range and map to our format
      const orders: WbOrder[] = (data || [])
        .filter((sale: any) => {
          const saleDate = new Date(sale.date);
          return saleDate >= dateFrom && saleDate <= dateTo;
        })
        .map((sale: any) => ({
          id: sale.saleID || sale.odid || `order_${sale.nmId}_${Date.now()}`,
          nmId: sale.nmId,
          saleID: sale.saleID || '',
          
          finishedPrice: sale.finishedPrice || 0,
          priceWithDisc: sale.priceWithDisc || sale.finishedPrice || 0,
          forPay: sale.forPay || 0,
          
          subject: sale.subject || '',
          category: sale.category || sale.subject || 'Без категории',
          barcode: sale.barcode || '',
          
          volumeLiters: this.estimateVolume(sale),
          
          isReturned: sale.saleID?.startsWith('R') || sale.isCancel || false,
          isPurchased: !!(sale.saleID && !sale.saleID.startsWith('R')),
          
          warehouseName: sale.warehouseName || '',
          
          orderDate: new Date(sale.date),
          saleDate: sale.lastChangeDate ? new Date(sale.lastChangeDate) : undefined,
          
          penalty: 0 // Will be filled from detailed report
        }));
      
      console.log(`✅ [Analytics Engine] Fetched ${orders.length} orders`);
      return orders;
      
    } catch (error) {
      console.error('❌ [Analytics Engine] Error fetching orders:', error);
      throw error;
    }
  }
  
  /**
   * Estimate volume from product data (fallback if not available)
   */
  private estimateVolume(sale: any): number {
    // Try to get from dimensions if available
    if (sale.length && sale.width && sale.height) {
      return (sale.length * sale.width * sale.height) / 1000; // cm³ to liters
    }
    
    // Fallback: estimate based on price (rough approximation)
    const price = sale.finishedPrice || 1000;
    if (price < 500) return 0.3; // Small items
    if (price < 1500) return 1.0; // Medium items
    if (price < 3000) return 3.0; // Large items
    return 7.0; // Very large items
  }
  
  /**
   * Get KTR (warehouse coefficient) map for all warehouses
   */
  async getKtrMap(): Promise<Map<string, number>> {
    console.log('📊 [Analytics Engine] Fetching KTR coefficients...');
    
    try {
      const ktrMap = await WbTariffService.getWarehouseKtrMap(this.apiToken, false);
      console.log(`✅ [Analytics Engine] Got KTR for ${ktrMap?.size || 0} warehouses`);
      return ktrMap || new Map();
    } catch (error) {
      console.warn('⚠️ [Analytics Engine] Could not fetch KTR, using default 1.0');
      return new Map();
    }
  }
  
  /**
   * Get commission rates from database by category
   */
  async getCommissionRates(): Promise<Map<string, number>> {
    console.log('📊 [Analytics Engine] Loading commission rates from database...');
    
    try {
      const subcategories = await prismaAnalytics.wbSubcategory.findMany({
        select: {
          name: true,
          commissionFbw: true,
          commissionFbs: true
        }
      });
      
      const ratesMap = new Map<string, number>();
      subcategories.forEach(sub => {
        // Use FBW commission as default (most common)
        ratesMap.set(sub.name, sub.commissionFbw);
      });
      
      console.log(`✅ [Analytics Engine] Loaded ${ratesMap.size} commission rates`);
      return ratesMap;
      
    } catch (error) {
      console.warn('⚠️ [Analytics Engine] Could not load commission rates, using default 15%');
      return new Map();
    }
  }
  
  // ==================== EXPENSE CALCULATION ====================
  
  /**
   * Calculate expenses for a single order
   */
  calculateOrderExpenses(
    order: WbOrder,
    ktr: number,
    commissionRate: number
  ): OrderExpenses {
    const finishedPrice = order.finishedPrice;
    const customerPrice = order.priceWithDisc;
    
    // 1. Commission (from seller's base price)
    const commission = (finishedPrice * commissionRate) / 100;
    
    // 2. Logistics to client
    // Formula: Base tariff × KTR
    // Base tariff depends on volume:
    // - First liter: 46₽
    // - Each additional liter: 14₽
    const volumeLiters = order.volumeLiters || 1.0;
    let baseTariff = 0;
    
    if (volumeLiters <= 1) {
      baseTariff = 46 * volumeLiters;
    } else {
      baseTariff = 46 + (volumeLiters - 1) * 14;
    }
    
    const logisticsToClient = baseTariff * ktr;
    
    // 3. Logistics from client (returns)
    // Fixed: 50₽ per return
    const logisticsFromClient = order.isReturned ? 50 : 0;
    
    const totalLogistics = logisticsToClient + logisticsFromClient;
    
    // 4. Storage (only for FBO/FBW)
    // Estimate: 0.5₽/liter/day × 30 days
    const storage = volumeLiters * 0.5 * 30;
    
    // 5. Acceptance (only for FBO/FBW)
    // Estimate: 0.4₽/liter
    const acceptance = volumeLiters * 0.4;
    
    // 6. Penalties
    const penalty = order.penalty || 0;
    
    // Total expenses
    const totalExpenses = commission + totalLogistics + storage + acceptance + penalty;
    
    // Amount to transfer
    const toTransfer = finishedPrice - totalExpenses;
    
    return {
      orderId: order.id,
      nmId: order.nmId,
      
      finishedPrice,
      customerPrice,
      
      commission,
      commissionRate,
      
      logisticsToClient,
      logisticsFromClient,
      totalLogistics,
      ktr,
      
      storage,
      acceptance,
      penalty,
      
      totalExpenses,
      toTransfer,
      
      isReturned: order.isReturned,
      isPurchased: order.isPurchased
    };
  }
  
  // ==================== AGGREGATION ====================
  
  /**
   * Aggregate all order expenses into summary analytics
   */
  aggregateAnalytics(
    orders: WbOrder[],
    orderExpenses: OrderExpenses[]
  ): AggregatedAnalytics {
    console.log(`📊 [Analytics Engine] Aggregating ${orders.length} orders...`);
    
    // Initialize aggregates
    let totalOrders = orders.length;
    let orderedAmount = 0;
    let redeemedAmount = 0;
    
    let totalCommission = 0;
    let totalLogisticsDelivered = 0;
    let totalLogisticsReturned = 0;
    let totalStorage = 0;
    let totalAcceptance = 0;
    let totalPenalties = 0;
    let totalExpenses = 0;
    let finalTransferAmount = 0;
    
    let purchasedCount = 0;
    let returnedCount = 0;
    let totalKtr = 0;
    let ktrCount = 0;
    
    const byDeliveryType = new Map<string, { orders: number; revenue: number; expenses: number }>();
    const byCategory = new Map<string, { orders: number; revenue: number; commission: number; commissionRate: number }>();
    const commissionByCategory = new Map<string, number>();
    
    // Aggregate each order
    orderExpenses.forEach((expense, index) => {
      const order = orders[index];
      
      // Totals
      orderedAmount += expense.finishedPrice;
      if (expense.isPurchased) {
        redeemedAmount += expense.finishedPrice;
        purchasedCount++;
      }
      if (expense.isReturned) {
        returnedCount++;
      }
      
      // Expenses
      totalCommission += expense.commission;
      totalLogisticsDelivered += expense.logisticsToClient;
      totalLogisticsReturned += expense.logisticsFromClient;
      totalStorage += expense.storage;
      totalAcceptance += expense.acceptance;
      totalPenalties += expense.penalty;
      totalExpenses += expense.totalExpenses;
      finalTransferAmount += expense.toTransfer;
      
      // KTR average
      if (expense.ktr > 0) {
        totalKtr += expense.ktr;
        ktrCount++;
      }
      
      // By delivery type (FBW/FBS based on warehouse name)
      const deliveryType = order.warehouseName.includes('Коледино') || 
                          order.warehouseName.includes('Подольск') ? 'FBW' : 'FBS';
      const dtData = byDeliveryType.get(deliveryType) || { orders: 0, revenue: 0, expenses: 0 };
      dtData.orders++;
      dtData.revenue += expense.finishedPrice;
      dtData.expenses += expense.totalExpenses;
      byDeliveryType.set(deliveryType, dtData);
      
      // By category
      const category = order.category;
      const catData = byCategory.get(category) || { orders: 0, revenue: 0, commission: 0, commissionRate: 0 };
      catData.orders++;
      catData.revenue += expense.finishedPrice;
      catData.commission += expense.commission;
      byCategory.set(category, catData);
      
      commissionByCategory.set(category, (commissionByCategory.get(category) || 0) + expense.commission);
    });
    
    // Calculate rates
    const purchaseRate = totalOrders > 0 ? (purchasedCount / totalOrders) * 100 : 0;
    const returnRate = totalOrders > 0 ? (returnedCount / totalOrders) * 100 : 0;
    const averageKtr = ktrCount > 0 ? totalKtr / ktrCount : 1.0;
    
    // Calculate average commission rate per category
    byCategory.forEach((data, category) => {
      data.commissionRate = data.revenue > 0 ? (data.commission / data.revenue) * 100 : 0;
    });
    
    console.log(`✅ [Analytics Engine] Aggregation complete:`, {
      orders: totalOrders,
      purchased: purchasedCount,
      returned: returnedCount,
      orderedAmount: `${orderedAmount.toFixed(2)}₽`,
      redeemedAmount: `${redeemedAmount.toFixed(2)}₽`,
      totalExpenses: `${totalExpenses.toFixed(2)}₽`,
      finalTransfer: `${finalTransferAmount.toFixed(2)}₽`
    });
    
    return {
      dateFrom: orders[0]?.orderDate || new Date(),
      dateTo: orders[orders.length - 1]?.orderDate || new Date(),
      
      totalOrders,
      orderedAmount,
      redeemedAmount,
      
      expenses: {
        commission: {
          total: totalCommission,
          byCategory: commissionByCategory
        },
        logistics: {
          delivered: totalLogisticsDelivered,
          returned: totalLogisticsReturned,
          total: totalLogisticsDelivered + totalLogisticsReturned,
          averageKtr
        },
        storage: totalStorage,
        acceptance: totalAcceptance,
        penalties: totalPenalties,
        total: totalExpenses
      },
      
      finalTransferAmount,
      
      purchaseRate,
      returnRate,
      
      byDeliveryType,
      byCategory
    };
  }
  
  // ==================== RECONCILIATION ====================
  
  /**
   * Reconcile our calculations with WB official report
   */
  async reconcile(
    calculated: AggregatedAnalytics,
    dateFrom: Date,
    dateTo: Date
  ): Promise<ReconciliationResult> {
    console.log(`🔍 [Analytics Engine] Reconciling with WB official report...`);
    
    try {
      // Fetch WB detailed report
      const wbReport = await this.reportService.getDetailedReport(dateFrom, dateTo);
      const aggregated = this.reportService.aggregateExpenses(wbReport);
      
      // Our calculations
      const calc = {
        revenue: calculated.redeemedAmount,
        commission: calculated.expenses.commission.total,
        logistics: calculated.expenses.logistics.total,
        storage: calculated.expenses.storage,
        acceptance: calculated.expenses.acceptance,
        penalties: calculated.expenses.penalties,
        totalExpenses: calculated.expenses.total,
        toTransfer: calculated.finalTransferAmount
      };
      
      // WB report
      const wb = {
        revenue: aggregated.totalRevenue,
        commission: aggregated.totalCommission,
        logistics: aggregated.totalLogistics + aggregated.totalLogisticsReturn,
        storage: aggregated.totalStorage,
        acceptance: aggregated.totalAcceptance,
        penalties: aggregated.totalPenalty,
        totalExpenses: aggregated.totalWbExpenses,
        toTransfer: aggregated.totalForPay
      };
      
      // Calculate discrepancies
      const discrepancies = {
        revenue: this.calculateDiscrepancy(calc.revenue, wb.revenue),
        commission: this.calculateDiscrepancy(calc.commission, wb.commission),
        logistics: this.calculateDiscrepancy(calc.logistics, wb.logistics),
        storage: this.calculateDiscrepancy(calc.storage, wb.storage),
        acceptance: this.calculateDiscrepancy(calc.acceptance, wb.acceptance),
        penalties: this.calculateDiscrepancy(calc.penalties, wb.penalties),
        totalExpenses: this.calculateDiscrepancy(calc.totalExpenses, wb.totalExpenses),
        toTransfer: this.calculateDiscrepancy(calc.toTransfer, wb.toTransfer)
      };
      
      // Calculate overall accuracy
      const accuracies = Object.values(discrepancies).map(d => 100 - Math.abs(d.percent));
      const overallAccuracy = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
      
      // Determine match quality
      let matchQuality: 'excellent' | 'good' | 'fair' | 'poor';
      if (overallAccuracy >= 95) matchQuality = 'excellent';
      else if (overallAccuracy >= 85) matchQuality = 'good';
      else if (overallAccuracy >= 70) matchQuality = 'fair';
      else matchQuality = 'poor';
      
      console.log(`✅ [Analytics Engine] Reconciliation complete:`, {
        matchQuality,
        overallAccuracy: `${overallAccuracy.toFixed(2)}%`,
        largestDiscrepancy: Object.entries(discrepancies)
          .sort((a, b) => Math.abs(b[1].percent) - Math.abs(a[1].percent))[0]
      });
      
      return {
        calculated: calc,
        wbReport: wb,
        discrepancies,
        matchQuality,
        overallAccuracy
      };
      
    } catch (error) {
      console.error('❌ [Analytics Engine] Reconciliation error:', error);
      throw error;
    }
  }
  
  /**
   * Calculate discrepancy between calculated and actual
   */
  private calculateDiscrepancy(calculated: number, actual: number): { diff: number; percent: number } {
    const diff = calculated - actual;
    const percent = actual !== 0 ? (diff / actual) * 100 : 0;
    return { diff, percent };
  }
  
  // ==================== MAIN EXECUTION ====================
  
  /**
   * Run complete analytics pipeline
   */
  async runCompleteAnalysis(dateFrom: Date, dateTo: Date): Promise<{
    orders: WbOrder[];
    expenses: OrderExpenses[];
    analytics: AggregatedAnalytics;
    reconciliation: ReconciliationResult;
  }> {
    console.log(`🚀 [Analytics Engine] Starting complete analysis for ${dateFrom.toISOString().split('T')[0]} to ${dateTo.toISOString().split('T')[0]}`);
    
    // Step 1: Fetch orders
    const orders = await this.fetchOrders(dateFrom, dateTo);
    
    // Step 2: Get KTR map and commission rates
    const ktrMap = await this.getKtrMap();
    const commissionRates = await this.getCommissionRates();
    
    // Step 3: Calculate expenses for each order
    const expenses: OrderExpenses[] = orders.map(order => {
      const ktr = ktrMap.get(order.warehouseName) || 1.0;
      const commissionRate = commissionRates.get(order.category) || 15;
      return this.calculateOrderExpenses(order, ktr, commissionRate);
    });
    
    // Step 4: Aggregate analytics
    const analytics = this.aggregateAnalytics(orders, expenses);
    
    // Step 5: Reconcile with WB report
    const reconciliation = await this.reconcile(analytics, dateFrom, dateTo);
    
    console.log(`✅ [Analytics Engine] Complete analysis finished`);
    
    return {
      orders,
      expenses,
      analytics,
      reconciliation
    };
  }
}
