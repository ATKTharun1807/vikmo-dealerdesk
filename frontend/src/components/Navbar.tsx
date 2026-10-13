import React, { useState, useRef, useEffect } from 'react';
import {
  Truck,
  ShoppingCart,
  Package,
  FileText,
  Bot,
  TrendingUp,
  Boxes,
  User,
  Sun,
  Moon,
  ChevronDown,
  Check,
  Search,
  Building2,
  RefreshCw,
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
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenSyncModal: () => void;
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
  theme,
  onToggleTheme,
  onOpenSyncModal,
}) => {
  const [dealerDropdownOpen, setDealerDropdownOpen] = useState(false);
  const [dealerSearch, setDealerSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedDealer = dealers.find((d) => d.id === selectedDealerId) || dealers[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDealerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredDealers = dealers.filter((d) => {
    const q = dealerSearch.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.dealer_code.toLowerCase().includes(q) ||
      d.city.toLowerCase().includes(q)
    );
  });

  const tabs = [
    { id: 'catalogue', label: 'Catalogue & Parts', icon: Package },
    { id: 'cart', label: 'Cart & Draft', icon: ShoppingCart, badge: cartCount > 0 ? cartCount : undefined },
    { id: 'orders', label: 'Orders & GST Invoices', icon: FileText },
    { id: 'warehouse', label: 'Warehouse & Stock', icon: Boxes },
    { id: 'reorder', label: 'Demand Forecast', icon: TrendingUp },
    { id: 'assistant', label: 'Operations Copilot', icon: Bot, isSparkle: true },
  ];

  return (
    <header>
      {/* Top App Bar */}
      <div className="bar">
        {/* Brand / Logo */}
        <div className="logo">
          <div className="mark" title="VIKMO Logistics & Distribution Hub">
            <Truck size={19} color="#ffffff" strokeWidth={2.4} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                VIKMO
              </span>
              <span style={{
                fontSize: '10.5px',
                fontWeight: 600,
                letterSpacing: '0.04em',
                padding: '2px 8px',
                borderRadius: '5px',
                background: theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0',
                border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #cbd5e1',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
              }}>
                Distributor Console
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '1px' }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: apiHealthy ? '#10b981' : '#f87171',
                boxShadow: apiHealthy ? '0 0 6px #10b981' : '0 0 6px #f87171',
              }} />
              <span>{apiHealthy ? 'API connected · Central Hub (BLR)' : 'Connecting to API...'}</span>
            </div>
          </div>
        </div>

        {/* Right Action Controls: Custom Dealer Selector + Cart + Theme Toggle */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Custom Styled Dealer Selector Dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setDealerDropdownOpen((prev) => !prev)}
              style={{
                border: dealerDropdownOpen ? '1px solid var(--primary)' : '1px solid var(--border)',
                borderRadius: '8px',
                padding: '5px 12px',
                background: 'var(--surface-0)',
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                cursor: 'pointer',
                boxShadow: dealerDropdownOpen ? '0 0 0 2px var(--primary-glow)' : 'none',
                transition: 'all 0.16s ease',
                textAlign: 'left',
              }}
            >
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                background: 'var(--tab-active-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--tab-active-text)',
                flexShrink: 0,
              }}>
                <Building2 size={14} />
              </div>

              <div>
                <div style={{
                  fontSize: '9px',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 700,
                  lineHeight: 1.1,
                }}>
                  Taking order for dealer
                </div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  marginTop: '1px',
                }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--primary)' }}>
                    {selectedDealer?.dealer_code || 'DLR-001'}
                  </span>
                  <span>·</span>
                  <span style={{ maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedDealer?.name || 'ABC Motors'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    ({selectedDealer?.city || 'Kochi'})
                  </span>
                </div>
              </div>

              <ChevronDown
                size={14}
                color="var(--text-muted)"
                style={{
                  transform: dealerDropdownOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.18s ease',
                  marginLeft: '2px',
                }}
              />
            </button>

            {/* Floating Custom Dropdown Menu */}
            {dealerDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  width: '340px',
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '10px',
                  boxShadow: theme === 'dark' ? '0 16px 40px rgba(0, 0, 0, 0.55)' : '0 12px 32px rgba(0, 0, 0, 0.12)',
                  zIndex: 1000,
                  overflow: 'hidden',
                  animation: 'fadeIn 0.14s ease-out',
                }}
              >
                {/* Search Filter Header */}
                <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'var(--surface-0)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '5px 9px',
                    }}
                  >
                    <Search size={13} color="var(--text-muted)" />
                    <input
                      type="text"
                      placeholder="Search dealer, city, code..."
                      value={dealerSearch}
                      onChange={(e) => setDealerSearch(e.target.value)}
                      autoFocus
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        width: '100%',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Dealers List */}
                <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '4px' }}>
                  {filteredDealers.length === 0 ? (
                    <div style={{ padding: '16px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                      No dealerships found matching "{dealerSearch}"
                    </div>
                  ) : (
                    filteredDealers.map((d) => {
                      const isSelected = d.id === selectedDealerId;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setSelectedDealerId(d.id);
                            setDealerDropdownOpen(false);
                            setDealerSearch('');
                          }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '7px 9px',
                            borderRadius: '6px',
                            border: 'none',
                            background: isSelected ? 'var(--tab-active-bg)' : 'transparent',
                            color: isSelected ? 'var(--tab-active-text)' : 'var(--text-primary)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'background 0.1s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'var(--surface-hover)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                padding: '2px 5px',
                                borderRadius: '4px',
                                background: isSelected ? 'var(--tab-active-border)' : 'var(--surface-2)',
                                color: isSelected ? 'var(--tab-active-text)' : 'var(--text-secondary)',
                                border: '1px solid var(--border-subtle)',
                              }}
                            >
                              {d.dealer_code}
                            </span>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: isSelected ? 700 : 500 }}>
                                {d.name}
                              </div>
                              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                                {d.city} · Credit: ₹{Number(d.credit_limit || 0).toLocaleString('en-IN')}
                              </div>
                            </div>
                          </div>

                          {isSelected && <Check size={14} color="var(--primary)" />}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Footer Count */}
                <div
                  style={{
                    padding: '6px 10px',
                    borderTop: '1px solid var(--border)',
                    background: 'var(--surface-0)',
                    fontSize: '10.5px',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{dealers.length} Dealerships</span>
                  <span>Hub: Central BLR</span>
                </div>
              </div>
            )}
          </div>

          {/* Supplier Sync Action Button */}
          <button
            onClick={onOpenSyncModal}
            title="Open Supplier Catalogue Sync Console"
            style={{
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '7px 12px',
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
              background: 'var(--surface-0)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.16s ease',
            }}
          >
            <RefreshCw size={13} color="var(--primary)" />
            <span>Supplier Sync</span>
          </button>

          {/* Theme Toggle (Dark / Light) */}
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '7px 12px',
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
              background: 'var(--surface-0)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.16s ease',
            }}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={15} color="#fbbf24" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon size={15} color="#6366f1" />
                <span>Dark</span>
              </>
            )}
          </button>

          {/* Cart Button */}
          <button
            onClick={onOpenCart}
            style={{
              border: cartCount > 0 ? '1px solid var(--primary)' : '1px solid var(--border)',
              borderRadius: '8px',
              padding: '7px 14px',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              background: cartCount > 0 ? 'var(--tab-active-bg)' : 'var(--surface-0)',
              color: cartCount > 0 ? 'var(--tab-active-text)' : 'var(--text-primary)',
              fontSize: '12.5px',
              fontWeight: 600,
              boxShadow: cartCount > 0 ? '0 0 10px var(--primary-glow)' : '0 1px 4px rgba(0,0,0,0.1)',
            }}
          >
            <ShoppingCart size={15} />
            <span>Cart</span>
            {cartCount > 0 && <span className="badge ok">{cartCount}</span>}
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

