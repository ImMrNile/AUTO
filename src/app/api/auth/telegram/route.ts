import { NextRequest, NextResponse } from 'next/server'
import { verifyTelegramInitData } from '../../../../../lib/utils/telegram'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()
		const initData: string = body.initData
		if (!initData) {
			return NextResponse.json({ error: 'initData is required' }, { status: 400 })
		}

		const botToken = process.env.TELEGRAM_BOT_TOKEN || ''
		const verification = verifyTelegramInitData(initData, botToken)
		if (!verification.valid || !verification.user) {
			return NextResponse.json({ error: verification.error || 'Verification failed' }, { status: 401 })
		}

		const tg = verification.user
		const email = tg.username ? `${tg.username}@telegram.local` : `tg${tg.id}@telegram.local`
		const supabaseId = `telegram:${tg.id}`

		// Upsert user by supabaseId
		let user = await prisma.user.findUnique({ where: { supabaseId } })
		if (!user) {
			user = await prisma.user.create({
				data: {
					supabaseId,
					email,
					name: [tg.first_name, tg.last_name].filter(Boolean).join(' ') || tg.username || `tg-${tg.id}`,
					avatarUrl: tg.photo_url || undefined,
					role: 'USER',
					isActive: true,
					lastLoginAt: new Date(),
				}
			})
		} else {
			await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
		}

		// Create session token
		const token = Array.from(crypto.getRandomValues(new Uint8Array(48))).map(b => ('0' + b.toString(16)).slice(-2)).join('')
		const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
		await prisma.session.create({ data: { userId: user.id, token, expiresAt } })

		const response = NextResponse.json({ success: true })
		response.cookies.set('session_token', token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			maxAge: 30 * 24 * 60 * 60,
			path: '/',
		})
		return response
	} catch (e: any) {
		return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
	}
}


