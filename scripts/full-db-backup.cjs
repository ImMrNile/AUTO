// scripts/simple-xlsx.cjs
const { PrismaClient } = require('@prisma/client')
const XLSX = require('xlsx')
const fs = require('fs')

const prisma = new PrismaClient()

async function quickExcelExport() {
    try {
        console.log('🔄 Быстрый экспорт в Excel...')

        // Создаем новую книгу
        const workbook = XLSX.utils.book_new()

        // === ПРОДУКТЫ ===
        console.log('📋 Получаем продукты...')
        const products = await prisma.product.findMany({
            include: {
                subcategory: {
                    include: {
                        parentCategory: true
                    }
                },
                productCabinets: {
                    include: {
                        cabinet: true
                    }
                }
            }
        })

        const productsData = products.map(product => ({
            'ID': product.id,
            'Название': product.name,
            'Сгенерированное название': product.generatedName || '',
            'Цена': product.price,
            'Статус': product.status,
            'Категория': product.subcategory ? .parentCategory ? .name || '',
            'Подкатегория': product.subcategory ? .name || '',
            'Кабинеты': product.productCabinets.map(pc => pc.cabinet.name).join(', '),
            'Дата создания': product.createdAt ? .toISOString().split('T')[0] || ''
        }))

        const productsSheet = XLSX.utils.json_to_sheet(productsData)
        XLSX.utils.book_append_sheet(workbook, productsSheet, 'Products')
        console.log(`   ✅ Продуктов: ${products.length}`)

        // === КАБИНЕТЫ ===
        console.log('📋 Получаем кабинеты...')
        const cabinets = await prisma.cabinet.findMany({
            include: {
                _count: {
                    select: { productCabinets: true }
                }
            }
        })

        const cabinetsData = cabinets.map(cabinet => ({
            'ID': cabinet.id,
            'Название': cabinet.name,
            'Описание': cabinet.description || '',
            'Активен': cabinet.isActive ? 'Да' : 'Нет',
            'Количество товаров': cabinet._count.productCabinets,
            'Дата создания': cabinet.createdAt ? .toISOString().split('T')[0] || ''
        }))

        const cabinetsSheet = XLSX.utils.json_to_sheet(cabinetsData)
        XLSX.utils.book_append_sheet(workbook, cabinetsSheet, 'Cabinets')
        console.log(`   ✅ Кабинетов: ${cabinets.length}`)

        // === РОДИТЕЛЬСКИЕ КАТЕГОРИИ ===
        console.log('📋 Получаем родительские категории...')
        const parentCategories = await prisma.wbParentCategory.findMany({
            include: {
                _count: {
                    select: { subcategories: true }
                }
            }
        })

        const parentCategoriesData = parentCategories.map(cat => ({
            'ID': cat.id,
            'Название': cat.name,
            'Slug': cat.slug,
            'Описание': cat.description || '',
            'Активна': cat.isActive ? 'Да' : 'Нет',
            'Количество подкатегорий': cat._count.subcategories
        }))

        const parentCategoriesSheet = XLSX.utils.json_to_sheet(parentCategoriesData)
        XLSX.utils.book_append_sheet(workbook, parentCategoriesSheet, 'Parent Categories')
        console.log(`   ✅ Родительских категорий: ${parentCategories.length}`)

        // === ПОДКАТЕГОРИИ (ВЫБОРОЧНО) ===
        console.log('📋 Получаем подкатегории (первые 500)...')
        const subcategories = await prisma.wbSubcategory.findMany({
            take: 500,
            include: {
                parentCategory: true,
                _count: {
                    select: { products: true }
                }
            }
        })

        const subcategoriesData = subcategories.map(sub => ({
            'ID': sub.id,
            'WB Subject ID': sub.wbSubjectId || '',
            'Название': sub.name,
            'Slug': sub.slug,
            'Родительская категория': sub.parentCategory.name,
            'Комиссия FBW': sub.commissionFbw + '%',
            'Комиссия FBS': sub.commissionFbs + '%',
            'Активна': sub.isActive ? 'Да' : 'Нет',
            'Количество товаров': sub._count.products
        }))

        const subcategoriesSheet = XLSX.utils.json_to_sheet(subcategoriesData)
        XLSX.utils.book_append_sheet(workbook, subcategoriesSheet, 'Subcategories (500)')
        console.log(`   ✅ Подкатегорий: ${subcategories.length} из 7211`)

        // === СОХРАНЕНИЕ ===
        const exportDir = './exports'
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true })
        }

        const fileName = `wb_quick_export_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`
        const filePath = `${exportDir}/${fileName}`

        console.log('💾 Сохраняем файл...')
        XLSX.writeFile(workbook, filePath)

        console.log(`\n✅ БЫСТРЫЙ ЭКСПОРТ ЗАВЕРШЕН!`)
        console.log(`📁 Файл: ${filePath}`)
        console.log(`\n📊 Что экспортировано:`)
        console.log(`   - Продуктов: ${products.length}`)
        console.log(`   - Кабинетов: ${cabinets.length}`)
        console.log(`   - Родительских категорий: ${parentCategories.length}`)
        console.log(`   - Подкатегорий: ${subcategories.length} (первые 500)`)
        console.log(`\n💡 Для экспорта всех данных используйте полный бэкап`)

    } catch (error) {
        console.error('❌ Ошибка при экспорте:', error)
    } finally {
        await prisma.$disconnect()
    }
}

quickExcelExport()