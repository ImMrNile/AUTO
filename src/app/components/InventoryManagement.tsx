'use client';

import { useState, useEffect } from 'react';
import { Package, Warehouse, Edit2, Save, X, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

interface WarehouseStock {
  warehouseId: number;
  warehouseName: string;
  warehouseType: 'FBS' | 'FBO';
  stock: number;
  reserved: number;
}

interface ProductStock {
  nmId: number;
  vendorCode: string;
  warehouses: WarehouseStock[];
  totalStock: number;
  totalReserved: number;
  fbsStock: number;
  fboStock: number;
}

interface EditingStock {
  nmId: number;
  warehouseId: number;
  value: number;
  sku?: string;
}

export default function InventoryManagement() {
  const [stocks, setStocks] = useState<ProductStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingStock, setEditingStock] = useState<EditingStock | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadStocks();
  }, []);

  const loadStocks = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/wb/stocks');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки остатков');
      }

      setStocks(data.stocks || []);
    } catch (err) {
      console.error('❌ Ошибка загрузки остатков:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleDoubleClick = (nmId: number, warehouseId: number, currentStock: number, warehouseType: string) => {
    // Редактирование доступно только для FBS складов
    if (warehouseType !== 'FBS') {
      alert('Редактирование доступно только для FBS складов');
      return;
    }

    setEditingStock({
      nmId,
      warehouseId,
      value: currentStock
    });
  };

  const handleSaveStock = async () => {
    if (!editingStock) return;

    try {
      setSaving(true);

      const response = await fetch('/api/wb/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId: editingStock.warehouseId,
          sku: editingStock.sku || '',
          amount: editingStock.value
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка сохранения остатков');
      }

      setEditingStock(null);
      await loadStocks(); // Перезагружаем данные
    } catch (err) {
      console.error('❌ Ошибка сохранения остатков:', err);
      alert(err instanceof Error ? err.message : 'Ошибка сохранения остатков');
    } finally {
      setSaving(false);
    }
  };

  const filteredStocks = stocks.filter(stock => 
    stock.nmId.toString().includes(searchTerm) ||
    stock.vendorCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto text-purple-600 animate-spin mb-4" />
          <p className="text-gray-600">Загрузка остатков...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-container p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Ошибка загрузки остатков</h3>
        <p className="text-gray-400 mb-4">{error}</p>
        <button 
          className="glass-button-primary"
          onClick={loadStocks}
        >
          <RefreshCw className="w-4 h-4" />
          Повторить попытку
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Управление остатками</h2>
          <p className="text-gray-600">
            Остатки на складах Wildberries • Дважды кликните на FBS остаток для редактирования
          </p>
        </div>
        <button 
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          onClick={loadStocks}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="liquid-glass rounded-xl p-4">
          <div className="text-sm text-gray-600 mb-1 font-medium">Товаров</div>
          <div className="text-2xl font-bold text-gray-900">{stocks.length}</div>
        </div>
        
        <div className="liquid-glass rounded-xl p-4">
          <div className="text-sm text-gray-600 mb-1 font-medium">Всего на складах</div>
          <div className="text-2xl font-bold text-blue-600">
            {stocks.reduce((sum, s) => sum + s.totalStock, 0)} шт.
          </div>
        </div>
        
        <div className="liquid-glass rounded-xl p-4">
          <div className="text-sm text-gray-600 mb-1 font-medium">FBS остатки</div>
          <div className="text-2xl font-bold text-green-600">
            {stocks.reduce((sum, s) => sum + s.fbsStock, 0)} шт.
          </div>
        </div>
        
        <div className="liquid-glass rounded-xl p-4">
          <div className="text-sm text-gray-600 mb-1 font-medium">FBO остатки</div>
          <div className="text-2xl font-bold text-purple-600">
            {stocks.reduce((sum, s) => sum + s.fboStock, 0)} шт.
          </div>
        </div>
      </div>

      {/* Поиск */}
      <div className="liquid-glass rounded-xl p-4">
        <input
          type="text"
          placeholder="Поиск по nmID или артикулу"
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Таблица остатков */}
      <div className="liquid-glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">nmID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Артикул</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Склад</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Тип</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">
                  На складе ВБ
                  <span className="block text-xs text-gray-500 font-normal">Дважды кликните для редактирования FBS</span>
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Зарезервировано</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Доступно</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredStocks.map((product) => (
                product.warehouses.map((warehouse, idx) => (
                  <tr key={`${product.nmId}-${warehouse.warehouseId}`} className="hover:bg-white/5 transition-colors">
                    {idx === 0 && (
                      <>
                        <td rowSpan={product.warehouses.length} className="px-4 py-3 text-white font-mono border-r border-white/5">
                          {product.nmId}
                        </td>
                        <td rowSpan={product.warehouses.length} className="px-4 py-3 text-gray-300 border-r border-white/5">
                          {product.vendorCode}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-gray-300">
                      <div className="flex items-center gap-2">
                        <Warehouse className="w-4 h-4 text-gray-500" />
                        {warehouse.warehouseName}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        warehouse.warehouseType === 'FBS' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {warehouse.warehouseType}
                      </span>
                    </td>
                    <td 
                      className={`px-4 py-3 text-right ${
                        warehouse.warehouseType === 'FBS' 
                          ? 'cursor-pointer hover:bg-blue-500/10' 
                          : ''
                      }`}
                      onDoubleClick={() => handleDoubleClick(
                        product.nmId, 
                        warehouse.warehouseId, 
                        warehouse.stock,
                        warehouse.warehouseType
                      )}
                      title={warehouse.warehouseType === 'FBS' ? 'Дважды кликните для редактирования' : 'Редактирование доступно только для FBS'}
                    >
                      {editingStock?.nmId === product.nmId && editingStock?.warehouseId === warehouse.warehouseId ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            value={editingStock.value}
                            onChange={(e) => setEditingStock({
                              ...editingStock,
                              value: parseInt(e.target.value) || 0
                            })}
                            className="w-20 px-2 py-1 text-sm bg-black/30 border border-blue-500 rounded text-white text-right"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveStock}
                            disabled={saving}
                            className="p-1 text-green-400 hover:text-green-300 disabled:opacity-50"
                            title="Сохранить"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingStock(null)}
                            className="p-1 text-red-400 hover:text-red-300"
                            title="Отмена"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-semibold text-white">{warehouse.stock}</span>
                          {warehouse.warehouseType === 'FBS' && (
                            <Edit2 className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-yellow-400 font-semibold">{warehouse.reserved}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-green-400 font-semibold">{warehouse.stock - warehouse.reserved}</span>
                    </td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredStocks.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 mx-auto text-gray-400 mb-4 opacity-50" />
          <p className="text-gray-400">Остатки не найдены</p>
        </div>
      )}
    </div>
  );
}
