// src/components/ProductForm/DiagnosticPanel.tsx - Компонент для отладки

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Bug, Database, Zap } from 'lucide-react';

interface DiagnosticPanelProps {
  productId: string | null;
  aiCharacteristics: any[];
  allCategoryCharacteristics: any[];
  aiResponse: any;
  rawApiData?: any;
}

export const DiagnosticPanel: React.FC<DiagnosticPanelProps> = ({
  productId,
  aiCharacteristics,
  allCategoryCharacteristics,
  aiResponse,
  rawApiData
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');

  if (!productId) return null;

  return (
    <div className="bg-gray-900/80 border border-gray-600/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-gray-300 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4" />
          <span className="text-sm font-medium">Диагностика данных</span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isExpanded && (
        <div className="border-t border-gray-600/30">
          {/* Tabs */}
          <div className="flex border-b border-gray-600/30">
            {['summary', 'ai_data', 'api_response'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab === 'summary' && 'Сводка'}
                {tab === 'ai_data' && 'ИИ данные'}
                {tab === 'api_response' && 'API ответ'}
              </button>
            ))}
          </div>

          <div className="p-4 text-xs text-gray-300 max-h-96 overflow-auto">
            {activeTab === 'summary' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-white mb-2">Статистика:</h4>
                  <ul className="space-y-1">
                    <li>Product ID: {productId}</li>
                    <li>AI Характеристик: {aiCharacteristics?.length || 0}</li>
                    <li>Категория характеристик: {allCategoryCharacteristics?.length || 0}</li>
                    <li>AI Response объект: {aiResponse ? 'Есть' : 'Нет'}</li>
                    <li>Raw API данные: {rawApiData ? 'Есть' : 'Нет'}</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-white mb-2">Заполненные характеристики:</h4>
                  {aiCharacteristics?.filter(c => c.isFilled).map(char => (
                    <div key={char.id} className="text-green-400">
                      • {char.name}: {char.value}
                    </div>
                  ))}
                </div>

                <div>
                  <h4 className="font-medium text-white mb-2">Пустые характеристики:</h4>
                  {aiCharacteristics?.filter(c => !c.isFilled).slice(0, 5).map(char => (
                    <div key={char.id} className="text-red-400">
                      • {char.name}: {char.category || 'unknown'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'ai_data' && (
              <pre className="whitespace-pre-wrap text-xs">
                {JSON.stringify({
                  aiResponseKeys: aiResponse ? Object.keys(aiResponse) : [],
                  sampleAiCharacteristics: aiCharacteristics?.slice(0, 3),
                  totalAiChars: aiCharacteristics?.length
                }, null, 2)}
              </pre>
            )}

            {activeTab === 'api_response' && (
              <pre className="whitespace-pre-wrap text-xs">
                {JSON.stringify(rawApiData || 'Нет данных', null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
