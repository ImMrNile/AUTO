// src/app/api/telegram/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Webhook для получения сообщений от Telegram бота
 * Обрабатывает команду /start с параметром session ID
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📱 [Telegram Webhook] Получено сообщение:', JSON.stringify(body, null, 2));

    // Обрабатываем callback от inline кнопок
    if (body.callback_query) {
      return await handleCallbackQuery(body.callback_query);
    }

    // Проверяем, что это сообщение от бота
    if (!body.message) {
      console.log('⚠️ [Telegram Webhook] Не сообщение, игнорируем');
      return NextResponse.json({ ok: true });
    }

    const message = body.message;
    const chatId = message.chat.id;
    const text = message.text || '';
    const from = message.from;

    console.log(`📱 [Telegram Webhook] Сообщение от ${from.username || from.first_name} (${from.id}): ${text}`);

    // Обрабатываем команду /start без параметров (приветствие)
    if (text === '/start') {
      console.log('👋 [Telegram Webhook] Команда /start без параметров - отправляем приветствие');
      
      await sendTelegramMessage(
        chatId,
        `👋 Привет, ${from.first_name}!\n\n` +
        `Я бот WB Automation - помогаю автоматизировать работу с Wildberries.\n\n` +
        `🔐 Для авторизации:\n` +
        `1. Откройте сайт WB Automation\n` +
        `2. Нажмите "Войти через Telegram"\n` +
        `3. Отсканируйте QR-код или перейдите по ссылке\n\n` +
        `📱 Или используйте меню бота для быстрого доступа к приложению!`
      );
      
      return NextResponse.json({ ok: true });
    }

    // Проверяем, что это команда /start с параметром
    if (!text.startsWith('/start ')) {
      console.log('⚠️ [Telegram Webhook] Не команда /start с параметром, игнорируем');
      return NextResponse.json({ ok: true });
    }

    // Извлекаем session ID из команды
    const sessionId = text.replace('/start ', '').trim();
    
    if (!sessionId || sessionId.length < 10) {
      console.log('❌ [Telegram Webhook] Неверный session ID:', sessionId);
      
      // Отправляем сообщение пользователю
      await sendTelegramMessage(chatId, '❌ Неверная ссылка для авторизации. Пожалуйста, отсканируйте QR-код заново.');
      
      return NextResponse.json({ ok: true });
    }

    console.log(`🔍 [Telegram Webhook] Session ID: ${sessionId}`);

    // Ищем сессию в БД
    let telegramSession = await prisma.telegramSession.findUnique({
      where: { sessionId }
    });

    if (!telegramSession) {
      console.log('❌ [Telegram Webhook] Сессия не найдена:', sessionId);
      
      await sendTelegramMessage(chatId, '❌ Сессия не найдена или истекла. Пожалуйста, обновите QR-код и попробуйте снова.');
      
      return NextResponse.json({ ok: true });
    }

    // Проверяем, не истекла ли сессия (5 минут)
    const now = new Date();
    const expiresAt = new Date(telegramSession.expiresAt);
    
    if (now > expiresAt) {
      console.log('❌ [Telegram Webhook] Сессия истекла:', sessionId);
      
      await sendTelegramMessage(chatId, '❌ Сессия истекла. Пожалуйста, обновите QR-код и попробуйте снова.');
      
      return NextResponse.json({ ok: true });
    }

    // Проверяем, не использована ли уже сессия
    if (telegramSession.authenticated) {
      console.log('⚠️ [Telegram Webhook] Сессия уже использована:', sessionId);
      
      await sendTelegramMessage(chatId, '✅ Вы уже авторизованы!');
      
      return NextResponse.json({ ok: true });
    }

    console.log(`✅ [Telegram Webhook] Сессия найдена и валидна`);

    // Отправляем сообщение с кнопками подтверждения
    await sendTelegramMessageWithButtons(
      chatId,
      `🔐 <b>Запрос на авторизацию</b>\n\n` +
      `Вы хотите авторизоваться в WB Automation?\n\n` +
      `👤 Имя: ${from.first_name}${from.last_name ? ' ' + from.last_name : ''}\n` +
      `${from.username ? `📱 Username: @${from.username}\n` : ''}` +
      `\n⚠️ Нажмите "Авторизоваться" для подтверждения или "Отменить" для отказа.`,
      [
        [
          { text: '✅ Авторизоваться', callback_data: `auth_confirm:${sessionId}` },
          { text: '❌ Отменить', callback_data: `auth_cancel:${sessionId}` }
        ]
      ]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('❌ [Telegram Webhook] Ошибка:', error);
    return NextResponse.json({ ok: true }); // Всегда возвращаем ok для Telegram
  }
}

