// API endpoint to get characteristics for a specific category

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = parseInt(params.id);

    if (isNaN(categoryId)) {
      return NextResponse.json(
        { error: 'Invalid category ID' },
        { status: 400 }
      );
    }

    // Get all characteristics for this category
    const characteristics = await prisma.wbCategoryCharacteristic.findMany({
      where: {
        subcategoryId: categoryId
      },
      include: {
        values: {
          where: {
            isActive: true
          },
          orderBy: {
            sortOrder: 'asc'
          }
        }
      },
      orderBy: {
        sortOrder: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      characteristics
    });

  } catch (error: any) {
    console.error('Error fetching category characteristics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch characteristics' },
      { status: 500 }
    );
  }
}
