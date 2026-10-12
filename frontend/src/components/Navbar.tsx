import React from 'react';
import {
  Zap,
  Store,
  Warehouse,
  ChevronDown,
  ShoppingCart,
  Package,
  FileText,
  Bot,
  TrendingUp,
  Boxes,
  Truck,
  User,
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

  const dealerTabs = [
    { id: 'catalogue', label: 'Catalogue', icon: Package },
    { id: 'cart', label: 'Cart and draft', icon: ShoppingCart, badge: cartCount > 0 ? cartCount : undefined },
    { id: 'orders', label: 'Orders and GST', icon: FileText },
    { id: 'assistant', label: 'AI assistant', icon: Bot, isSparkle: true },
    { id: 'reorder', label: 'Reorder', icon: TrendingUp },
  ];

  const warehouseTabs = [
    { id: 'catalogue', label: 'Stock and inventory', icon: Boxes },
    { id: 'orders', label: 'Dispatch desk', icon: Truck },
    { id: 'reorder', label: 'Reorder and forecast', icon: TrendingUp },
    { id: 'assistant', label: 'Ops assistant', icon: Bot, isSparkle: true },
  ];

  const tabs = userRole === 'dealer' ? dealerTabs : warehouseTabs;

  return (
    <header>
      {/* Top Bar */}
      <div className="bar">
        {/* Brand / Logo */}
        <div className="logo">
          <div className="mark">
            <Zap size={18} fill="#412402" color="#412402" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.02em', color: '#fff' }}>
                VIKMO
              </span>
              <span className={`badge ${userRole === 'dealer' ? 'low' : 'info'}`}>
                {userRole === 'dealer' ? 'Dealerdesk' : 'Warehouse admin'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '1px' }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: apiHealthy ? '#4ade80' : '#f87171',
                boxShadow: apiHealthy ? '0 0 6px #4ade80' : '0 0 6px #f87171',
              }} />
              <span>{apiHealthy ? 'API connected' : 'Connecting to API...'}</span>
            </div>
          </div>
        </div>

        {/* Role Segmented Switcher */}
        <div className="seg" role="tablist">
          <button
            className={userRole === 'dealer' ? 'on' : ''}
            onClick={() => setUserRole('dealer')}
          >
            <Store size={14} />
            <span>Dealer view</span>
          </button>
          <button
            className={userRole === 'warehouse' ? 'on' : ''}
            onClick={() => setUserRole('warehouse')}
          >
            <Warehouse size={14} />
            <span>Warehouse view</span>
          </button>
        </div>

        {/* Right Action Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {userRole === 'dealer' ? (
            <>
              {/* Active Dealer Selector Card */}
              <div style={{
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '4px 10px',
                background: 'var(--surface-0)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <User size={13} color="var(--primary)" />
                <div>
                  <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Active dealer
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <select
                      value={selectedDealerId}
                      onChange={(e) => setSelectedDealerId(Number(e.target.value))}
                      style={{
                        background: 'transparent',
                        color: 'var(--text-primary)',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none',
                        maxWidth: '170px',
                      }}
                    >
                      {dealers.map((d) => (
                        <option key={d.id} value={d.id} style={{ background: '#1c1c1b', color: '#fff' }}>
                          {d.dealer_code} · {d.name} ({d.city})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Cart Button */}
              <button
                onClick={onOpenCart}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '7px 12px',
                  display: 'flex',
                  gap: '7px',
                  alignItems: 'center',
                  background: cartCount > 0 ? 'rgba(239, 159, 39, 0.12)' : 'var(--surface-0)',
                  color: cartCount > 0 ? 'var(--primary)' : 'var(--text-primary)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                }}
              >
                <ShoppingCart size={15} />
                <span>Cart</span>
                {cartCount > 0 && <span className="badge info">{cartCount}</span>}
              </button>
            </>
          ) : (
            /* Warehouse Facility Pill */
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '6px 12px',
              background: 'var(--surface-0)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <Warehouse size={15} color="#60a5fa" />
              <div>
                <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Distribution Hub
                </div>
                <div style={{ fontWeight: 600, fontSize: '12px', color: '#fff' }}>
                  Central warehouse (BLR)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Horizontal Tabs Bar */}
      <nav className="tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={isActive ? 'on' : ''}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={14} strokeWidth={isActive ? 2.4 : 1.8} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="badge info" style={{ marginLeft: '2px', padding: '1px 6px', fontSize: '10px' }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
