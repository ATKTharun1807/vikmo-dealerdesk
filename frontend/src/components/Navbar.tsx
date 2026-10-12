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
  Store,
  Warehouse,
  Boxes,
  Truck,
} from 'lucide-react';
import { Dealer, UserRole } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  cartCount: number;
  dealers: Dealer[];
  selectedDealerId: number;
  setSelectedDealerId: (id: number) => void;
  apiHealthy: boolean;
  onOpenCart: () => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
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
  userRole,
  setUserRole,
}) => {
  const currentDealer = dealers.find((d) => d.id === selectedDealerId);

  // Dynamic Navigation Items based on Persona / Role
  const navItems =
    userRole === 'dealer'
      ? [
          { id: 'catalogue', label: 'Parts Catalogue', icon: Package },
          { id: 'cart', label: 'Cart & Draft', icon: ShoppingCart, badge: cartCount > 0 ? cartCount : undefined },
          { id: 'orders', label: 'My Orders & GST', icon: FileText },
          { id: 'assistant', label: 'AI Assistant', icon: Bot, isSparkle: true },
        ]
      : [
          { id: 'catalogue', label: 'Stock & Inventory', icon: Boxes },
          { id: 'orders', label: 'Dispatch Desk', icon: Truck },
          { id: 'reorder', label: 'Reorder & Forecast (ML)', icon: TrendingUp },
          { id: 'assistant', label: 'Ops Assistant', icon: Bot, isSparkle: true },
        ];

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(20px)',
      backgroundColor: 'rgba(9, 13, 22, 0.90)',
      borderBottom: '1px solid var(--border-color)',
    }}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
      }}>
        {/* Brand + Mode Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: userRole === 'dealer'
              ? 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)'
              : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: userRole === 'dealer'
              ? '0 4px 16px rgba(245, 158, 11, 0.35)'
              : '0 4px 16px rgba(59, 130, 246, 0.35)',
            transition: 'all 0.3s ease',
          }}>
            {userRole === 'dealer' ? (
              <Zap size={24} color="#000" strokeWidth={2.5} />
            ) : (
              <Warehouse size={22} color="#fff" strokeWidth={2.2} />
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
                VIKMO
              </span>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                backgroundColor: userRole === 'dealer' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                color: userRole === 'dealer' ? '#f59e0b' : '#60a5fa',
                padding: '2px 8px',
                borderRadius: '6px',
                border: userRole === 'dealer' ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
                letterSpacing: '0.05em',
                transition: 'all 0.3s ease',
              }}>
                {userRole === 'dealer' ? 'DEALER PORTAL' : 'WAREHOUSE ADMIN'}
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

        {/* Role Persona Switcher Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
        }}>
          <button
            onClick={() => setUserRole('dealer')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: userRole === 'dealer' ? 'var(--primary)' : 'transparent',
              color: userRole === 'dealer' ? '#000' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: userRole === 'dealer' ? '0 2px 10px rgba(245, 158, 11, 0.4)' : 'none',
            }}
          >
            <Store size={15} />
            <span>Dealer View</span>
          </button>
          <button
            onClick={() => setUserRole('warehouse')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: userRole === 'warehouse' ? '#3b82f6' : 'transparent',
              color: userRole === 'warehouse' ? '#fff' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: userRole === 'warehouse' ? '0 2px 10px rgba(59, 130, 246, 0.4)' : 'none',
            }}
          >
            <Warehouse size={15} />
            <span>Warehouse View</span>
          </button>
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
            const activeColor = userRole === 'dealer' ? '#f59e0b' : '#60a5fa';
            const activeBg = userRole === 'dealer' ? 'rgba(245, 158, 11, 0.16)' : 'rgba(59, 130, 246, 0.16)';
            const activeBorder = userRole === 'dealer' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(59, 130, 246, 0.4)';

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
                  backgroundColor: isActive ? activeBg : 'transparent',
                  color: isActive ? activeColor : 'var(--text-muted)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.88rem',
                  outline: isActive ? `1px solid ${activeBorder}` : 'none',
                  transition: 'all 0.18s ease',
                  position: 'relative',
                }}
              >
                <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span style={{
                    backgroundColor: activeColor,
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

        {/* Right Side: Role-Specific Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {userRole === 'dealer' ? (
            <>
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
                    Active Dealership
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
            </>
          ) : (
            /* Warehouse Admin Badge */
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              padding: '6px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}>
              <Warehouse size={18} color="#60a5fa" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.65rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Distribution Hub
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
                  Central Warehouse (BLR)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
