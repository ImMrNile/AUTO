'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function TelegramMiniAppPage() {
	const [error, setError] = useState<string | null>(null)
	const [status, setStatus] = useState<string>('Инициализация...')
	const router = useRouter()

	useEffect(() => {
		async function run() {
			try {
				// @ts-ignore
				const tg = window?.Telegram?.WebApp
				if (!tg?.initData) {
					setError('Откройте Mini App внутри Telegram')
					return
				}

				// Шаг 1: Авторизация
				setStatus('Авторизация через Telegram...')
				console.log('🔐 Авторизация через Telegram Mini App...')
				
				const authRes = await fetch('/api/auth/telegram', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ initData: tg.initData })
				})
				
				if (!authRes.ok) {
					const d = await authRes.json().catch(() => ({}))
					throw new Error(d.error || 'Ошибка авторизации')
				}
				
				const authData = await authRes.json()
				console.log('✅ Авторизация успешна:', authData)

				// Шаг 2: Проверка кабинетов
				setStatus('Проверка кабинетов...')
				console.log('📦 Проверяем наличие кабинетов...')
				
				const cabinetsRes = await fetch('/api/user/cabinets', {
					cache: 'no-store'
				})
				
				if (!cabinetsRes.ok) {
					throw new Error('Ошибка загрузки кабинетов')
				}
				
				const cabinetsData = await cabinetsRes.json()
				const cabinets = cabinetsData.data?.cabinets || cabinetsData.cabinets || []
				console.log('✅ Кабинеты загружены:', cabinets.length)

				// Шаг 3: Перенаправление
				if (cabinets.length === 0) {
					console.log('⚠️ Кабинетов нет, редирект на /onboarding')
					setStatus('Перенаправление на добавление кабинета...')
					setTimeout(() => router.push('/onboarding'), 500)
				} else {
					console.log('✅ Кабинеты есть, редирект на главную')
					setStatus('Перенаправление на главную...')
					setTimeout(() => router.push('/'), 500)
				}
			} catch (e: any) {
				console.error('❌ Ошибка:', e)
				setError(e?.message || 'Ошибка авторизации')
			}
		}
		run()
	}, [router])

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-6">
			<div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
				<h2 className="text-2xl font-bold text-gray-800 mb-4">
					WB Automation
				</h2>
				
				{error ? (
					<div className="text-red-600 bg-red-50 rounded-lg p-4">
						<p className="font-semibold mb-2">Ошибка</p>
						<p className="text-sm">{error}</p>
					</div>
				) : (
					<div className="flex flex-col items-center gap-4">
						<Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
						<p className="text-gray-600">{status}</p>
					</div>
				)}
			</div>
		</div>
	)
}


