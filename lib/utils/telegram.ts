import crypto from 'crypto'

export interface TelegramUser {
	id: number
	first_name?: string
	last_name?: string
	username?: string
	photo_url?: string
	language_code?: string
}

export interface TelegramAuthResult {
	valid: boolean
	data?: Record<string, string>
	user?: TelegramUser
	error?: string
}

function getHmacSha256(key: Buffer, data: string): Buffer {
	return crypto.createHmac('sha256', key).update(data).digest()
}

/**
 * Verify Telegram initData per official docs
 */
export function verifyTelegramInitData(initData: string, botToken: string): TelegramAuthResult {
	try {
		if (!botToken) {
			return { valid: false, error: 'Missing TELEGRAM_BOT_TOKEN' }
		}

		const params = new URLSearchParams(initData)
		const hash = params.get('hash') || ''
		params.delete('hash')

		// Build data-check-string
		const entries: string[] = []
		Array.from(params.keys()).sort().forEach((key) => {
			const value = params.get(key) ?? ''
			entries.push(`${key}=${value}`)
		})
		const dataCheckString = entries.join('\n')

		// secret key is SHA256 of bot token
		const secret = crypto.createHash('sha256').update(botToken).digest()
		const computedHash = getHmacSha256(secret, dataCheckString).toString('hex')

		if (computedHash !== hash) {
			return { valid: false, error: 'Invalid hash' }
		}

		let user: TelegramUser | undefined
		const userParam = params.get('user')
		if (userParam) {
			try {
				user = JSON.parse(userParam)
			} catch {}
		}

		const data: Record<string, string> = {}
		params.forEach((v, k) => { data[k] = v })

		return { valid: true, data, user }
	} catch (e: any) {
		return { valid: false, error: e?.message || 'Verification failed' }
	}
}


