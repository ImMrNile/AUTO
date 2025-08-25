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
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {}
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      console.log('🔍 [AuthProvider] Обновляем пользователя...');
      setLoading(true);
      const response = await fetch('/api/auth/session');
      
      console.log('🔍 [AuthProvider] Ответ от /api/auth/session:', { status: response.status, ok: response.ok });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 [AuthProvider] Данные сессии:', { success: data.success, user: data.user?.email });
        
        if (data.success && data.user) {
          console.log('✅ [AuthProvider] Пользователь найден:', data.user.email);
          setUser(data.user);
        } else {
          console.log('🔍 [AuthProvider] Пользователь не найден или сессия неактивна');
          setUser(null);
        }
      } else {
        console.log('🔍 [AuthProvider] Ошибка ответа от /api/auth/session');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ [AuthProvider] Ошибка при обновлении пользователя:', error);
      setUser(null);
    } finally {
      console.log('🔍 [AuthProvider] Завершено обновление пользователя');
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
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