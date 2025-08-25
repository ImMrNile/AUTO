// lib/auth/auth-service.ts - Реальная версия для Supabase PostgreSQL

import { prisma } from '../prisma'
import { cookies } from 'next/headers'

export interface AuthUser {
  id: string
  email: string
  name?: string
  avatarUrl?: string
  role: string
  isActive: boolean
}

export class AuthService {
  /**
   * Получить текущего пользователя из реальной базы данных
   */
  static async getCurrentUser(): Promise<AuthUser | null> {
    console.log('🔍 [AuthService] === НАЧАЛО getCurrentUser (Production) ===')
    
    try {
      const cookieStore = cookies()
      const token = cookieStore.get('session_token')?.value
      console.log('🔍 [AuthService] Session token:', token ? `${token.substring(0, 10)}...` : 'не найден')
      
      if (!token) {
        console.log('🔍 [AuthService] No session token found')
        return null
      }

      // Подключаемся к БД и ищем сессию
      console.log('🔍 [AuthService] Connecting to Supabase PostgreSQL...')
      
      // Обеспечиваем соединение с БД
      await prisma.$connect()
      
      const session = await prisma.session.findUnique({
        where: { token },
        include: { 
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
              role: true,
              isActive: true
            }
          }
        }
      })

      console.log('🔍 [AuthService] Session search result:', session ? {
        sessionId: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt,
        userEmail: session.user.email,
        userActive: session.user.isActive
      } : 'не найдена')

      if (!session) {
        console.log('🔍 [AuthService] Session not found in database')
        return null
      }

      // Проверяем срок действия сессии
      if (session.expiresAt < new Date()) {
        console.log('🔍 [AuthService] Session expired:', session.expiresAt)
        
        // Удаляем истекшую сессию
        await prisma.session.delete({ 
          where: { id: session.id } 
        })
        
        return null
      }

      // Проверяем активность пользователя
      if (!session.user.isActive) {
        console.log('🔍 [AuthService] User is not active')
        return null
      }

      console.log('✅ [AuthService] User authenticated successfully:', session.user.email)
      
