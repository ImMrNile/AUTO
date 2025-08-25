import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin', 'cyrillic'],
  display: 'swap'
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
        <div id="app-container">
          {/* Анимированный фон с фигурами */}
          <div className="animated-background"></div>
          <div className="floating-shapes">
            <div className="floating-shape shape-1"></div>
            <div className="floating-shape shape-2"></div>
            <div className="floating-shape shape-3"></div>
            
            {/* Дополнительные анимированные элементы */}
            <div 
              className="floating-shape" 
              style={{
                width: '60px',
                height: '60px',
                top: '80%',
                left: '15%',
                animationDelay: '-15s',
                background: 'linear-gradient(45deg, rgba(59, 130, 246, 0.08), rgba(16, 185, 129, 0.08))',
                borderRadius: '30%'
              }}
            ></div>
            
            <div 
              className="floating-shape" 
              style={{
                width: '120px',
                height: '120px',
                top: '20%',
                right: '25%',
                animationDelay: '-8s',
                background: 'linear-gradient(45deg, rgba(139, 92, 246, 0.06), rgba(59, 130, 246, 0.06))',
                borderRadius: '60%'
              }}
            ></div>
            
            <div 
              className="floating-shape" 
              style={{
                width: '40px',
                height: '40px',
                top: '50%',
                left: '5%',
                animationDelay: '-12s',
                background: 'linear-gradient(45deg, rgba(16, 185, 129, 0.1), rgba(139, 92, 246, 0.1))',
                borderRadius: '20%'
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
            zIndex: 1,
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}