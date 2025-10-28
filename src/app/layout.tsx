import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from './components/AuthProvider'
import { TaskProvider } from './components/BackgroundTasks/TaskProvider'
import TaskNotificationsWrapper from './components/BackgroundTasks/TaskNotificationsWrapper'
import BackgroundProductLoader from './components/BackgroundProductLoader'
import BackgroundTaskInitializer from './components/BackgroundTaskInitializer'
import CookieConsent from './components/CookieConsent'
import AuthGuard from './components/AuthGuard'

const inter = Inter({ 
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
  adjustFontFallback: true,
  preload: true,
  variable: '--font-inter',
  weight: ['400', '500', '600', '700']
})

export const metadata: Metadata = {
  title: 'WB Automation',
  description: 'Система автоматизации для Wildberries с ИИ-ассистентом',
  keywords: 'wildberries, автоматизация, товары, интернет-магазин, ИИ',
  authors: [{ name: 'WB Automation Team' }],
  creator: 'WB Automation',
  publisher: 'WB Automation',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0a0a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" data-theme="dark">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="WB Automation" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#0a0a0a" />
        <meta name="msapplication-tap-highlight" content="no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={inter.className}>
        <div id="app-container" style={{ background: '#ffffff' }}>
          {/* Квадратные элементы внизу - без анимации */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
            <div 
              style={{
                position: 'absolute',
                width: '120px',
                height: '120px',
                bottom: '8%',
                left: '12%',
                background: 'radial-gradient(circle, #ec4899, #f59e0b)',
                borderRadius: '18px',
                opacity: 1
              }}
            ></div>
            
            <div 
              style={{
                position: 'absolute',
                width: '100px',
                height: '100px',
                bottom: '15%',
                right: '15%',
                background: 'radial-gradient(circle, #3b82f6, #a855f7)',
                borderRadius: '15px',
                opacity: 1
              }}
            ></div>
            
            <div 
              style={{
                position: 'absolute',
                width: '110px',
                height: '110px',
                bottom: '5%',
                left: '35%',
                background: 'radial-gradient(circle, #10b981, #3b82f6)',
                borderRadius: '20px',
                opacity: 1
              }}
            ></div>
          </div>
          
          {/* Все шейпы БЕЗ blur - четкие и яркие */}
          {/* Blur применяется ТОЛЬКО через backdrop-filter на ликвид гласс элементах */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
            <div className="shape shape2"></div>
            <div className="shape shape4"></div>
            
            {/* Дополнительные мелкие шарики */}
            <div 
              className="shape" 
              style={{
                width: '100px',
                height: '100px',
                top: '60%',
                right: '8%',
                animationDelay: '-7s',
                background: 'radial-gradient(circle, #10b981, #3b82f6)',
                borderRadius: '50%'
              }}
            ></div>
            
            <div 
              className="shape" 
              style={{
                width: '90px',
                height: '90px',
                bottom: '20%',
                left: '25%',
                animationDelay: '-12s',
                background: 'radial-gradient(circle, #f59e0b, #ec4899)',
                borderRadius: '18px'
              }}
            ></div>
            
            <div 
              className="shape" 
              style={{
                width: '110px',
                height: '110px',
                top: '35%',
                left: '8%',
                animationDelay: '-5s',
                background: 'radial-gradient(circle, #6366f1, #a855f7)',
                borderRadius: '22px'
              }}
            ></div>
            
            <div 
              className="shape" 
              style={{
                width: '95px',
                height: '95px',
                top: '45%',
                right: '20%',
                animationDelay: '-9s',
                background: 'radial-gradient(circle, #ec4899, #f59e0b)',
                borderRadius: '50%'
              }}
            ></div>
            
            <div 
              className="shape" 
              style={{
                width: '85px',
                height: '85px',
                bottom: '35%',
                right: '12%',
                animationDelay: '-15s',
                background: 'radial-gradient(circle, #3b82f6, #10b981)',
                borderRadius: '50%'
              }}
            ></div>
          </div>
          
          {/* Дополнительные световые эффекты */}
          <div 
            className="pulse-light-1"
            style={{
              position: 'fixed',
              top: '10%',
              left: '20%',
              width: '300px',
              height: '300px',
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.03) 0%, transparent 70%)',
              borderRadius: '50%',
              pointerEvents: 'none',
              zIndex: -1
            }}
          ></div>
          
          <div 
            className="pulse-light-2"
            style={{
              position: 'fixed',
              top: '60%',
              right: '15%',
              width: '400px',
              height: '400px',
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.02) 0%, transparent 70%)',
              borderRadius: '50%',
              pointerEvents: 'none',
              zIndex: -1
            }}
          ></div>
          
          {/* Основной контент */}
          <div style={{
            position: 'relative',
            zIndex: 2,
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <AuthGuard>
              <AuthProvider>
                <TaskProvider>
                  {children}
                  {/* Инициализация фоновых задач */}
                  <BackgroundTaskInitializer />
                  {/* Глобальные уведомления о задачах */}
                  <TaskNotificationsWrapper />
                  {/* Фоновая загрузка товаров */}
                  <BackgroundProductLoader />
                  {/* Cookie Consent Banner */}
                  <CookieConsent />
                </TaskProvider>
              </AuthProvider>
            </AuthGuard>
          </div>
        </div>
      </body>
    </html>
  )
}