      return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name || undefined,
        avatarUrl: session.user.avatarUrl || undefined,
        role: session.user.role,
        isActive: session.user.isActive
      }

    } catch (error) {
      console.error('❌ [AuthService] Database error:', error)
      
      // Определяем тип ошибки для лучшей диагностики
      if (error instanceof Error) {
        if (error.message.includes('P1001')) {
          console.error('🚨 [AuthService] Cannot reach database server')
        } else if (error.message.includes('P1017')) {
          console.error('🚨 [AuthService] Server rejected connection')
        } else if (error.message.includes('timeout')) {
          console.error('🚨 [AuthService] Database timeout')
        }
      }
      
      throw error // Пробрасываем ошибку выше для обработки
    } finally {
      await prisma.$disconnect()
    }
  }

  /**
   * Создание сессии для пользователя
   */
  static async createSession(userId: string, ipAddress?: string, userAgent?: string): Promise<string> {
    console.log('🔐 [AuthService] Creating session for user:', userId)
    
    try {
      await prisma.$connect()
      
      const token = this.generateToken()
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 дней

      await prisma.session.create({
        data: {
          userId,
          token,
          ipAddress,
          userAgent,
          expiresAt
        }
      })

      console.log('✅ [AuthService] Session created successfully:', token.substring(0, 10) + '...')
      return token
      
    } catch (error) {
      console.error('❌ [AuthService] Error creating session:', error)
      throw error
    } finally {
      await prisma.$disconnect()
    }
  }

  /**
   * Валидация сессии по токену
   */
  static async validateSession(token: string): Promise<AuthUser | null> {
    console.log('🔍 [AuthService] Validating session:', token.substring(0, 10) + '...')
    
    try {
      await prisma.$connect()
      
      const session = await prisma.session.findUnique({
        where: { token },
        include: { 
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
              role: true,
              isActive: true
            }
          }
        }
      })

      if (!session || session.expiresAt < new Date()) {
        if (session) {
          await prisma.session.delete({ where: { id: session.id } })
        }
        return null
      }

      if (!session.user.isActive) return null

      return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name || undefined,
        avatarUrl: session.user.avatarUrl || undefined,
        role: session.user.role,
        isActive: session.user.isActive
      }
      
    } catch (error) {
      console.error('❌ [AuthService] Error validating session:', error)
      throw error
    } finally {
      await prisma.$disconnect()
    }
  }

  /**
   * Удаление сессии (logout)
   */
  static async destroySession(token: string): Promise<void> {
    console.log('🔐 [AuthService] Destroying session:', token.substring(0, 10) + '...')
    
    try {
      await prisma.$connect()
      
      await prisma.session.delete({ where: { token } })
      console.log('✅ [AuthService] Session deleted successfully')
      
    } catch (error) {
      console.error('❌ [AuthService] Error destroying session:', error)
      throw error
    } finally {
      await prisma.$disconnect()
    }
  }

  /**
   * Удаление всех сессий пользователя
   */
  static async destroyUserSessions(userId: string): Promise<void> {
    console.log('🔐 [AuthService] Destroying all sessions for user:', userId)
    
    try {
      await prisma.$connect()
      
      const result = await prisma.session.deleteMany({ 
        where: { userId } 
      })
      
      console.log('✅ [AuthService] Deleted sessions count:', result.count)
      
    } catch (error) {
      console.error('❌ [AuthService] Error destroying user sessions:', error)
      throw error
    } finally {
      await prisma.$disconnect()
    }
  }

  /**
   * Проверка здоровья подключения к БД
   */
  static async checkDatabaseHealth(): Promise<{ 
    connected: boolean; 
    latency?: number; 
    error?: string 
  }> {
    const startTime = Date.now()
    
    try {
      await prisma.$queryRaw`SELECT 1 as health_check`
      
      const latency = Date.now() - startTime
      console.log('✅ [AuthService] Database health check passed, latency:', latency + 'ms')
      
      return { connected: true, latency }
      
    } catch (error) {
      console.error('❌ [AuthService] Database health check failed:', error)
      
      return { 
        connected: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Очистка истекших сессий
   */
  static async cleanupExpiredSessions(): Promise<number> {
    console.log('🧹 [AuthService] Cleaning up expired sessions...')
    
    try {
      await prisma.$connect()
      
      const result = await prisma.session.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      })
      
      console.log('✅ [AuthService] Cleaned up expired sessions:', result.count)
      return result.count
      
    } catch (error) {
      console.error('❌ [AuthService] Error cleaning up sessions:', error)
      throw error
    } finally {
      await prisma.$disconnect()
    }
  }

  /**
   * Получение статистики активных сессий
   */
  static async getSessionStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
    uniqueUsers: number;
  }> {
    try {
      await prisma.$connect()
      
      const now = new Date()
      
      const [
        totalSessions,
        activeSessions,
        expiredSessions,
        uniqueUsers
      ] = await Promise.all([
        prisma.session.count(),
        prisma.session.count({
          where: { expiresAt: { gte: now } }
        }),
        prisma.session.count({
          where: { expiresAt: { lt: now } }
        }),
        prisma.session.groupBy({
          by: ['userId'],
          where: { expiresAt: { gte: now } }
        }).then(result => result.length)
      ])
      
      return {
        totalSessions,
        activeSessions,
        expiredSessions,
        uniqueUsers
      }
      
    } catch (error) {
      console.error('❌ [AuthService] Error getting session stats:', error)
      throw error
    } finally {
      await prisma.$disconnect()
    }
  }

  /**
   * Генерация безопасного токена
   */
  private static generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let token = ''
    for (let i = 0; i < 64; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return token
  }

  /**
   * Проверка прав пользователя
   */
  static hasRole(user: AuthUser, requiredRole: 'USER' | 'ADMIN' | 'SUPER_ADMIN'): boolean {
    const roleHierarchy = {
      'USER': 1,
      'ADMIN': 2,
      'SUPER_ADMIN': 3
    }

    const userRoleLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0
    const requiredRoleLevel = roleHierarchy[requiredRole]

    return userRoleLevel >= requiredRoleLevel
  }

  /**
   * Обновление времени последнего входа пользователя
   */
  static async updateLastLogin(userId: string): Promise<void> {
    try {
      await prisma.$connect()
      
      await prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: new Date() }
      })
      
      console.log('✅ [AuthService] Updated last login for user:', userId)
      
    } catch (error) {
      console.error('❌ [AuthService] Error updating last login:', error)
      // Не пробрасываем ошибку, так как это не критично
    } finally {
      await prisma.$disconnect()
    }
  }
}