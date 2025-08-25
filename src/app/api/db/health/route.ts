import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    // Простая проверка подключения
    const ping = await prisma.$queryRaw`SELECT 1 as ok`

    // Базовые метрики по категориям
    const [parents, subs] = await Promise.all([
      prisma.wbParentCategory.count(),
      prisma.wbSubcategory.count(),
    ])

    const sample = await prisma.wbSubcategory.findMany({
      take: 5,
      include: { parentCategory: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      ok: true,
      ping,
      counts: { parents, subs },
      sample: sample.map((c) => ({
        id: c.id,
        name: c.name,
        parent: c.parentCategory?.name,
      })),
    })
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || 'DB error',
        code: e?.code,
      },
      { status: 500 },
    )
  }
}


