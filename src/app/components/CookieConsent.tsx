'use client';

import React, { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';
import Link from 'next/link';

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
    functional: false,
  });

  useEffect(() => {
    const savedConsent = localStorage.getItem('cookie-consent');
    if (!savedConsent) {
      setIsVisible(true);
    } else {
      try {
        const saved = JSON.parse(savedConsent);
        setPreferences(saved);
      } catch (e) {
        setIsVisible(true);
      }
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true,
    };
    localStorage.setItem('cookie-consent', JSON.stringify(allAccepted));
    setPreferences(allAccepted);
    setIsVisible(false);
  };

  const handleRejectAll = () => {
    const minimal = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false,
    };
    localStorage.setItem('cookie-consent', JSON.stringify(minimal));
    setPreferences(minimal);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20"
        onClick={() => setIsVisible(false)}
      />

      {/* Cookie Banner */}
      <div className="relative bg-white border-t-2 border-amber-400 shadow-xl">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Content */}
            <div className="flex items-start gap-3 flex-1">
              <Cookie className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  Мы используем cookie
                </p>
                <p className="text-xs text-gray-600">
                  Для улучшения работы сайта и аналитики.{' '}
                  <Link href="/cookies" className="text-blue-600 hover:underline">
                    Подробнее
                  </Link>
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
              <button
                onClick={handleRejectAll}
                className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-900 rounded transition-colors"
              >
                Отклонить
              </button>
              <button
                onClick={handleAcceptAll}
                className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors"
              >
                Принять
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
