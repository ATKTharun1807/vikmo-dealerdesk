import React from 'react';
import {
  Layers,
  ShoppingCart,
  Package,
  FileText,
  Bot,
  TrendingUp,
  RefreshCw,
  User,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Dealer } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  cartCount: number;
  dealers: Dealer[];
  selectedDealerId: number;
  setSelectedDealerId: (id: number) => void;
  apiHealthy: boolean;
  onOpenCart: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  cartCount,
  dealers,
  selectedDealerId,
  setSelectedDealerId,
  apiHealthy,
  onOpenCart,
}) => {
  const currentDealer = dealers.find((d) => d.id === selectedDealerId);

  const navItems = [
    { id: 'catalogue', label: 'Catalogue', icon: Package },
    { id: 'cart', label: 'Cart & Draft', icon: ShoppingCart, badge: cartCount > 0 ? cartCount : undefined },
    { id: 'orders', label: 'Orders & GST', icon: FileText },
    { id: 'assistant', label: 'AI Assistant', icon: Bot, isSparkle: true },
    { id: 'reorder', label: 'Reorder & Forecast', icon: TrendingUp },
  ];

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(20px)',
      backgroundColor: 'rgba(9, 13, 22, 0.85)',
      borderBottom: '1px solid var(--border-color)',
    }}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(245, 158, 11, 0.35)',
          }}>
            <Zap size={24} color="#000" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
                VIKMO
              </span>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                letterSpacing: '0.05em',
              }}>
                DEALERDESK
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <div className="pulse-dot" style={{ backgroundColor: apiHealthy ? '#10b981' : '#ef4444', boxShadow: apiHealthy ? '0 0 8px #10b981' : '0 0 8px #ef4444' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {apiHealthy ? 'API Connected (PostgreSQL)' : 'Connecting to API...'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(255, 255, 255, 0.03)',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
        }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isActive ? 'rgba(245, 158, 11, 0.16)' : 'transparent',
                  color: isActive ? '#f59e0b' : 'var(--text-muted)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.88rem',
                  outline: isActive ? '1px solid rgba(245, 158, 11, 0.4)' : 'none',
                  transition: 'all 0.18s ease',
                  position: 'relative',
                }}
              >
                <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span style={{
                    backgroundColor: '#f59e0b',
                    color: '#000',
                    fontWeight: 800,
                    fontSize: '0.7rem',
                    padding: '1px 6px',
                    borderRadius: '999px',
                  }}>
                    {item.badge}
                  </span>
                )}
                {item.isSparkle && !isActive && (
                  <span style={{
                    fontSize: '0.65rem',
                    background: 'linear-gradient(90deg, #8b5cf6, #ec4899)',
                    color: '#fff',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    fontWeight: 700,
                  }}>
                    AI
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Dealer Switcher & Cart */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Dealer Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-surface)',
            padding: '6px 12px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
          }}>
            <User size={16} color="var(--primary)" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active Dealer
              </span>
              <select
                value={selectedDealerId}
                onChange={(e) => setSelectedDealerId(Number(e.target.value))}
                style={{
                  background: 'transparent',
                  color: '#fff',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  maxWidth: '180px',
                }}
              >
                {dealers.map((d) => (
                  <option key={d.id} value={d.id} style={{ background: '#111827', color: '#fff' }}>
                    {d.dealer_code} · {d.name} ({d.city})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Cart Button */}
          <button
            onClick={onOpenCart}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: cartCount > 0 ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
              color: cartCount > 0 ? '#000' : 'var(--text-main)',
              border: '1px solid ' + (cartCount > 0 ? 'var(--primary)' : 'var(--border-color)'),
              padding: '8px 14px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.85rem',
            }}
          >
            <ShoppingCart size={17} />
            <span>Cart</span>
            {cartCount > 0 && (
              <span style={{
                backgroundColor: '#000',
                color: '#fff',
                fontSize: '0.72rem',
                padding: '1px 6px',
                borderRadius: '999px',
              }}>
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
