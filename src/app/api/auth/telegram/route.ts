import { NextRequest, NextResponse } from 'next/server'
import { verifyTelegramInitData } from '../../../../../lib/utils/telegram'
import { prisma } from '../../../../../lib/prisma'
import crypto from 'crypto'

// Проверка подписи Telegram Login Widget
function verifyTelegramAuth(data: any, botToken: string): boolean {
	const checkString = Object.keys(data)
		.filter(key => key !== 'hash')
		.sort()
		.map(key => `${key}=${data[key]}`)
		.join('\n');

	const secretKey = crypto
		.createHash('sha256')
		.update(botToken)
		.digest();

	const hash = crypto
		.createHmac('sha256', secretKey)
		.update(checkString)
		.digest('hex');

	return hash === data.hash;
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()
		const botToken = process.env.TELEGRAM_BOT_TOKEN || ''

		// Поддержка двух типов авторизации:
		// 1. Telegram Mini App (initData)
		// 2. Telegram Login Widget (id, first_name, hash, etc.)

		let tg: any;
		let telegramId: string;

		if (body.initData) {
			// Telegram Mini App
			const initData: string = body.initData
			const verification = verifyTelegramInitData(initData, botToken)
			if (!verification.valid || !verification.user) {
				return NextResponse.json({ error: verification.error || 'Verification failed' }, { status: 401 })
			}
			tg = verification.user
			telegramId = tg.id.toString()
		} else if (body.id && body.hash) {
			// Telegram Login Widget
			const isValid = verifyTelegramAuth(body, botToken)
			if (!isValid) {
				return NextResponse.json({ error: 'Invalid Telegram authentication' }, { status: 401 })
			}

			// Проверка срока действия (не более 24 часов)
			const authDate = parseInt(body.auth_date)
			const now = Math.floor(Date.now() / 1000)
			if (now - authDate > 86400) {
				return NextResponse.json({ error: 'Authentication expired' }, { status: 401 })
			}

			tg = body
			telegramId = body.id.toString()
		} else {
			return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
		}

		const email = tg.username ? `${tg.username}@telegram.local` : `tg${telegramId}@telegram.local`
		const supabaseId = `telegram:${telegramId}`
		const name = [tg.first_name, tg.last_name].filter(Boolean).join(' ') || tg.username || `tg-${telegramId}`

		// Ищем пользователя по telegramId (для синхронизации между устройствами)
		let user = await prisma.user.findUnique({ 
			where: { telegramId } 
		})

		if (!user) {
			// Если не найден по telegramId, ищем по supabaseId (старый метод)
			user = await prisma.user.findUnique({ where: { supabaseId } })
		}

		if (!user) {
			// Создаем нового пользователя
			user = await prisma.user.create({
				data: {
					supabaseId,
					email,
					name,
					avatarUrl: tg.photo_url || undefined,
					role: 'USER',
					isActive: true,
					lastLoginAt: new Date(),
					// Telegram OAuth данные
					telegramId,
					telegramUsername: tg.username,
					telegramPhotoUrl: tg.photo_url,
					telegramAuthDate: new Date()
				}
			})
		} else {
			// Обновляем существующего пользователя
			user = await prisma.user.update({ 
				where: { id: user.id }, 
				data: { 
					lastLoginAt: new Date(),
					// Обновляем Telegram данные
					telegramId,
					telegramUsername: tg.username,
					telegramPhotoUrl: tg.photo_url,
					telegramAuthDate: new Date()
				} 
			})
		}

		// Создаем сессию
		const token = Array.from(crypto.getRandomValues(new Uint8Array(48))).map(b => ('0' + b.toString(16)).slice(-2)).join('')
		const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
		await prisma.session.create({ data: { userId: user.id, token, expiresAt } })

		const response = NextResponse.json({ 
			success: true,
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				telegramId: user.telegramId,
				telegramUsername: user.telegramUsername,
				avatarUrl: user.telegramPhotoUrl || user.avatarUrl
			},
			sessionToken: token
		})
		
		response.cookies.set('session_token', token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			maxAge: 30 * 24 * 60 * 60,
			path: '/',
		})
		
		return response
	} catch (e: any) {
		console.error('Telegram auth error:', e)
		return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
	}
}


