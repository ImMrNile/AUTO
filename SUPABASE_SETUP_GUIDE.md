# 🔧 Supabase Setup Guide - Настройка Supabase

## ⚠️ ВАЖНО: Настройка Redirect URLs

### Проблема
По умолчанию Supabase отправляет ссылки подтверждения на `http://localhost:3000/auth/callback`, что не работает в production.

### Решение

---

## 📋 Шаг 1: Настройка Redirect URLs

### 1.1 Откройте Supabase Dashboard
1. Перейдите на https://supabase.com/dashboard
2. Выберите ваш проект
3. Перейдите в **Authentication** → **URL Configuration**

### 1.2 Добавьте Redirect URLs

В поле **Redirect URLs** добавьте:

```
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
https://yourdomain.com/auth/callback
https://www.yourdomain.com/auth/callback
```

**Замените `yourdomain.com` на ваш реальный домен!**

### 1.3 Настройте Site URL

В поле **Site URL** укажите:

**Для разработки:**
```
http://localhost:3000
```

**Для production:**
```
https://yourdomain.com
```

---

## 📧 Шаг 2: Настройка Email Templates

### 2.1 Откройте Email Templates
1. В Supabase Dashboard перейдите в **Authentication** → **Email Templates**
2. Выберите **Confirm signup**

### 2.2 Русифицируйте шаблон

**Тема письма:**
```
Подтвердите вашу регистрацию в WB Automation
```

**Тело письма (HTML):**
```html
<h2>Подтвердите вашу регистрацию</h2>

<p>Здравствуйте!</p>

<p>Спасибо за регистрацию в <strong>WB Automation</strong>!</p>

<p>Для завершения регистрации подтвердите ваш email адрес, нажав на кнопку ниже:</p>

<p>
  <a 
    href="{{ .ConfirmationURL }}" 
    style="
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(to right, #2563eb, #9333ea);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
    "
  >
    Подтвердить email
  </a>
</p>

<p>Или скопируйте и вставьте эту ссылку в браузер:</p>
<p>{{ .ConfirmationURL }}</p>

<p><strong>Важно:</strong> Эта ссылка действительна в течение 24 часов.</p>

<p>Если вы не регистрировались в WB Automation, просто проигнорируйте это письмо.</p>

<hr>

<p style="color: #666; font-size: 12px;">
  WB Automation - Автоматизация работы с Wildberries<br>
  Это автоматическое письмо, пожалуйста, не отвечайте на него.
</p>
```

### 2.3 Настройте другие шаблоны

**Magic Link (если используете):**
```
Тема: Вход в WB Automation
```

**Reset Password:**
```
Тема: Сброс пароля в WB Automation
```

---

## 🔐 Шаг 3: Настройка SMTP (Опционально)

### Зачем нужен свой SMTP?
- ✅ Больше контроля над письмами
- ✅ Лучшая доставляемость
- ✅ Брендированные письма
- ✅ Статистика отправок

### Рекомендуемые провайдеры:
1. **SendGrid** - 100 писем/день бесплатно
2. **Mailgun** - 5000 писем/месяц бесплатно
3. **AWS SES** - Очень дешево
4. **Resend** - Современный API

### Настройка SMTP в Supabase:

1. Перейдите в **Project Settings** → **Auth**
2. Прокрутите до **SMTP Settings**
3. Включите **Enable Custom SMTP**
4. Заполните данные:

```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Password: YOUR_SENDGRID_API_KEY
Sender Email: noreply@yourdomain.com
Sender Name: WB Automation
```

---

## 🌐 Шаг 4: Настройка для Production

### 4.1 Environment Variables

Создайте `.env.production`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Site URL (для правильных редиректов)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### 4.2 Обновите emailRedirectTo

В коде регистрации (`register/page.tsx`):

```typescript
const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { name },
    emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`,
  },
});
```

---

## 🧪 Тестирование

### Локальная разработка:

1. **Проверьте redirect URL:**
   ```
   http://localhost:3000/auth/callback
   ```

2. **Зарегистрируйтесь** с тестовым email
3. **Откройте письмо** и проверьте ссылку
4. **Ссылка должна вести на:**
   ```
   http://localhost:3000/auth/callback?code=...
   ```

### Production:

1. **Проверьте redirect URL:**
   ```
   https://yourdomain.com/auth/callback
   ```

2. **Зарегистрируйтесь** с реальным email
3. **Откройте письмо** и проверьте ссылку
4. **Ссылка должна вести на:**
   ```
   https://yourdomain.com/auth/callback?code=...
   ```

---

## 🐛 Troubleshooting

### Проблема 1: Ссылка ведет на localhost в production

**Причина:** Не настроен Site URL в Supabase

**Решение:**
1. Откройте Supabase Dashboard
2. Authentication → URL Configuration
3. Установите Site URL: `https://yourdomain.com`

---

### Проблема 2: "Invalid redirect URL"

**Причина:** URL не добавлен в список разрешенных

**Решение:**
1. Откройте Supabase Dashboard
2. Authentication → URL Configuration
3. Добавьте URL в **Redirect URLs**

---

### Проблема 3: Письма не приходят

**Причина:** Попали в спам или проблемы с SMTP

**Решение:**
1. Проверьте папку спам
2. Настройте свой SMTP (SendGrid, Mailgun)
3. Добавьте SPF и DKIM записи

---

### Проблема 4: "Email link is invalid or has expired"

**Причина:** Ссылка истекла (24 часа) или уже использована

**Решение:**
1. Зарегистрируйтесь заново
2. Используйте ссылку в течение 24 часов
3. Ссылку можно использовать только один раз

---

## 📝 Чеклист настройки

### Обязательно:
- [ ] Добавлены Redirect URLs в Supabase
- [ ] Настроен Site URL
- [ ] Русифицированы email templates
- [ ] Протестирована регистрация локально

### Для production:
- [ ] Добавлен production redirect URL
- [ ] Настроен production Site URL
- [ ] Настроен SMTP (опционально)
- [ ] Добавлены environment variables
- [ ] Протестирована регистрация на production

---

## 🔗 Полезные ссылки

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Email Templates Guide](https://supabase.com/docs/guides/auth/auth-email-templates)
- [SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
- [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)

---

## 💡 Советы

### 1. Используйте разные проекты для dev и prod
```
Dev:  your-project-dev.supabase.co
Prod: your-project-prod.supabase.co
```

### 2. Настройте Rate Limiting
В Supabase Dashboard → Authentication → Rate Limits:
- Email signups: 10/hour
- Password resets: 5/hour

### 3. Включите Email Confirmation
В Supabase Dashboard → Authentication → Settings:
- ✅ Enable email confirmations

### 4. Настройте Session Duration
```
JWT expiry: 3600 seconds (1 hour)
Refresh token expiry: 2592000 seconds (30 days)
```

---

## 🎯 Итого

После настройки:
1. ✅ Письма приходят с правильными ссылками
2. ✅ Ссылки ведут на ваш домен (не localhost)
3. ✅ Письма на русском языке
4. ✅ Красивый дизайн писем
5. ✅ Работает и в dev, и в production

**Не забудьте протестировать полный flow регистрации! 🚀**
