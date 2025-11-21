import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/products/categories
 * Получение списка всех категорий WB из БД
 */
export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: 'Не авторизован' 
      }, { status: 401 });
    }

    console.log('📋 Загрузка категорий из БД...');

    // Получаем все подкатегории с родительскими категориями из БД
    const subcategories = await prisma.wbSubcategory.findMany({
      include: {
        parentCategory: true
      },
      orderBy: [
        { parentCategory: { name: 'asc' } },
        { name: 'asc' }
      ]
    });

    // Форматируем категории для UI
    const categories = subcategories.map((subcat) => ({
      id: subcat.wbSubjectId,
      name: subcat.name,
      parentId: subcat.parentCategoryId,
      parentName: subcat.parentCategory.name
    }));

    console.log(`✅ Загружено ${categories.length} категорий из БД`);

    return NextResponse.json({
      success: true,
      categories,
      total: categories.length
    });

  } catch (error: any) {
    console.error('❌ Ошибка загрузки категорий:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to load categories' 
      },
      { status: 500 }
    );
  }
}
