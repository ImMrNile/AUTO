'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface AuthUser {
  id: string
  email: string
  name?: string
  avatarUrl?: string
  role: string
  isActive: boolean
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  authError: string | null
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authError: null,
  refreshUser: async () => {}
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  const refreshUser = async () => {
    try {
      console.log('🔍 [AuthProvider] Обновляем пользователя...');
      setLoading(true);
      setAuthError(null);
      
      const response = await fetch('/api/auth/session');
      
      console.log('🔍 [AuthProvider] Ответ от /api/auth/session:', { status: response.status, ok: response.ok });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 [AuthProvider] Данные сессии:', { success: data.success, user: data.user?.email });
        
        if (data.success && data.user) {
          console.log('✅ [AuthProvider] Пользователь найден:', data.user.email);
          setUser(data.user);
          setAuthError(null);
        } else {
          console.log('🔍 [AuthProvider] Пользователь не найден или сессия неактивна');
          setUser(null);
          setAuthError(data.message || 'Сессия не найдена');
        }
      } else {
        console.log('🔍 [AuthProvider] Ошибка ответа от /api/auth/session');
        setUser(null);
        setAuthError(`Ошибка аутентификации: HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ [AuthProvider] Ошибка при обновлении пользователя:', error);
      setUser(null);
      setAuthError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      console.log('🔍 [AuthProvider] Завершено обновление пользователя');
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, authError, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}