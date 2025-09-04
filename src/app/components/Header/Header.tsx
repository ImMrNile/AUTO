'use client';

import React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Upload, Package, Settings, TrendingUp, LogOut } from 'lucide-react';
import { useAuth } from '../AuthProvider';

type Tab = 'upload' | 'products' | 'cabinets' | 'analytics';

export default function Header() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const active = (params.get('tab') || 'upload') as Tab;

  const items: Array<{ id: Tab; label: string; Icon: any; aria: string }> = [
    { id: 'upload',    label: 'Созд.',    Icon: Upload,    aria: 'Создать товар' },
    { id: 'products',  label: 'Товары',   Icon: Package,   aria: 'Мои товары' },
    { id: 'cabinets',  label: 'Каб.',     Icon: Settings,  aria: 'Кабинеты WB' },
    { id: 'analytics', label: 'Аналит.',  Icon: TrendingUp,aria: 'Аналитика' },
  ];

  const handleTabChange = (tab: Tab) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    router.push(url.pathname + url.search);
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      if (response.ok) {
        router.push('/auth/login');
        router.refresh();
      }
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };

  return (
    <>
      {/* Верхняя шапка с логотипом и подписью */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
          color: '#fff',
          borderBottom: '1px solid rgba(255,255,255,.15)',
          boxShadow: '0 2px 10px rgba(0,0,0,.06)',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,.18)',
              display: 'grid', placeItems: 'center',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.25)',
              flex: '0 0 auto',
            }}
          >
            ⚡
          </div>

          <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
            <div style={{
              fontWeight: 800, fontSize: 16,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}>
              WB AI Assistant
            </div>
            <div style={{
              fontSize: 12, opacity: .9,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}>
              Автоматизация создания карточек товаров
            </div>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            {user && (
              <div style={{
                background: 'rgba(255,255,255,.18)',
                border: '1px solid rgba(255,255,255,.25)',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
              }}>
                {user.email}
              </div>
            )}
            
            <button
              onClick={handleLogout}
              style={{
                background: 'rgba(255,255,255,.18)',
                border: '1px solid rgba(255,255,255,.25)',
                borderRadius: 8,
                padding: '8px',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,.18)';
              }}
              title="Выйти"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Нижний нав-«док» — внутри того же компонента Header */}
      <div
        aria-label="Нижняя навигация"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 12,
          zIndex: 40,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',            // кликабельно только содержимое
        }}
      >
        <nav
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '8px',
            display: 'flex',
            gap: 4,
            boxShadow: '0 4px 20px rgba(0,0,0,.1)',
            pointerEvents: 'auto',          // теперь кликабельно
          }}
        >
          {items.map((item) => {
            const IconComponent = item.Icon;
            const isActive = active === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                aria-label={item.aria}
                style={{
                  background: isActive ? 'var(--accent-blue)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  minWidth: 64,
                  transition: 'all 0.2s ease',
                  fontWeight: isActive ? 600 : 500,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <IconComponent size={20} />
                <span style={{ fontSize: 11 }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
