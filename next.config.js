/** @type {import('next').NextConfig} */
const nextConfig = {
    // appDir включен по умолчанию в Next.js 14+
    
    // Оптимизация шрифтов (встроена по умолчанию в Next.js 14+)
    optimizeFonts: true,
    
    // Увеличиваем таймаут для внешних запросов
    httpAgentOptions: {
        keepAlive: true,
    },
    
    // Experimental features
    experimental: {
        // Оптимизация пакетов
        optimizePackageImports: ['lucide-react'],
    }
}

module.exports = nextConfig