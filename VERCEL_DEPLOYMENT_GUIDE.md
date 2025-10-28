# 🚀 Деплой на Vercel Production

## 📋 Предварительные требования

1. **Аккаунт Vercel:** https://vercel.com
2. **GitHub репозиторий** с вашим кодом
3. **Supabase проект** (уже настроен)
4. **OpenAI API ключ** (для ИИ анализа)
5. **Wildberries API токены** (для каждого кабинета)

## 🔧 Шаг 1: Подготовка проекта

### 1.1 Создайте файл `.vercelignore`

```bash
# .vercelignore
node_modules
.next
.env.local
.env
*.log
.DS_Store
coverage
.vscode
.idea
```

### 1.2 Обновите `vercel.json`

Файл уже существует, но добавим дополнительные настройки:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-analytics",
      "schedule": "0 * * * *"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "build": {
    "env": {
      "NEXT_TELEMETRY_DISABLED": "1"
    }
  },
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 300
    }
  }
}
```

### 1.3 Проверьте `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'images.wbstatic.net',
      'basket-01.wbbasket.ru',
      'basket-02.wbbasket.ru',
      'basket-03.wbbasket.ru',
      'basket-04.wbbasket.ru',
      'basket-05.wbbasket.ru',
      'basket-06.wbbasket.ru',
      'basket-07.wbbasket.ru',
      'basket-08.wbbasket.ru',
      'basket-09.wbbasket.ru',
      'basket-10.wbbasket.ru',
      'basket-11.wbbasket.ru',
      'basket-12.wbbasket.ru',
      'basket-13.wbbasket.ru',
      'basket-14.wbbasket.ru',
      'basket-15.wbbasket.ru',
      'basket-16.wbbasket.ru',
      'basket-17.wbbasket.ru',
      'basket-18.wbbasket.ru',
      'basket-19.wbbasket.ru'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.wbstatic.net',
      },
      {
        protocol: 'https',
        hostname: '**.wbbasket.ru',
      }
    ]
  },
  // Для Vercel
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    }
  }
}

module.exports = nextConfig
```

## 🚀 Шаг 2: Деплой на Vercel

### 2.1 Через Vercel Dashboard (Рекомендуется)

1. **Войдите в Vercel:** https://vercel.com/login
2. **Нажмите "Add New Project"**
3. **Импортируйте GitHub репозиторий:**
   - Выберите ваш репозиторий
   - Нажмите "Import"

4. **Настройте проект:**
   - **Framework Preset:** Next.js
   - **Root Directory:** ./
   - **Build Command:** `npm run build` (или оставьте по умолчанию)
   - **Output Directory:** `.next` (по умолчанию)
   - **Install Command:** `npm install` (или оставьте по умолчанию)

5. **Добавьте Environment Variables** (см. Шаг 3)

6. **Нажмите "Deploy"**

### 2.2 Через Vercel CLI

```bash
# Установите Vercel CLI
npm i -g vercel

# Войдите в аккаунт
vercel login

# Деплой в production
vercel --prod
```

## 🔐 Шаг 3: Environment Variables

В Vercel Dashboard → Settings → Environment Variables добавьте:

### Database (Supabase)
```
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-eu-north-1.pooler.supabase.com:5432/postgres
```

### Supabase Auth
```
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### OpenAI API
```
OPENAI_API_KEY=sk-proj-...
```

### Application URLs
```
NEXT_PUBLIC_API_URL=https://your-app.vercel.app
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### Telegram Bot (для Mini App)
```
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_BOT_USERNAME=your_bot_username
```

### Redis (опционально, для кеширования)
```
REDIS_URL=redis://default:password@redis-host:6379
```

## 📱 Шаг 4: Настройка Telegram Mini App

### 4.1 Создайте Telegram бота

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot`
3. Введите имя бота (например: "WB Automation")
4. Введите username (например: "wb_automation_bot")
5. Сохраните токен бота

### 4.2 Настройте Mini App

