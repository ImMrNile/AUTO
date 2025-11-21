'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ChevronDown, Building2, Check, Loader2, Wallet, Plus } from 'lucide-react';

interface Cabinet {
  id: string;
  name: string;
  isActive: boolean;
}

interface CabinetSwitcherProps {
  onCabinetChange?: (cabinetId: string) => void;
}

export default function CabinetSwitcher({ onCabinetChange }: CabinetSwitcherProps) {
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [selectedCabinet, setSelectedCabinet] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });

  // Загружаем кабинеты при монтировании
  useEffect(() => {
    loadCabinets();
    loadBalance();
  }, []);

  // Загружаем выбранный кабинет из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('selectedCabinet');
    if (saved && cabinets.find(c => c.id === saved)) {
      setSelectedCabinet(saved);
      onCabinetChange?.(saved); // ✅ Уведомляем родителя
    } else if (cabinets.length > 0) {
      setSelectedCabinet(cabinets[0].id);
      onCabinetChange?.(cabinets[0].id); // ✅ Уведомляем родителя
    }
  }, [cabinets]);

  const loadCabinets = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/cabinets');
      if (!response.ok) {
        throw new Error('Ошибка загрузки кабинетов');
      }
      const data = await response.json();
      if (data.success && data.cabinets) {
        setCabinets(data.cabinets);
      }
    } catch (err: any) {
      console.error('❌ Ошибка загрузки кабинетов:', err);
      setError(err.message || 'Ошибка загрузки кабинетов');
    } finally {
      setLoading(false);
    }
  };

  const loadBalance = async () => {
    try {
      const response = await fetch('/api/user/balance');
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance || 0);
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки баланса:', err);
    }
  };

  const handleSelectCabinet = (cabinetId: string) => {
    setSelectedCabinet(cabinetId);
    localStorage.setItem('selectedCabinet', cabinetId);
    setIsOpen(false);
    onCabinetChange?.(cabinetId);
  };

  const handleToggleMenu = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width
      });
    }
    setIsOpen(!isOpen);
  };

  const handleAddBalance = async () => {
    const amount = parseFloat(balanceInput);
    if (!amount || amount <= 0) {
      alert('Введите корректную сумму');
      return;
    }

    try {
      const response = await fetch('/api/user/balance/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });

      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance);
        setBalanceInput('');
        setShowBalanceModal(false);
      }
    } catch (err) {
      console.error('❌ Ошибка пополнения баланса:', err);
      alert('Ошибка при пополнении баланса');
    }
  };

  const currentCabinet = cabinets.find(c => c.id === selectedCabinet);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
        <span className="text-xs text-gray-700">Загрузка...</span>
      </div>
    );
  }

  if (error || cabinets.length === 0) {
    return (
      <div className="text-xs text-red-700">
        {error || 'Кабинеты не найдены'}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 md:gap-3">
      {/* Кабинет */}
      <div className="relative flex-1">
        <button
          ref={buttonRef}
          onClick={handleToggleMenu}
          className="w-full px-2 py-1.5 md:px-3 md:py-2 bg-white border-2 border-gray-300 rounded-lg flex items-center gap-2 hover:border-purple-400 hover:shadow-md transition-all"
        >
          <Building2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-600" />
          <div className="text-left flex-1 min-w-0">
            <div className="text-xs md:text-sm font-semibold text-gray-900 truncate">
              {currentCabinet?.name || 'Кабинет'}
            </div>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 md:w-4 md:h-4 text-gray-600 transition-transform flex-shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Закрытие меню при клике вне */}
        {isOpen && (
          <div
            className="fixed inset-0 z-[999998]"
            onClick={() => setIsOpen(false)}
          />
        )}

        {/* Выпадающее меню - FIXED позиционирование, поверх всех элементов */}
        {isOpen && (
          <div 
            className="fixed bg-white rounded-lg border-2 border-gray-300 shadow-2xl z-[999999] overflow-hidden"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              width: `${menuPosition.width}px`
            }}
          >
            <div className="max-h-48 overflow-y-auto">
              {cabinets.map((cabinet) => (
                <button
                  key={cabinet.id}
                  onClick={() => handleSelectCabinet(cabinet.id)}
                  className={`w-full px-4 py-2 text-left transition-all border-b border-gray-100 last:border-b-0 text-sm ${
                    selectedCabinet === cabinet.id
                      ? 'bg-purple-50 border-l-4 border-l-purple-600'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{cabinet.name}</span>
                      {selectedCabinet === cabinet.id && (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    {cabinet.isActive && (
                      <div className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold whitespace-nowrap">
                        Активен
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Баланс (единый для всех кабинетов) - скрываем на мобильных */}
      <div className="hidden md:block">
        <button
          onClick={() => setShowBalanceModal(true)}
          className="px-3 py-2 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg flex items-center gap-2 hover:border-green-400 hover:shadow-md transition-all"
        >
          <Wallet className="w-3.5 h-3.5 text-green-600" />
          <div className="text-left">
            <div className="text-xs font-semibold text-green-900">
              ₽{balance.toLocaleString('ru-RU')}
            </div>
          </div>
          <Plus className="w-3.5 h-3.5 text-green-600" />
        </button>
      </div>

      {/* Модальное окно пополнения баланса */}
      {showBalanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl border-2 border-gray-300 p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Пополнить баланс</h3>
            <input
              type="number"
              value={balanceInput}
              onChange={(e) => setBalanceInput(e.target.value)}
              placeholder="Сумма в рублях"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg mb-4 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddBalance}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold py-2 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all"
              >
                Пополнить
              </button>
              <button
                onClick={() => setShowBalanceModal(false)}
                className="flex-1 bg-gray-200 text-gray-900 font-semibold py-2 rounded-lg hover:bg-gray-300 transition-all"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
