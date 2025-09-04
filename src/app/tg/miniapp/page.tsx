'use client'

import { useEffect, useState } from 'react'

export default function TelegramMiniAppPage() {
	const [error, setError] = useState<string | null>(null)
	const [ok, setOk] = useState(false)

	useEffect(() => {
		async function run() {
			try {
				// @ts-ignore
				const tg = window?.Telegram?.WebApp
				if (!tg?.initData) {
					setError('Откройте Mini App внутри Telegram')
					return
				}
				const res = await fetch('/api/auth/telegram', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ initData: tg.initData })
				})
				if (!res.ok) {
					const d = await res.json().catch(() => ({}))
					throw new Error(d.error || 'Auth failed')
				}
				setOk(true)
				// @ts-ignore
				tg.close()
			} catch (e: any) {
				setError(e?.message || 'Ошибка авторизации')
			}
		}
		run()
	}, [])

	return (
		<div style={{ padding: 24 }}>
			<h2>Telegram Mini App</h2>
			{ok && <p>Успешная авторизация. Можно закрыть окно.</p>}
			{error && <p style={{ color: 'red' }}>{error}</p>}
		</div>
	)
}


