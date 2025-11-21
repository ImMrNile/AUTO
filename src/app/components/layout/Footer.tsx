'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, MapPin, Phone, Github, Linkedin, Twitter } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">WB Automation</h3>
            <p className="text-sm text-gray-400 mb-4">
              Система автоматизации для Wildberries с ИИ-ассистентом
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <a href="mailto:support@wb-automation.ru" className="hover:text-white transition-colors">
                  support@wb-automation.ru
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <a href="mailto:privacy@wb-automation.ru" className="hover:text-white transition-colors">
                  privacy@wb-automation.ru
                </a>
              </div>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold mb-4">Продукт</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Главная
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-white transition-colors">
                  Возможности
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  Цены
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Контакты
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold mb-4">Правовая информация</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors flex items-center gap-1">
                  🔒 Политика конфиденциальности
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors flex items-center gap-1">
                  📋 Пользовательское соглашение
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-white transition-colors flex items-center gap-1">
                  🍪 Политика cookie
                </Link>
              </li>
              <li>
                <a href="#" onClick={() => {
                  const event = new CustomEvent('openCookieSettings');
                  window.dispatchEvent(event);
                }} className="hover:text-white transition-colors flex items-center gap-1">
                  ⚙️ Управление cookie
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white font-semibold mb-4">Ресурсы</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/docs" className="hover:text-white transition-colors">
                  Документация
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">
                  Блог
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/support" className="hover:text-white transition-colors">
                  Поддержка
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 py-8">
          {/* Compliance Notice */}
          <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4 mb-8">
            <p className="text-xs text-blue-300 mb-2">
              <strong>📋 Соответствие требованиям РКН 2025:</strong>
            </p>
            <p className="text-xs text-gray-400">
              Сайт полностью соответствует требованиям Роскомнадзора по обработке персональных данных. 
              Все данные хранятся на территории Российской Федерации. 
              Ознакомьтесь с нашей <Link href="/privacy" className="text-blue-400 hover:text-blue-300">Политикой конфиденциальности</Link> и 
              <Link href="/terms" className="text-blue-400 hover:text-blue-300"> Пользовательским соглашением</Link>.
            </p>
          </div>

          {/* Social Links */}
          <div className="flex justify-center gap-6 mb-8">
            <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="GitHub">
              <Github className="w-5 h-5" />
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="LinkedIn">
              <Linkedin className="w-5 h-5" />
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="Twitter">
              <Twitter className="w-5 h-5" />
            </a>
          </div>

          {/* Bottom Footer */}
          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
            <p>
              © {currentYear} WB Automation. Все права защищены.
            </p>
            <p className="mt-4 md:mt-0">
              Разработано с ❤️ для автоматизации Wildberries
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
