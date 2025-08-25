// lib/security/security-utils.ts - Утилиты безопасности

export interface SimpleUser {
	id: string
	role: string
}

export function isValidUUID(uuid: string): boolean {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
	return uuidRegex.test(uuid)
}

export function isValidId(id: string | number): boolean {
	if (typeof id === 'number') return Number.isInteger(id) && id > 0
	if (typeof id === 'string') {
		if (isValidUUID(id)) return true
		const n = parseInt(id, 10)
		return !Number.isNaN(n) && n > 0
	}
	return false
}

export function sanitizeString(input: string): string {
	return input
		.replace(/[<>]/g, '')
		.replace(/javascript:/gi, '')
		.replace(/on\w+=/gi, '')
		.trim()
}

export function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isStrongPassword(password: string): boolean {
	const min = 8
	return (
		password.length >= min && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password)
	)
}

export function generateSecureToken(bytes = 32): string {
	const arr = new Uint8Array(bytes)
	crypto.getRandomValues(arr)
	return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}
