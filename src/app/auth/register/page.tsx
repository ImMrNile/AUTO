'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from './../../../../lib/supabase/client'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw error

      setSuccess(true)
      
      // Логируем действие
      await fetch('/api/auth/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          email
        })
      })

    } catch (error: any) {
      setError(error.message || 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ width: '100%', maxWidth: 400, padding: 24, background: 'white', borderRadius: 12, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
              Регистрация успешна!
            </h2>
            <p style={{ color: '#64748b', marginBottom: 24 }}>
              Проверьте вашу почту для подтверждения аккаунта
            </p>
            <Link
              href="/auth/login"
              style={{
                display: 'inline-block',
                padding: '10px 24px',
                background: '#0f172a',
                color: 'white',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 500
              }}
            >
              Перейти к входу
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: 24, background: 'white', borderRadius: 12, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, textAlign: 'center' }}>
          Регистрация в WB Automation
        </h1>

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{ padding: 12, background: '#fee', color: '#c00', borderRadius: 8, fontSize: 14 }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
              Имя
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 14
              }}
              placeholder="Ваше имя"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 14
              }}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 14
              }}
              placeholder="Минимум 6 символов"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
              Подтвердите пароль
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 14
              }}
              placeholder="Повторите пароль"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 16px',
              background: loading ? '#94a3b8' : '#0f172a',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 14 }}>
          <span style={{ color: '#64748b' }}>Уже есть аккаунт? </span>
          <Link href="/auth/login" style={{ color: '#0ea5e9', textDecoration: 'none' }}>
            Войти
          </Link>
        </div>
      </div>
    </div>
  )
}