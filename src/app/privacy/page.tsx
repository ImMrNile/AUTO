'use client';

import React from 'react';
import { ArrowLeft, FileText, Shield, Cookie, Lock } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Политика обработки персональных данных</h1>
            <p className="text-sm text-gray-500">Последнее обновление: {new Date().toLocaleDateString('ru-RU')}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Intro */}
        <div className="bg-white rounded-xl border-2 border-blue-200 p-8 mb-8 shadow-sm">
          <div className="flex gap-4">
            <Shield className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Защита ваших данных</h2>
              <p className="text-gray-700">
                Настоящая Политика обработки персональных данных разработана в соответствии с Федеральным законом 
                от 27.07.2006 № 152-ФЗ «О защите персональных данных» и определяет порядок обработки и защиты 
                персональных данных пользователей сайта.
              </p>
            </div>
          </div>
        </div>

        {/* Table of Contents */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Содержание</h3>
          <ul className="space-y-2">
            {[
              { id: 'definitions', title: '1. Определения' },
              { id: 'collection', title: '2. Цели обработки персональных данных' },
              { id: 'categories', title: '3. Категории персональных данных' },
              { id: 'legal-basis', title: '4. Правовые основания' },
              { id: 'subjects', title: '5. Категории субъектов' },
              { id: 'processing', title: '6. Порядок обработки' },
              { id: 'cookies', title: '7. Использование Cookie' },
              { id: 'storage', title: '8. Хранение данных' },
              { id: 'rights', title: '9. Права субъектов' },
              { id: 'contacts', title: '10. Контактная информация' },
            ].map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="text-blue-600 hover:text-blue-700 hover:underline">
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {/* 1. Definitions */}
          <section id="definitions" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">1. Определения</h3>
            <div className="space-y-4 text-gray-700">
              <div>
                <p className="font-semibold text-gray-900">Персональные данные</p>
                <p>Любая информация, относящаяся к определенному или определяемому физическому лицу (субъекту персональных данных).</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Обработка персональных данных</p>
                <p>Любое действие (операция) или совокупность действий, совершаемых с персональными данными, такие как сбор, запись, систематизация, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передача, блокирование, удаление, уничтожение.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Оператор персональных данных</p>
                <p>Компания, которая самостоятельно или совместно с другими лицами организует и/или осуществляет обработку персональных данных.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Субъект персональных данных</p>
                <p>Физическое лицо, к которому относятся персональные данные.</p>
              </div>
            </div>
          </section>

          {/* 2. Collection Purposes */}
          <section id="collection" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">2. Цели обработки персональных данных</h3>
            <ul className="space-y-3 text-gray-700">
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold">•</span>
                <span>Регистрация и авторизация пользователей на сайте</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold">•</span>
                <span>Предоставление доступа к функциям и услугам сайта</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold">•</span>
                <span>Обработка заказов и платежей</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold">•</span>
                <span>Связь с пользователем (отправка уведомлений, ответ на запросы)</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold">•</span>
                <span>Аналитика и улучшение качества сайта</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold">•</span>
                <span>Соответствие законодательству Российской Федерации</span>
              </li>
            </ul>
          </section>

          {/* 3. Categories of Data */}
          <section id="categories" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">3. Категории персональных данных</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-4">
              <p className="text-gray-900 font-semibold mb-3">Мы собираем следующие категории персональных данных:</p>
            </div>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-600 pl-4">
                <p className="font-semibold text-gray-900">Данные при регистрации:</p>
                <p className="text-gray-700">Имя, фамилия, адрес электронной почты, номер телефона, пароль</p>
              </div>
              <div className="border-l-4 border-blue-600 pl-4">
                <p className="font-semibold text-gray-900">Технические данные:</p>
                <p className="text-gray-700">IP-адрес, тип браузера, операционная система, время посещения, страницы сайта</p>
              </div>
              <div className="border-l-4 border-blue-600 pl-4">
                <p className="font-semibold text-gray-900">Данные о заказах:</p>
                <p className="text-gray-700">Информация о покупках, адрес доставки, способ оплаты</p>
              </div>
              <div className="border-l-4 border-blue-600 pl-4">
                <p className="font-semibold text-gray-900">Cookie-файлы:</p>
                <p className="text-gray-700">Идентификаторы сессии, предпочтения пользователя</p>
              </div>
            </div>
          </section>

          {/* 4. Legal Basis */}
          <section id="legal-basis" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">4. Правовые основания</h3>
            <p className="text-gray-700 mb-4">
              Обработка персональных данных осуществляется на основании:
            </p>
            <ul className="space-y-3 text-gray-700">
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold">•</span>
                <span>Федеральный закон от 27.07.2006 № 152-ФЗ «О защите персональных данных»</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold">•</span>
                <span>Согласие субъекта персональных данных на обработку</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold">•</span>
                <span>Исполнение договора с субъектом персональных данных</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold">•</span>
                <span>Соответствие законодательству Российской Федерации</span>
              </li>
            </ul>
          </section>

          {/* 5. Categories of Subjects */}
          <section id="subjects" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">5. Категории субъектов персональных данных</h3>
            <ul className="space-y-3 text-gray-700">
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold">•</span>
                <span>Зарегистрированные пользователи сайта</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold">•</span>
                <span>Посетители сайта</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold">•</span>
                <span>Покупатели товаров и услуг</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold">•</span>
                <span>Лица, оставившие контактную информацию через формы обратной связи</span>
              </li>
            </ul>
          </section>

          {/* 6. Processing Order */}
          <section id="processing" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">6. Порядок обработки персональных данных</h3>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-gray-900 mb-2">Сбор данных</p>
                <p className="text-gray-700">Персональные данные собираются при регистрации, заполнении форм, совершении покупок и автоматически при посещении сайта.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-2">Использование данных</p>
                <p className="text-gray-700">Данные используются только в целях, указанных в настоящей Политике, и не передаются третьим лицам без согласия.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-2">Защита данных</p>
                <p className="text-gray-700">Мы применяем технические и организационные меры для защиты персональных данных от несанкционированного доступа.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-2">Хранение данных</p>
                <p className="text-gray-700">Персональные данные хранятся на защищенных серверах на территории Российской Федерации.</p>
              </div>
            </div>
          </section>

          {/* 7. Cookies */}
          <section id="cookies" className="bg-white rounded-xl border border-amber-200 p-8 bg-amber-50">
            <div className="flex gap-4 mb-4">
              <Cookie className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <h3 className="text-xl font-bold text-gray-900">7. Использование Cookie-файлов</h3>
            </div>
            <div className="space-y-4 text-gray-700">
              <p>
                Сайт использует cookie-файлы для улучшения пользовательского опыта, аналитики и персонализации контента.
              </p>
              <div className="bg-white rounded-lg p-4 border border-amber-200">
                <p className="font-semibold text-gray-900 mb-2">Типы используемых cookie:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <span className="text-amber-600">•</span>
                    <span><strong>Необходимые:</strong> для работы сайта и безопасности</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-600">•</span>
                    <span><strong>Аналитические:</strong> для анализа трафика и поведения пользователей</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-600">•</span>
                    <span><strong>Функциональные:</strong> для сохранения предпочтений пользователя</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-600">•</span>
                    <span><strong>Маркетинговые:</strong> для показа релевантной рекламы</span>
                  </li>
                </ul>
              </div>
              <p>
                Вы можете управлять cookie-файлами через настройки браузера. Отключение некоторых cookie может повлиять на функциональность сайта.
              </p>
            </div>
          </section>

          {/* 8. Storage */}
          <section id="storage" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">8. Хранение и защита данных</h3>
            <div className="space-y-4 text-gray-700">
              <div>
                <p className="font-semibold text-gray-900 mb-2">Место хранения</p>
                <p>Все персональные данные хранятся на защищенных серверах, расположенных на территории Российской Федерации.</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-gray-900 mb-2">Меры безопасности:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <span className="text-blue-600">✓</span>
                    <span>Шифрование данных при передаче (SSL/TLS)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600">✓</span>
                    <span>Контроль доступа и аутентификация</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600">✓</span>
                    <span>Регулярное резервное копирование</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600">✓</span>
                    <span>Мониторинг безопасности</span>
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-2">Период хранения</p>
                <p>Персональные данные хранятся в течение всего периода использования сайта и удаляются по запросу пользователя или по истечении срока, установленного законодательством.</p>
              </div>
            </div>
          </section>

          {/* 9. Rights */}
          <section id="rights" className="bg-white rounded-xl border border-green-200 p-8 bg-green-50">
            <h3 className="text-xl font-bold text-gray-900 mb-4">9. Права субъектов персональных данных</h3>
            <p className="text-gray-700 mb-4">
              В соответствии с законодательством Российской Федерации вы имеете право:
            </p>
            <ul className="space-y-3 text-gray-700">
              <li className="flex gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span>Получить информацию о том, какие данные о вас обрабатываются</span>
              </li>
              <li className="flex gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span>Требовать уточнения, обновления или исправления неточных данных</span>
              </li>
              <li className="flex gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span>Требовать удаления ваших персональных данных</span>
              </li>
              <li className="flex gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span>Отозвать согласие на обработку данных</span>
              </li>
              <li className="flex gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span>Подать жалобу в надзорный орган</span>
              </li>
            </ul>
            <div className="bg-white rounded-lg p-4 border border-green-200 mt-4">
              <p className="text-sm text-gray-700">
                Для реализации своих прав свяжитесь с нами по контактам, указанным ниже.
              </p>
            </div>
          </section>

          {/* 10. Contacts */}
          <section id="contacts" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">10. Контактная информация</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <p className="text-gray-700 mb-4">
                Если у вас есть вопросы о настоящей Политике или вы хотите реализовать свои права, свяжитесь с нами:
              </p>
              <div className="space-y-3 text-gray-700">
                <div>
                  <p className="font-semibold text-gray-900">Email:</p>
                  <a href="mailto:privacy@wb-automation.ru" className="text-blue-600 hover:underline">
                    privacy@wb-automation.ru
                  </a>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Форма обратной связи:</p>
                  <Link href="/contact" className="text-blue-600 hover:underline">
                    Перейти к форме
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Important Notice */}
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8">
            <div className="flex gap-4">
              <Lock className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-red-900 mb-2">Важно</h4>
                <p className="text-red-800 text-sm">
                  Настоящая Политика может быть обновлена в любое время. Мы рекомендуем регулярно проверять эту страницу 
                  для ознакомления с последними изменениями. Продолжение использования сайта после опубликования изменений 
                  означает ваше согласие с новой Политикой.
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