/**
 * Обработка callback от inline кнопок
 */
async function handleCallbackQuery(callbackQuery: any) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const from = callbackQuery.from;
  const data = callbackQuery.data;

  console.log(`🔘 [Telegram Callback] Получен callback от ${from.username || from.first_name}: ${data}`);

  // Отвечаем на callback (убирает "часики" на кнопке)
  await answerCallbackQuery(callbackQuery.id);

  // Парсим callback data
  const [action, sessionId] = data.split(':');

  if (action === 'auth_cancel') {
    console.log(`❌ [Telegram Callback] Пользователь отменил авторизацию`);
    
    // Удаляем кнопки и обновляем сообщение
    await editTelegramMessage(
      chatId,
      messageId,
      `❌ <b>Авторизация отменена</b>\n\n` +
      `Вы отменили авторизацию в WB Automation.\n\n` +
      `Если хотите авторизоваться позже, отсканируйте QR-код заново.`
    );
    
    return NextResponse.json({ ok: true });
  }

  if (action === 'auth_confirm') {
    console.log(`✅ [Telegram Callback] Пользователь подтвердил авторизацию`);
    
    // Обновляем сообщение - показываем процесс
    await editTelegramMessage(
      chatId,
      messageId,
      `⏳ <b>Авторизация...</b>\n\nПожалуйста, подождите...`
    );

    // Ищем сессию
    const telegramSession = await prisma.telegramSession.findUnique({
      where: { sessionId }
    });

    if (!telegramSession) {
      await editTelegramMessage(
        chatId,
        messageId,
        `❌ <b>Ошибка</b>\n\nСессия не найдена или истекла.`
      );
      return NextResponse.json({ ok: true });
    }

    // Проверяем срок действия
    const now = new Date();
    const expiresAt = new Date(telegramSession.expiresAt);
    
    if (now > expiresAt) {
      await editTelegramMessage(
        chatId,
        messageId,
        `❌ <b>Ошибка</b>\n\nСессия истекла. Пожалуйста, обновите QR-код.`
      );
      return NextResponse.json({ ok: true });
    }

    // Ищем или создаем пользователя
    const telegramId = from.id.toString();
    
    // Логируем данные от Telegram
    console.log(`📋 [Telegram Webhook] Данные пользователя:`, {
      id: from.id,
      username: from.username,
      first_name: from.first_name,
      last_name: from.last_name
    });
    
    const email = from.username 
      ? `${from.username}@telegram.local` 
      : `tg${telegramId}@telegram.local`;
    const name = [from.first_name, from.last_name]
      .filter(Boolean)
      .join(' ') || from.username || `tg-${telegramId}`;

    console.log(`📧 [Telegram Webhook] Email: ${email}, Name: ${name}`);

    // ВАЖНО: Ищем пользователя ТОЛЬКО по Telegram ID, а не по email
    // Это гарантирует, что при смене username пользователь не создастся заново
    let user = await prisma.user.findFirst({
      where: {
        telegramId
      }
    });

    if (!user) {
      console.log(`👤 [Telegram Webhook] Создаем нового пользователя: ${name}`);
      
      const supabaseId = `telegram:${telegramId}`;
      user = await prisma.user.create({
        data: {
          email,
          name,
          supabaseId,
          role: 'USER',
          isActive: true,
          lastLoginAt: new Date(),
          telegramId,
          telegramUsername: from.username,
          telegramPhotoUrl: undefined, // Можно получить через getFile API
          telegramAuthDate: new Date()
        }
      });
      
      console.log(`✅ [Telegram Webhook] Пользователь создан:`, {
        id: user.id,
        email: user.email,
        name: user.name,
        telegramUsername: user.telegramUsername
      });
    } else {
      console.log(`👤 [Telegram Webhook] Обновляем существующего пользователя: ${name}`);
      
      // Проверяем, изменился ли username
      const usernameChanged = user.telegramUsername !== from.username;
      const emailChanged = user.email !== email;
      
      if (usernameChanged || emailChanged) {
        console.log(`🔄 [Telegram Webhook] Username изменился: ${user.telegramUsername} → ${from.username}`);
        console.log(`🔄 [Telegram Webhook] Email обновляется: ${user.email} → ${email}`);
      }
      
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          email, // Обновляем email при смене username
          name, // Обновляем имя при смене first_name/last_name
          lastLoginAt: new Date(),
          telegramId,
          telegramUsername: from.username,
          telegramAuthDate: new Date()
        }
      });
      
      console.log(`✅ [Telegram Webhook] Пользователь обновлен:`, {
        id: user.id,
        email: user.email,
        name: user.name,
        telegramUsername: user.telegramUsername
      });
    }

    // Создаем сессию в БД
    const token = crypto.randomBytes(32).toString('hex');
    const sessionExpiresAt = new Date();
    sessionExpiresAt.setDate(sessionExpiresAt.getDate() + 30); // 30 дней

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: sessionExpiresAt
      }
    });

    console.log(`✅ [Telegram Webhook] Создана сессия для пользователя ${user.id}`);

    // Обновляем Telegram сессию
    await prisma.telegramSession.update({
      where: { sessionId },
      data: {
        authenticated: true,
        userId: user.id,
        token
      }
    });

    console.log(`✅ [Telegram Webhook] Telegram сессия обновлена`);

    // Обновляем сообщение с результатом
    await editTelegramMessage(
      chatId,
      messageId,
      `✅ <b>Авторизация успешна!</b>\n\n` +
      `Привет, ${name}! Вы успешно авторизовались в WB Automation.\n\n` +
      `Теперь вы можете закрыть это окно и вернуться к сайту.`
    );

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Отправка сообщения через Telegram Bot API
 */
