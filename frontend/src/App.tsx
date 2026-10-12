import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CatalogueView } from './components/CatalogueView';
import { CartCheckoutView } from './components/CartCheckoutView';
import { OrdersView } from './components/OrdersView';
import { AssistantChatView } from './components/AssistantChatView';
import { ReorderForecastView } from './components/ReorderForecastView';
import { CartItem, Dealer, Order, Product, UserRole } from './types';
import { ApiService } from './api';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export function App() {
  const [userRole, setUserRole] = useState<UserRole>('dealer');
  const [activeTab, setActiveTab] = useState<string>('catalogue');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState<number>(1);
  const [apiHealthy, setApiHealthy] = useState<boolean>(true);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Check health and load dealers on mount
  useEffect(() => {
    const initApp = async () => {
      try {
        const health = await ApiService.getHealth();
        setApiHealthy(health.status === 'ok');
      } catch {
        setApiHealthy(false);
      }

      try {
        const dealerRes = await ApiService.getDealers();
        if (dealerRes.results.length > 0) {
          setDealers(dealerRes.results);
          setSelectedDealerId(dealerRes.results[0].id);
        }
      } catch (err: any) {
        showToast('Failed to load registered dealerships.', 'error');
      }
    };

    initApp();
  }, []);

  const handleAddToCart = (product: Product, quantity: number) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.sku === product.sku);
      if (existing) {
        return prev.map((i) =>
          i.product.sku === product.sku
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { product, quantity }];
    });
    showToast(`Added ${quantity}x ${product.name} to cart.`, 'success');
  };

  const handleUpdateQty = (sku: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.sku === sku) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (sku: string) => {
    setCart((prev) => prev.filter((i) => i.product.sku !== sku));
    showToast('Removed item from cart.', 'info');
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleViewOrder = (orderNumber: string) => {
    setSelectedOrderNumber(orderNumber);
    setActiveTab('orders');
  };

  const selectedDealer = dealers.find((d) => d.id === selectedDealerId);
  const cartTotalItems = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header & Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={cartTotalItems}
        dealers={dealers}
        selectedDealerId={selectedDealerId}
        setSelectedDealerId={setSelectedDealerId}
        apiHealthy={apiHealthy}
        onOpenCart={() => setActiveTab('cart')}
        userRole={userRole}
        setUserRole={(newRole) => {
          setUserRole(newRole);
          if (newRole === 'warehouse') {
            if (activeTab === 'cart') {
              setActiveTab('catalogue');
            }
          } else if (newRole === 'dealer') {
            if (activeTab === 'reorder') {
              setActiveTab('catalogue');
            }
          }
        }}
      />

      {/* Main View Area */}
      <main style={{ flex: 1, paddingBottom: '60px' }}>
        {activeTab === 'catalogue' && (
          <CatalogueView
            key={`catalogue-${userRole}`}
            onAddToCart={handleAddToCart}
            showToast={showToast}
            userRole={userRole}
          />
        )}

        {activeTab === 'cart' && userRole === 'dealer' && (
          <CartCheckoutView
            cart={cart}
            onUpdateQty={handleUpdateQty}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            selectedDealer={selectedDealer}
            onOrderCreated={(ord) => {
              setSelectedOrderNumber(ord.order_number);
            }}
            showToast={showToast}
            onViewOrder={handleViewOrder}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersView
            key={`orders-${userRole}`}
            selectedOrderNumber={selectedOrderNumber}
            showToast={showToast}
            userRole={userRole}
            activeDealerId={selectedDealerId}
          />
        )}

        {activeTab === 'assistant' && (
          <AssistantChatView
            selectedDealer={selectedDealer}
            onViewOrder={handleViewOrder}
            showToast={showToast}
          />
        )}

        {activeTab === 'reorder' && (
          <ReorderForecastView showToast={showToast} />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-color)',
        padding: '20px 24px',
        textAlign: 'center',
        backgroundColor: 'rgba(9, 13, 22, 0.95)',
        fontSize: '0.8rem',
        color: 'var(--text-dim)',
      }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            VIKMO DealerDesk · Bengaluru Motorcycle & Parts Distribution System
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>Backend: Django REST Framework</span>
            <span>Database: PostgreSQL</span>
            <span>Frontend: React 19 + TypeScript</span>
          </div>
        </div>
      </footer>

      {/* Toast Notification Container */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '420px',
      }}>
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';
          return (
            <div
              key={t.id}
              style={{
                backgroundColor: isError ? '#7f1d1d' : isSuccess ? '#064e3b' : '#1e293b',
                color: '#fff',
                padding: '12px 16px',
                borderRadius: '10px',
                border: `1px solid ${isError ? '#ef4444' : isSuccess ? '#10b981' : '#475569'}`,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '0.88rem',
                animation: 'pulseGlow 0.3s ease-out',
              }}
            >
              {isSuccess && <CheckCircle2 size={18} color="#34d399" style={{ flexShrink: 0 }} />}
              {isError && <AlertCircle size={18} color="#f87171" style={{ flexShrink: 0 }} />}
              {!isSuccess && !isError && <Info size={18} color="#60a5fa" style={{ flexShrink: 0 }} />}
              <span style={{ flex: 1 }}>{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
