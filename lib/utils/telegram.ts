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
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyTelegramInitData(initData: string, botToken: string): TelegramAuthResult {
	try {
		console.log('🔍 [Telegram Verify] Starting verification...')
		
		if (!botToken) {
			console.error('❌ [Telegram Verify] Missing TELEGRAM_BOT_TOKEN')
			return { valid: false, error: 'Missing TELEGRAM_BOT_TOKEN' }
		}

		const params = new URLSearchParams(initData)
		const hash = params.get('hash') || ''
		console.log('🔍 [Telegram Verify] Received hash:', hash.substring(0, 20) + '...')
		
		if (!hash) {
			console.error('❌ [Telegram Verify] Missing hash in initData')
			return { valid: false, error: 'Missing hash' }
		}
		
		params.delete('hash')

		// Build data-check-string according to Telegram docs
		// IMPORTANT: Must be sorted alphabetically and joined with \n
		const entries: string[] = []
		const sortedKeys = Array.from(params.keys()).sort()
		
		sortedKeys.forEach((key) => {
			const value = params.get(key) ?? ''
			entries.push(`${key}=${value}`)
		})
		const dataCheckString = entries.join('\n')
		
		console.log('🔍 [Telegram Verify] Data check string keys:', sortedKeys)
		console.log('🔍 [Telegram Verify] Data check string length:', dataCheckString.length)

		// Step 1: Create secret key using HMAC-SHA-256 with constant string "WebAppData"
		const secretKey = crypto
			.createHmac('sha256', 'WebAppData')
			.update(botToken)
			.digest()
		
		// Step 2: Create hash using the secret key
		const computedHash = crypto
			.createHmac('sha256', secretKey)
			.update(dataCheckString)
			.digest('hex')
		
		console.log('🔍 [Telegram Verify] Computed hash:', computedHash.substring(0, 20) + '...')
		console.log('🔍 [Telegram Verify] Hashes match:', computedHash === hash)

		if (computedHash !== hash) {
			console.error('❌ [Telegram Verify] Hash mismatch!')
			console.error('   Expected:', hash)
			console.error('   Computed:', computedHash)
			return { valid: false, error: 'Invalid hash' }
		}

		// Parse user data
		let user: TelegramUser | undefined
		const userParam = params.get('user')
		if (userParam) {
			try {
				user = JSON.parse(userParam)
				console.log('✅ [Telegram Verify] User parsed:', { id: user?.id, username: user?.username })
			} catch (e) {
				console.error('❌ [Telegram Verify] Failed to parse user:', e)
			}
		}

		const data: Record<string, string> = {}
		params.forEach((v, k) => { data[k] = v })

		return { valid: true, data, user }
	} catch (e: any) {
		console.error('❌ [Telegram Verify] Exception:', e)
		return { valid: false, error: e?.message || 'Verification failed' }
	}
}