async function sendTelegramMessage(chatId: number, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.error('❌ [Telegram] TELEGRAM_BOT_TOKEN не установлен');
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
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

    const data = await response.json();
    
    if (!data.ok) {
      console.error('❌ [Telegram] Ошибка отправки сообщения:', data);
    } else {
      console.log('✅ [Telegram] Сообщение отправлено');
    }
  } catch (error) {
    console.error('❌ [Telegram] Ошибка при отправке сообщения:', error);
  }
}

/**
 * Отправка сообщения с inline кнопками
 */
async function sendTelegramMessageWithButtons(
  chatId: number,
  text: string,
  buttons: Array<Array<{ text: string; callback_data: string }>>
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.error('❌ [Telegram] TELEGRAM_BOT_TOKEN не установлен');
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: buttons
        }
      })
    });

    const data = await response.json();
    
    if (!data.ok) {
      console.error('❌ [Telegram] Ошибка отправки сообщения с кнопками:', data);
    } else {
      console.log('✅ [Telegram] Сообщение с кнопками отправлено');
    }
  } catch (error) {
    console.error('❌ [Telegram] Ошибка при отправке сообщения с кнопками:', error);
  }
}

/**
 * Редактирование существующего сообщения
 */
async function editTelegramMessage(chatId: number, messageId: number, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.error('❌ [Telegram] TELEGRAM_BOT_TOKEN не установлен');
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML'
      })
    });

    const data = await response.json();
    
    if (!data.ok) {
      console.error('❌ [Telegram] Ошибка редактирования сообщения:', data);
    } else {
      console.log('✅ [Telegram] Сообщение отредактировано');
    }
  } catch (error) {
    console.error('❌ [Telegram] Ошибка при редактировании сообщения:', error);
  }
}

/**
 * Ответ на callback query (убирает "часики" на кнопке)
 */
async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.error('❌ [Telegram] TELEGRAM_BOT_TOKEN не установлен');
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || ''
      })
    });

    const data = await response.json();
    
    if (!data.ok) {
      console.error('❌ [Telegram] Ошибка ответа на callback:', data);
    } else {
      console.log('✅ [Telegram] Ответ на callback отправлен');
    }
  } catch (error) {
    console.error('❌ [Telegram] Ошибка при ответе на callback:', error);
  }
}
