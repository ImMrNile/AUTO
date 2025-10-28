'use client';

import React from 'react';
import { ArrowLeft, Cookie, Info, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Политика использования Cookie</h1>
            <p className="text-sm text-gray-500">Последнее обновление: {new Date().toLocaleDateString('ru-RU')}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Intro */}
        <div className="bg-white rounded-xl border-2 border-amber-200 p-8 mb-8 shadow-sm">
          <div className="flex gap-4">
            <Cookie className="w-8 h-8 text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Что такое Cookie?</h2>
              <p className="text-gray-700">
                Cookie-файлы (печенье) — это небольшие текстовые файлы, которые сайт сохраняет на вашем компьютере 
                или мобильном устройстве. Они помогают нам улучшать работу сайта и предоставлять вам лучший опыт.
              </p>
            </div>
          </div>
        </div>

        {/* Table of Contents */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Содержание</h3>
          <ul className="space-y-2">
            {[
              { id: 'what-are', title: '1. Что такое Cookie?' },
              { id: 'types', title: '2. Типы Cookie' },
              { id: 'usage', title: '3. Как мы используем Cookie' },
              { id: 'third-party', title: '4. Cookie третьих лиц' },
              { id: 'manage', title: '5. Как управлять Cookie' },
              { id: 'duration', title: '6. Продолжительность хранения' },
              { id: 'security', title: '7. Безопасность' },
              { id: 'changes', title: '8. Изменения политики' },
              { id: 'contacts', title: '9. Контакты' },
            ].map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="text-amber-600 hover:text-amber-700 hover:underline">
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {/* 1. What are cookies */}
          <section id="what-are" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">1. Что такое Cookie?</h3>
            <div className="space-y-4 text-gray-700">
              <p>
                Cookie — это небольшие текстовые файлы, которые веб-сайты сохраняют на вашем устройстве 
                (компьютер, планшет, смартфон) при посещении сайта. Они содержат информацию, которая 
                помогает сайту запомнить вас и ваши предпочтения.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="font-semibold text-gray-900 mb-2">Примеры информации в Cookie:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <span className="text-amber-600">•</span>
                    <span>Язык интерфейса</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-600">•</span>
                    <span>Ваши предпочтения</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-600">•</span>
                    <span>Информация о сессии</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-600">•</span>
                    <span>Данные для аналитики</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* 2. Types */}
          <section id="types" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">2. Типы Cookie</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-blue-900 mb-2">🔒 Необходимые Cookie</p>
                <p className="text-blue-800 text-sm">
                  Обязательны для работы сайта. Они обеспечивают безопасность и функциональность. 
                  Вы не можете их отключить без нарушения работы сайта.
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="font-semibold text-green-900 mb-2">📊 Аналитические Cookie</p>
                <p className="text-green-800 text-sm">
                  Помогают нам понять, как вы используете сайт. Собирают информацию о количестве посещений, 
                  времени на сайте, страницах, которые вы посещали. Используются для улучшения сайта.
                </p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="font-semibold text-purple-900 mb-2">⚙️ Функциональные Cookie</p>
                <p className="text-purple-800 text-sm">
                  Запоминают ваши выборы и настройки (язык, регион, размер шрифта). 
                  Это улучшает ваш опыт при повторных посещениях.
                </p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="font-semibold text-orange-900 mb-2">📢 Маркетинговые Cookie</p>
                <p className="text-orange-800 text-sm">
                  Используются для показа релевантной рекламы. Отслеживают ваши интересы 
                  и показывают объявления, которые вас могут заинтересовать.
                </p>
              </div>
            </div>
          </section>

          {/* 3. Usage */}
          <section id="usage" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">3. Как мы используем Cookie</h3>
            <div className="space-y-4 text-gray-700">
              <div>
                <p className="font-semibold text-gray-900 mb-2">Аутентификация и безопасность</p>
                <p>Сохраняем информацию о вашей сессии для безопасного входа в аккаунт.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-2">Персонализация</p>
                <p>Запоминаем ваши предпочтения, язык и другие настройки.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-2">Аналитика</p>
                <p>Анализируем, как вы используете сайт, чтобы улучшить его функциональность.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-2">Маркетинг</p>
                <p>Показываем вам релевантные объявления на основе ваших интересов.</p>
              </div>
            </div>
          </section>

          {/* 4. Third Party */}
          <section id="third-party" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">4. Cookie третьих лиц</h3>
            <div className="space-y-4 text-gray-700">
              <p>
                Мы используем сервисы третьих лиц, которые также могут устанавливать cookie:
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <span className="text-gray-600">•</span>
                    <span><strong>Google Analytics</strong> - аналитика трафика</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gray-600">•</span>
                    <span><strong>Яндекс.Метрика</strong> - аналитика для РФ</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gray-600">•</span>
                    <span><strong>Рекламные сети</strong> - показ релевантной рекламы</span>
                  </li>
                </ul>
              </div>
              <p className="text-sm text-gray-600">
                Мы не контролируем эти cookie, но требуем от партнеров соблюдать стандарты конфиденциальности.
              </p>
            </div>
          </section>

          {/* 5. Manage */}
          <section id="manage" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">5. Как управлять Cookie</h3>
            <div className="space-y-4 text-gray-700">
              <div>
                <p className="font-semibold text-gray-900 mb-2">На нашем сайте</p>
                <p>
                  Используйте баннер согласия cookie в нижней части экрана. Вы можете выбрать, 
                  какие типы cookie вы хотите разрешить.
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-2">В браузере</p>
                <p className="text-sm mb-2">Вы можете управлять cookie через настройки браузера:</p>
                <ul className="space-y-2 text-sm ml-4">
                  <li className="flex gap-2">
                    <span className="text-gray-600">•</span>
                    <span><strong>Chrome:</strong> Настройки → Конфиденциальность и безопасность → Cookie</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gray-600">•</span>
                    <span><strong>Firefox:</strong> Настройки → Приватность и защита → Cookie</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gray-600">•</span>
                    <span><strong>Safari:</strong> Настройки → Приватность → Управление данными сайтов</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gray-600">•</span>
                    <span><strong>Edge:</strong> Параметры → Приватность → Cookie и другие данные сайтов</span>
                  </li>
                </ul>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="font-semibold text-amber-900 mb-2">⚠️ Важно</p>
                <p className="text-amber-800 text-sm">
                  Отключение необходимых cookie может нарушить работу сайта. 
                  Мы рекомендуем отключать только маркетинговые и аналитические cookie.
                </p>
              </div>
            </div>
          </section>

          {/* 6. Duration */}
          <section id="duration" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">6. Продолжительность хранения</h3>
            <div className="space-y-4 text-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-gray-900">Тип Cookie</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-900">Продолжительность</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 px-3">Сессионные</td>
                    <td className="py-2 px-3">Удаляются при закрытии браузера</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 px-3">Постоянные</td>
                    <td className="py-2 px-3">От нескольких дней до нескольких лет</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Аналитические</td>
                    <td className="py-2 px-3">Обычно 1-2 года</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 7. Security */}
          <section id="security" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">7. Безопасность</h3>
            <div className="space-y-4 text-gray-700">
              <p>
                Мы принимаем меры для защиты ваших cookie и данных:
              </p>
              <ul className="space-y-2">
                <li className="flex gap-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Используем HTTPS для шифрования данных</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Не сохраняем чувствительную информацию в cookie</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Регулярно обновляем системы безопасности</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Соблюдаем стандарты конфиденциальности</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 8. Changes */}
          <section id="changes" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">8. Изменения политики</h3>
            <div className="space-y-4 text-gray-700">
              <p>
                Мы можем обновлять эту политику в любое время. Значительные изменения 
                будут уведомлены вам через баннер на сайте.
              </p>
              <p>
                Продолжение использования сайта после изменений означает ваше согласие с новой политикой.
              </p>
            </div>
          </section>

          {/* 9. Contacts */}
          <section id="contacts" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">9. Контакты</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <p className="text-gray-700 mb-4">
                Если у вас есть вопросы о cookie или нашей политике:
              </p>
              <div className="space-y-3 text-gray-700">
                <div>
                  <p className="font-semibold text-gray-900">Email:</p>
                  <a href="mailto:privacy@wb-automation.ru" className="text-amber-600 hover:underline">
                    privacy@wb-automation.ru
                  </a>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Форма обратной связи:</p>
                  <Link href="/contact" className="text-amber-600 hover:underline">
                    Перейти к форме
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Important Notice */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-8">
            <div className="flex gap-4">
              <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-blue-900 mb-2">Соответствие законодательству</h4>
                <p className="text-blue-800 text-sm">
                  Эта политика соответствует требованиям Федерального закона №152-ФЗ 
                  «О защите персональных данных» и требованиям Роскомнадзора 2025 года.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-600 text-sm">
          <p>© {new Date().getFullYear()} WB Automation. Все права защищены.</p>
          <p className="mt-2">Последнее обновление: {new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>
    </div>
  );
}
