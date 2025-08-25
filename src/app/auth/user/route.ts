import { createClient } from './../../../../lib/supabase/server'
import { AuthService } from './../../../../lib/auth/auth-service'
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const user = await AuthService.getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Получаем дополнительную информацию о пользователе
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        cabinets: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        _count: {
          select: {
            products: true,
            cabinets: true
          }
        }
      }
    })

    return NextResponse.json({
      ...user,
      cabinets: dbUser?.cabinets || [],
      stats: {
        productsCount: dbUser?._count.products || 0,
        cabinetsCount: dbUser?._count.cabinets || 0
      }
    })
  } catch (error) {
    console.error('User fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const user = await AuthService.getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const data = await request.json()
    const { name, avatarUrl } = data

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        avatarUrl,
        updatedAt: new Date()
      }
    })

    await AuthService.logAction(
      user.id,
      'update_profile',
      'user',
      user.id,
      { changes: { name, avatarUrl } },
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined
    )

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('User update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}