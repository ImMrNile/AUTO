'use client';

import React from 'react';
import { ArrowLeft, FileText, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Пользовательское соглашение</h1>
            <p className="text-sm text-gray-500">Последнее обновление: {new Date().toLocaleDateString('ru-RU')}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Intro */}
        <div className="bg-white rounded-xl border-2 border-purple-200 p-8 mb-8 shadow-sm">
          <div className="flex gap-4">
            <FileText className="w-8 h-8 text-purple-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Условия использования</h2>
              <p className="text-gray-700">
                Настоящее Пользовательское соглашение (далее — «Соглашение») является договором между вами и компанией 
                WB Automation и определяет условия использования сайта и предоставляемых услуг.
              </p>
            </div>
          </div>
        </div>

        {/* Table of Contents */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Содержание</h3>
          <ul className="space-y-2">
            {[
              { id: 'general', title: '1. Общие положения' },
              { id: 'rights', title: '2. Права и обязанности' },
              { id: 'account', title: '3. Учетная запись пользователя' },
              { id: 'content', title: '4. Контент и интеллектуальная собственность' },
              { id: 'restrictions', title: '5. Ограничения использования' },
              { id: 'liability', title: '6. Ограничение ответственности' },
              { id: 'changes', title: '7. Изменение Соглашения' },
              { id: 'termination', title: '8. Прекращение доступа' },
              { id: 'law', title: '9. Применимое право' },
              { id: 'contacts', title: '10. Контакты' },
            ].map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="text-purple-600 hover:text-purple-700 hover:underline">
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {/* 1. General */}
          <section id="general" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">1. Общие положения</h3>
            <div className="space-y-4 text-gray-700">
              <p>
                Используя сайт WB Automation (далее — «Сайт»), вы соглашаетесь с условиями настоящего Соглашения. 
                Если вы не согласны с какой-либо частью этого Соглашения, пожалуйста, не используйте Сайт.
              </p>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="font-semibold text-gray-900 mb-2">Сайт предоставляет следующие услуги:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <span className="text-purple-600">•</span>
                    <span>Управление товарами на Wildberries</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-600">•</span>
                    <span>Аналитика продаж и производительности</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-600">•</span>
                    <span>Автоматизация бизнес-процессов</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-600">•</span>
                    <span>Другие вспомогательные функции</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* 2. Rights and Obligations */}
          <section id="rights" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">2. Права и обязанности сторон</h3>
            
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Права пользователя
              </h4>
              <ul className="space-y-2 text-gray-700 ml-7">
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Использовать Сайт в личных целях</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Получать поддержку от нашей команды</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Отозвать согласие на обработку данных</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Удалить свою учетную запись</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Обязанности пользователя
              </h4>
              <ul className="space-y-2 text-gray-700 ml-7">
                <li className="flex gap-2">
                  <span className="text-amber-600">•</span>
                  <span>Предоставлять точную и полную информацию</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-600">•</span>
                  <span>Соблюдать законодательство Российской Федерации</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-600">•</span>
                  <span>Не использовать Сайт в незаконных целях</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-600">•</span>
                  <span>Защищать конфиденциальность своих учетных данных</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 3. Account */}
          <section id="account" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">3. Учетная запись пользователя</h3>
            <div className="space-y-4 text-gray-700">
              <div>
                <p className="font-semibold text-gray-900 mb-2">Регистрация</p>
                <p>
                  Для использования некоторых функций Сайта требуется создание учетной записи. Вы обязаны предоставить 
                  точную информацию и поддерживать ее в актуальном состоянии.
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-2">Безопасность пароля</p>
                <p>
                  Вы несете полную ответственность за сохранность пароля и всех действий, совершаемых с использованием 
                  вашей учетной записи. Немедленно уведомляйте нас о любом несанкционированном доступе.
                </p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="font-semibold text-red-900 mb-2">Ответственность</p>
                <p className="text-red-800 text-sm">
                  Мы не несем ответственность за убытки, возникшие в результате несанкционированного использования 
                  вашей учетной записи.
                </p>
              </div>
            </div>
          </section>

          {/* 4. Content */}
          <section id="content" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">4. Контент и интеллектуальная собственность</h3>
            <div className="space-y-4 text-gray-700">
              <div>
                <p className="font-semibold text-gray-900 mb-2">Права на контент Сайта</p>
                <p>
                  Весь контент на Сайте (текст, изображения, логотипы, видео и т.д.) защищен авторским правом и 
                  является собственностью WB Automation или его лицензиаров.
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-2">Ваш контент</p>
                <p>
                  Загружая контент на Сайт, вы предоставляете нам лицензию на его использование в целях предоставления 
                  услуг. Вы сохраняете все права на загруженный контент.
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-gray-900 mb-2">Запрещено:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <span className="text-blue-600">✗</span>
                    <span>Копировать или воспроизводить контент без разрешения</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600">✗</span>
                    <span>Использовать контент в коммерческих целях</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600">✗</span>
                    <span>Модифицировать или адаптировать контент</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* 5. Restrictions */}
          <section id="restrictions" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">5. Ограничения использования</h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="font-semibold text-red-900 mb-4">Вы не имеете права:</p>
              <ul className="space-y-3 text-gray-700">
                <li className="flex gap-3">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span>Использовать Сайт для незаконной деятельности</span>
                </li>
                <li className="flex gap-3">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span>Распространять вредоносное ПО или вирусы</span>
                </li>
                <li className="flex gap-3">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span>Осуществлять несанкционированный доступ к системам</span>
                </li>
                <li className="flex gap-3">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span>Создавать автоматизированные системы для сбора данных</span>
                </li>
                <li className="flex gap-3">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span>Совершать действия, нарушающие права других пользователей</span>
                </li>
                <li className="flex gap-3">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span>Использовать Сайт в целях конкуренции или копирования</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 6. Liability */}
          <section id="liability" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">6. Ограничение ответственности</h3>
            <div className="space-y-4 text-gray-700">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="font-semibold text-yellow-900 mb-2">Важно:</p>
                <p className="text-yellow-800 text-sm">
                  Сайт предоставляется «как есть» без каких-либо гарантий. Мы не гарантируем бесперебойную работу 
                  или отсутствие ошибок.
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-2">Мы не несем ответственность за:</p>
                <ul className="space-y-2 text-sm ml-4">
                  <li className="flex gap-2">
                    <span className="text-yellow-600">•</span>
                    <span>Потерю данных или прерывание доступа</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-yellow-600">•</span>
                    <span>Убытки, вызванные использованием Сайта</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-yellow-600">•</span>
                    <span>Действия третьих лиц</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-yellow-600">•</span>
                    <span>Технические сбои или форс-мажорные обстоятельства</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* 7. Changes */}
          <section id="changes" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">7. Изменение Соглашения</h3>
            <div className="space-y-4 text-gray-700">
              <p>
                Мы оставляем за собой право изменять условия настоящего Соглашения в любое время. Значительные изменения 
                будут уведомлены вам по электронной почте или через уведомление на Сайте.
              </p>
              <p>
                Продолжение использования Сайта после опубликования изменений означает ваше согласие с новыми условиями.
              </p>
            </div>
          </section>

          {/* 8. Termination */}
          <section id="termination" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">8. Прекращение доступа</h3>
            <div className="space-y-4 text-gray-700">
              <div>
                <p className="font-semibold text-gray-900 mb-2">Вы можете:</p>
                <p>Удалить свою учетную запись в любое время через настройки профиля.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-2">Мы можем:</p>
                <p>
                  Заблокировать или удалить вашу учетную запись без предварительного уведомления в случае нарушения 
                  условий Соглашения.
                </p>
              </div>
            </div>
          </section>

          {/* 9. Law */}
          <section id="law" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">9. Применимое право</h3>
            <div className="space-y-4 text-gray-700">
              <p>
                Настоящее Соглашение регулируется законодательством Российской Федерации. Любые споры разрешаются 
                в соответствии с применимым законодательством.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm">
                  Если у вас есть претензии или жалобы, пожалуйста, свяжитесь с нами в соответствии с разделом 10.
                </p>
              </div>
            </div>
          </section>

          {/* 10. Contacts */}
          <section id="contacts" className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">10. Контактная информация</h3>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <p className="text-gray-700 mb-4">
                Если у вас есть вопросы или претензии, свяжитесь с нами:
              </p>
              <div className="space-y-3 text-gray-700">
                <div>
                  <p className="font-semibold text-gray-900">Email:</p>
                  <a href="mailto:support@wb-automation.ru" className="text-purple-600 hover:underline">
                    support@wb-automation.ru
                  </a>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Форма обратной связи:</p>
                  <Link href="/contact" className="text-purple-600 hover:underline">
                    Перейти к форме
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Acceptance */}
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-8">
            <div className="flex gap-4">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-green-900 mb-2">Принятие условий</h4>
                <p className="text-green-800 text-sm">
                  Используя Сайт, вы подтверждаете, что прочитали, поняли и согласны со всеми условиями настоящего 
                  Пользовательского соглашения.
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