1. В [@BotFather](https://t.me/BotFather) отправьте `/newapp`
2. Выберите вашего бота
3. Введите название приложения
4. Введите описание
5. Загрузите иконку (512x512 px)
6. Загрузите GIF/видео демо (опционально)
7. **Введите URL приложения:** `https://your-app.vercel.app`
8. Введите короткое имя (например: "wbautomation")

### 4.3 Настройте Web App URL

```bash
# В BotFather
/mybots
# Выберите вашего бота
# Bot Settings → Menu Button → Configure menu button
# Введите URL: https://your-app.vercel.app
```

## 🔑 Шаг 5: Реализация авторизации через QR-код

Создайте новые файлы для Telegram авторизации:

### 5.1 API Route для генерации QR-кода

Файл: `src/app/api/auth/telegram/qr/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Генерируем уникальный код для QR
    const qrCode = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 минут

    // Сохраняем в БД
    await prisma.telegramQRAuth.create({
      data: {
        qrCode,
        expiresAt,
        status: 'PENDING'
      }
    });

    // Возвращаем QR код и URL для сканирования
    const telegramUrl = `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=qr_${qrCode}`;

    return NextResponse.json({
      success: true,
      qrCode,
      telegramUrl,
      expiresAt
    });
  } catch (error) {
    console.error('Ошибка генерации QR кода:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка генерации QR кода'
    }, { status: 500 });
  }
}
```

### 5.2 API Route для проверки статуса QR-кода

Файл: `src/app/api/auth/telegram/qr/status/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const qrCode = searchParams.get('qrCode');

    if (!qrCode) {
      return NextResponse.json({
        success: false,
        error: 'QR код не указан'
      }, { status: 400 });
    }

    // Проверяем статус в БД
    const qrAuth = await prisma.telegramQRAuth.findUnique({
      where: { qrCode },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    if (!qrAuth) {
      return NextResponse.json({
        success: false,
        error: 'QR код не найден'
      }, { status: 404 });
    }

    // Проверяем срок действия
    if (new Date() > qrAuth.expiresAt) {
      return NextResponse.json({
        success: false,
        status: 'EXPIRED',
        error: 'QR код истек'
      });
    }

    return NextResponse.json({
      success: true,
      status: qrAuth.status,
      user: qrAuth.user,
      sessionToken: qrAuth.sessionToken
    });
  } catch (error) {
    console.error('Ошибка проверки QR кода:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка проверки QR кода'
    }, { status: 500 });
  }
}
```

### 5.3 Telegram Bot Handler

Файл: `src/app/api/telegram/webhook/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Проверяем, что это сообщение от Telegram
    const message = body.message;
    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text;
    const telegramUserId = message.from.id;
    const telegramUsername = message.from.username;

    // Обработка команды /start с QR кодом
    if (text && text.startsWith('/start qr_')) {
      const qrCode = text.replace('/start qr_', '');

      // Находим QR код в БД
      const qrAuth = await prisma.telegramQRAuth.findUnique({
        where: { qrCode }
      });

      if (!qrAuth) {
        await sendTelegramMessage(chatId, '❌ QR код не найден или истек');
        return NextResponse.json({ ok: true });
      }

      if (new Date() > qrAuth.expiresAt) {
        await sendTelegramMessage(chatId, '❌ QR код истек. Сгенерируйте новый.');
        return NextResponse.json({ ok: true });
      }

      if (qrAuth.status !== 'PENDING') {
        await sendTelegramMessage(chatId, '❌ QR код уже использован');
        return NextResponse.json({ ok: true });
      }

      // Проверяем, есть ли пользователь с этим Telegram ID
      let user = await prisma.user.findFirst({
        where: { telegramUserId: telegramUserId.toString() }
      });

      if (!user) {
        await sendTelegramMessage(
          chatId,
          '❌ Аккаунт не найден. Сначала зарегистрируйтесь на сайте и привяжите Telegram аккаунт.'
        );
        return NextResponse.json({ ok: true });
      }

      // Генерируем session token
      const sessionToken = crypto.randomBytes(32).toString('hex');

      // Обновляем QR код
      await prisma.telegramQRAuth.update({
        where: { qrCode },
        data: {
          status: 'CONFIRMED',
          userId: user.id,
          sessionToken,
          confirmedAt: new Date()
        }
      });

      // Создаем сессию
      await prisma.session.create({
        data: {
          userId: user.id,
          token: sessionToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 дней
        }
      });

      await sendTelegramMessage(
        chatId,
        '✅ Авторизация успешна! Теперь вы можете закрыть это окно и вернуться к приложению.'
      );

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Ошибка обработки Telegram webhook:', error);
    return NextResponse.json({ ok: true });
  }
}

async function sendTelegramMessage(chatId: number, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML'
    })
  });
}
```

### 5.4 Компонент QR-кода для фронтенда

Файл: `src/app/components/Auth/QRCodeLogin.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { QrCode, Loader2, CheckCircle, XCircle } from 'lucide-react';
import QRCodeLib from 'qrcode';

export default function QRCodeLogin({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [telegramUrl, setTelegramUrl] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'pending' | 'confirmed' | 'expired' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  // Генерация QR кода
  useEffect(() => {
    generateQRCode();
  }, []);

  // Polling для проверки статуса
  useEffect(() => {
    if (!qrCode || status !== 'pending') return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/auth/telegram/qr/status?qrCode=${qrCode}`);
        const data = await response.json();

        if (data.success) {
          if (data.status === 'CONFIRMED' && data.sessionToken) {
            setStatus('confirmed');
            clearInterval(interval);
            onSuccess(data.sessionToken);
          } else if (data.status === 'EXPIRED') {
            setStatus('expired');
            clearInterval(interval);
          }
        }
      } catch (error) {
        console.error('Ошибка проверки статуса:', error);
      }
    }, 2000); // Проверяем каждые 2 секунды

    return () => clearInterval(interval);
  }, [qrCode, status, onSuccess]);

  const generateQRCode = async () => {
    try {
      setStatus('loading');
      setError(null);

      const response = await fetch('/api/auth/telegram/qr', {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setQrCode(data.qrCode);
        setTelegramUrl(data.telegramUrl);

        // Генерируем QR код изображение
        const qrDataUrl = await QRCodeLib.toDataURL(data.telegramUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        setQrCodeUrl(qrDataUrl);
        setStatus('pending');
      } else {
        setStatus('error');
        setError(data.error || 'Ошибка генерации QR кода');
      }
    } catch (error) {
      console.error('Ошибка генерации QR кода:', error);
      setStatus('error');
      setError('Ошибка генерации QR кода');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Вход через Telegram
      </h2>

      {status === 'loading' && (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
          <p className="text-gray-600">Генерация QR кода...</p>
        </div>
      )}

      {status === 'pending' && qrCodeUrl && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-white rounded-lg border-2 border-purple-200">
            <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
          </div>
          <div className="text-center">
            <p className="text-gray-700 font-medium mb-2">
              Отсканируйте QR-код в Telegram
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Откройте камеру в Telegram и наведите на QR-код
            </p>
            {telegramUrl && (
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <QrCode className="w-5 h-5" />
                Открыть в Telegram
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Ожидание подтверждения...
          </div>
        </div>
      )}

      {status === 'confirmed' && (
        <div className="flex flex-col items-center gap-4">
          <CheckCircle className="w-16 h-16 text-green-500" />
          <p className="text-lg font-medium text-gray-900">
            ✅ Авторизация успешна!
          </p>
          <p className="text-sm text-gray-600">
            Перенаправление...
          </p>
        </div>
      )}

      {status === 'expired' && (
        <div className="flex flex-col items-center gap-4">
          <XCircle className="w-16 h-16 text-orange-500" />
          <p className="text-lg font-medium text-gray-900">
            QR код истек
          </p>
          <button
            onClick={generateQRCode}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Сгенерировать новый
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center gap-4">
          <XCircle className="w-16 h-16 text-red-500" />
          <p className="text-lg font-medium text-gray-900">
            Ошибка
          </p>
          <p className="text-sm text-gray-600">{error}</p>
          <button
            onClick={generateQRCode}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      )}
    </div>
  );
}
```

## 📊 Шаг 6: Добавьте таблицу в Prisma Schema

Файл: `prisma/schema.prisma`

Добавьте новую модель:

```prisma
model TelegramQRAuth {
  id            String   @id @default(cuid())
  qrCode        String   @unique
  status        String   @default("PENDING") // PENDING, CONFIRMED, EXPIRED
  expiresAt     DateTime
  userId        String?
  user          User?    @relation(fields: [userId], references: [id])
  sessionToken  String?
  confirmedAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([qrCode])
  @@index([userId])
}
```

Затем выполните:

```bash
npx prisma db push
npx prisma generate
```

## 🔄 Шаг 7: Настройте Telegram Webhook

После деплоя на Vercel, настройте webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-app.vercel.app/api/telegram/webhook"}'
```

Или через браузер:
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-app.vercel.app/api/telegram/webhook
```

## 📱 Шаг 8: Адаптация UI для Telegram Mini App

Создайте отдельный layout для Telegram:

Файл: `src/app/telegram/layout.tsx`

```typescript
import { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'WB Automation - Telegram Mini App',
  description: 'Автоматизация работы с Wildberries'
};

export default function TelegramLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        {/* Telegram Web App SDK */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="telegram-mini-app">
        {children}
      </body>
    </html>
  );
}
```

## ✅ Шаг 9: Проверка деплоя

После деплоя проверьте:

1. **Основной сайт:** `https://your-app.vercel.app`
2. **API Health:** `https://your-app.vercel.app/api/health`
3. **Telegram Bot:** Отправьте `/start` боту
4. **Mini App:** Откройте через меню бота

## 🐛 Troubleshooting

### Ошибка: "Module not found"
```bash
# Очистите кеш и пересоберите
rm -rf .next node_modules
npm install
npm run build
```

### Ошибка: "Database connection failed"
- Проверьте `DATABASE_URL` в Vercel Environment Variables
- Убедитесь что используете connection pooling URL от Supabase

### Ошибка: "Prisma Client not generated"
Добавьте в `package.json`:
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

### Telegram Webhook не работает
```bash
# Проверьте статус webhook
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"

# Удалите webhook
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook"

# Установите заново
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -d "url=https://your-app.vercel.app/api/telegram/webhook"
```

## 📚 Дополнительные ресурсы

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)
- [Supabase with Vercel](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)

## 🎉 Готово!

Теперь ваше приложение:
- ✅ Задеплоено на Vercel Production
- ✅ Доступно через Telegram Mini App
- ✅ Поддерживает авторизацию через QR-код
- ✅ Синхронизируется между ПК и мобильным
