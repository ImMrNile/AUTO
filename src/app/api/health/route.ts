import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Health check endpoint для Docker и мониторинга
 * GET /api/health
 */
export async function GET() {
  try {
    // Проверяем подключение к БД
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        services: {
          database: 'connected',
          api: 'running'
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        services: {
          database: 'disconnected',
          api: 'running'
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}
