import React from 'react';
import {
  Truck,
  ShoppingCart,
  Package,
  FileText,
  Bot,
  TrendingUp,
  Boxes,
  User,
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
  const tabs = [
    { id: 'catalogue', label: 'Catalogue & Parts', icon: Package },
    { id: 'cart', label: 'Cart & Draft', icon: ShoppingCart, badge: cartCount > 0 ? cartCount : undefined },
    { id: 'orders', label: 'Orders & GST Invoices', icon: FileText },
    { id: 'warehouse', label: 'Warehouse & Stock', icon: Boxes },
    { id: 'reorder', label: 'Demand Forecast', icon: TrendingUp },
    { id: 'assistant', label: 'AI Assistant', icon: Bot, isSparkle: true },
  ];

  return (
    <header>
      {/* Top App Bar */}
      <div className="bar">
        {/* Brand / Logo */}
        <div className="logo">
          <div className="mark" title="VIKMO Logistics & Distribution Hub">
            <Truck size={19} color="#412402" strokeWidth={2.4} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.02em', color: '#fff' }}>
                VIKMO
              </span>
              <span className="badge low" style={{ letterSpacing: '0.04em' }}>
                Distributor Console
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
              <span>{apiHealthy ? 'API connected · Central Hub (BLR)' : 'Connecting to API...'}</span>
            </div>
          </div>
        </div>

        {/* Right Action Controls: Taking Order for Dealer + Cart */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Active Dealer Selector Card */}
          <div style={{
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '5px 12px',
            background: 'var(--surface-0)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <User size={14} color="var(--primary)" />
            <div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Taking order for dealer
              </div>
              <select
                value={selectedDealerId}
                onChange={(e) => setSelectedDealerId(Number(e.target.value))}
                style={{
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                  maxWidth: '220px',
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

          {/* Cart Button */}
          <button
            onClick={onOpenCart}
            style={{
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '7px 14px',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              background: cartCount > 0 ? 'rgba(239, 159, 39, 0.15)' : 'var(--surface-0)',
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
        </div>
      </div>

      {/* Unified Distributor Operations Tabs Bar */}
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
