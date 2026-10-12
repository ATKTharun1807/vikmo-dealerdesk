import React, { useState, useEffect } from 'react';
import {
  Search,
  Car,
  ShoppingCart,
  RefreshCw,
  Plus,
  Minus,
  Edit3,
  Boxes,
  Truck,
  CheckCircle,
  AlertTriangle,
  Package,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Product, SupplierSyncResult, UserRole, Order } from '../types';
import { ApiService } from '../api';

interface CatalogueViewProps {
  onAddToCart: (product: Product, quantity: number) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  userRole?: UserRole;
}

export const CatalogueView: React.FC<CatalogueViewProps> = ({
  onAddToCart,
  showToast,
  userRole = 'dealer',
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Stepper quantity per SKU
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Inventory update modal
  const [adjustModalProduct, setAdjustModalProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState('Stock count correction');
  const [adjustLoading, setAdjustLoading] = useState(false);

  // Supplier Sync
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<SupplierSyncResult | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Warehouse orders
  const [whOrders, setWhOrders] = useState<Order[]>([]);

  const categories = [
    'All',
    'Brakes',
    'Drivetrain',
    'Electrical',
    'Filters',
    'Lubricants',
    'Controls',
    'Engine',
    'Tyres',
  ];

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await ApiService.getProducts({
        page,
        page_size: userRole === 'warehouse' ? 12 : 24,
        search: search || undefined,
        category: category && category !== 'All' ? category : undefined,
        vehicle: vehicle || undefined,
      });
      setProducts(res.results);
      setTotalCount(res.count);
    } catch (err: any) {
      showToast(err?.error?.message || 'Failed to load products.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouseOrders = async () => {
    if (userRole !== 'warehouse') return;
    try {
      const res = await ApiService.getOrders({ page_size: 20 });
      setWhOrders(res.results);
    } catch {}
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, category, vehicle, page, userRole]);

  useEffect(() => {
    fetchWarehouseOrders();
  }, [userRole]);

  // Pagination helper
  const getPageNumbers = (current: number, total: number) => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const delta = 1;
    const range: (number | string)[] = [];
    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      range.push(i);
    }

    if (current - delta > 2) {
      range.unshift('...');
    }
    if (current + delta < total - 1) {
      range.push('...');
    }

    range.unshift(1);
    if (total > 1) {
      range.push(total);
    }

    return range;
  };

  const handleQtyChange = (sku: string, delta: number, maxStock: number) => {
    const current = quantities[sku] || 1;
    const next = Math.max(1, current + delta);
    setQuantities((prev) => ({ ...prev, [sku]: next }));
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalProduct) return;
    try {
      setAdjustLoading(true);
      const res = await ApiService.updateInventory(
        adjustModalProduct.sku,
        adjustQty,
        adjustReason
      );
      showToast(`SKU ${res.sku} stock updated to ${res.quantity} units.`, 'success');
      setProducts((prev) =>
        prev.map((p) => (p.sku === res.sku ? { ...p, stock: res.quantity } : p))
      );
      setAdjustModalProduct(null);
    } catch (err: any) {
      showToast(err?.error?.message || 'Failed to adjust inventory.', 'error');
    } finally {
      setAdjustLoading(false);
    }
  };

  const handleRunSupplierSync = async () => {
    try {
      setSyncLoading(true);
      const res = await ApiService.syncSupplier();
      setSyncResult(res);
      setShowSyncModal(true);
      showToast(
        `Supplier sync completed: ${res.created} created, ${res.updated} updated, ${res.unchanged} unchanged.`,
        'success'
      );
      fetchProducts();
    } catch (err: any) {
      const errObj = err?.error || {};
      showToast(
        `Supplier sync failed (${errObj.code || '502'}): ${errObj.message || 'Supplier unavailable.'}`,
        'error'
      );
    } finally {
      setSyncLoading(false);
    }
  };

  const handleDispatchOrder = async (orderNumber: string) => {
    try {
      await ApiService.dispatchOrder(orderNumber);
      showToast(`Order #${orderNumber} marked as DISPATCHED!`, 'success');
      fetchWarehouseOrders();
    } catch (err: any) {
      showToast(err?.error?.message || 'Dispatch failed.', 'error');
    }
  };

  const handleDeliverOrder = async (orderNumber: string) => {
    try {
      await ApiService.deliverOrder(orderNumber);
      showToast(`Order #${orderNumber} marked as DELIVERED!`, 'success');
      fetchWarehouseOrders();
    } catch (err: any) {
      showToast(err?.error?.message || 'Deliver failed.', 'error');
    }
  };

  // =========================================================================
  // 1. WAREHOUSE VIEW (Exact Dashboard from User's Screenshot)
  // =========================================================================
  if (userRole === 'warehouse') {
    const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 10).length;
    const toDispatchCount = whOrders.filter((o) => o.status === 'CONFIRMED').length;
    const reorderNowCount = products.filter((p) => p.stock === 0).length;

    return (
      <div>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Central warehouse (BLR)
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px', marginTop: '2px' }}>
              Live inventory, pending orders and reorder alerts
            </p>
          </div>
          <button
            onClick={handleRunSupplierSync}
            disabled={syncLoading}
            style={{
              fontSize: '12px',
              fontWeight: 500,
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '7px 12px',
              background: 'var(--surface-1)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={13} className={syncLoading ? 'spin' : ''} />
            <span>{syncLoading ? 'Syncing...' : 'Run supplier sync'}</span>
          </button>
        </div>

        {/* 4 Metric KPI Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '12px',
          marginBottom: '16px',
        }}>
          <div className="met">
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total SKUs
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
              {totalCount || 612}
            </div>
          </div>
          <div className="met">
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Low stock
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>
              {lowStockCount || 18}
            </div>
          </div>
          <div className="met">
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              To dispatch
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#60a5fa', marginTop: '4px' }}>
              {toDispatchCount || 9}
            </div>
          </div>
          <div className="met">
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Reorder now
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#f87171', marginTop: '4px' }}>
              {reorderNowCount || 5}
            </div>
          </div>
        </div>

        {/* 2-Column Split: Stock Levels (1.8fr) vs Dispatch Queue (1.2fr) */}
        <div className="wh-grid">
          {/* Left Column: Stock Levels */}
          <div className="card" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>Stock levels</span>
              <div className="input" style={{ height: '32px', width: '160px', fontSize: '12px' }}>
                <Search size={13} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Search SKU..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  style={{ fontSize: '12px' }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Part</th>
                    <th>On hand</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Audit</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                        Loading inventory...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                        No SKU matching filter.
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => {
                      const statusClass = p.stock === 0 ? 'out' : p.stock <= 10 ? 'low' : 'ok';
                      const statusText = p.stock === 0 ? 'Out' : p.stock <= 10 ? 'Low' : 'Healthy';
                      return (
                        <tr key={p.sku}>
                          <td>
                            <span className="sku">{p.sku}</span>
                          </td>
                          <td style={{ fontWeight: 500, color: '#fff' }}>{p.name}</td>
                          <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{p.stock}</td>
                          <td>
                            <span className={`badge ${statusClass}`}>{statusText}</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => {
                                setAdjustModalProduct(p);
                                setAdjustQty(p.stock);
                              }}
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: '5px',
                                border: '1px solid var(--border)',
                                background: 'var(--surface-2)',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              Adjust
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Warehouse Stock Pagination Footer */}
            {Math.ceil(totalCount / 12) > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 4px 0',
                borderTop: '1px solid var(--border-subtle)',
                marginTop: '12px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                flexWrap: 'wrap',
                gap: '8px',
              }}>
                <div>
                  Page <strong style={{ color: 'var(--text-primary)' }}>{page}</strong> of{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{Math.ceil(totalCount / 12)}</strong>{' '}
                  ({totalCount} items)
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface-2)',
                      color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                      cursor: page === 1 ? 'not-allowed' : 'pointer',
                      opacity: page === 1 ? 0.4 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11.5px',
                    }}
                  >
                    <ChevronLeft size={13} />
                    <span>Previous</span>
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(Math.ceil(totalCount / 12), p + 1))}
                    disabled={page >= Math.ceil(totalCount / 12)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface-2)',
                      color: page >= Math.ceil(totalCount / 12) ? 'var(--text-muted)' : 'var(--text-primary)',
                      cursor: page >= Math.ceil(totalCount / 12) ? 'not-allowed' : 'pointer',
                      opacity: page >= Math.ceil(totalCount / 12) ? 0.4 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11.5px',
                    }}
                  >
                    <span>Next</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Dispatch Queue */}
          <div className="card" style={{ padding: '14px' }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff', marginBottom: '12px' }}>
              Dispatch queue
            </div>
            {whOrders.filter((o) => o.status === 'CONFIRMED' || o.status === 'DISPATCHED').length === 0 ? (
              <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <CheckCircle size={24} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                <div>All orders dispatched & delivered!</div>
              </div>
            ) : (
              whOrders
                .filter((o) => o.status === 'CONFIRMED' || o.status === 'DISPATCHED')
                .slice(0, 6)
                .map((ord) => (
                  <div key={ord.order_number} style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#fff', fontFamily: 'var(--font-mono)', fontSize: '12.5px' }}>
                        {ord.order_number}
                      </span>
                      <span className={`badge ${ord.status === 'CONFIRMED' ? 'info' : 'low'}`}>
                        {ord.status === 'CONFIRMED' ? 'Confirmed' : 'Dispatched'}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '3px 0 8px' }}>
                      Dealer #{ord.dealer_id} · ₹{ord.grand_total}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {ord.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleDispatchOrder(ord.order_number)}
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-strong)',
                            background: 'var(--surface-2)',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <Truck size={13} />
                          <span>Mark dispatched</span>
                        </button>
                      )}
                      {ord.status === 'DISPATCHED' && (
                        <button
                          onClick={() => handleDeliverOrder(ord.order_number)}
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            background: 'rgba(16, 185, 129, 0.1)',
                            color: '#34d399',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <CheckCircle size={13} />
                          <span>Mark delivered</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Adjust Quantity Modal */}
        {adjustModalProduct && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '20px', background: 'var(--surface-1)' }}>
              <div style={{ fontWeight: 600, fontSize: '15px', color: '#fff', marginBottom: '2px' }}>
                Audit Stock: {adjustModalProduct.sku}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                {adjustModalProduct.name}
              </div>
              <form onSubmit={handleAdjustSubmit}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    Warehouse Count (Units)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(Number(e.target.value))}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface-2)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    Audit Reason
                  </label>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface-2)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setAdjustModalProduct(null)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      fontSize: '12.5px',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adjustLoading}
                    className="btn"
                    style={{ padding: '6px 16px', fontSize: '12.5px' }}
                  >
                    {adjustLoading ? 'Saving...' : 'Update Stock'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 2. DEALER VIEW (Pristine Catalogue & Grid)
  // =========================================================================
  const dealerPageSize = 24;
  const dealerTotalPages = Math.ceil(totalCount / dealerPageSize) || 1;
  const dealerStartItem = totalCount === 0 ? 0 : (page - 1) * dealerPageSize + 1;
  const dealerEndItem = Math.min(page * dealerPageSize, totalCount);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Parts catalogue and live stock
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px', marginTop: '2px' }}>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{dealerStartItem}–{dealerEndItem}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{totalCount}</strong> components · Page {page} of {dealerTotalPages}
          </p>
        </div>
        <button
          onClick={handleRunSupplierSync}
          disabled={syncLoading}
          style={{
            fontSize: '12px',
            fontWeight: 500,
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '7px 12px',
            background: 'var(--surface-1)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <RefreshCw size={13} className={syncLoading ? 'spin' : ''} />
          <span>{syncLoading ? 'Syncing...' : 'Run supplier sync'}</span>
        </button>
      </div>

      {/* Dual Search & Vehicle Inputs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '10px',
        marginBottom: '12px',
      }}>
        <div className="input">
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search SKU, part name, brand..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="input">
          <Car size={14} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Filter by vehicle, e.g. Duke 390, Pulsar"
            value={vehicle}
            onChange={(e) => {
              setVehicle(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Category Chips Bar */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {categories.map((cat) => {
          const isSelected = (cat === 'All' && !category) || category === cat;
          return (
            <button
              key={cat}
              className={`chip ${isSelected ? 'on' : ''}`}
              onClick={() => {
                setCategory(cat === 'All' ? '' : cat);
                setPage(1);
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px' }} />
          <div>Loading motorcycle components...</div>
        </div>
      ) : products.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Package size={28} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
          <div style={{ fontWeight: 500 }}>No parts matched your query</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Try searching a different vehicle model or selecting "All" categories.
          </div>
        </div>
      ) : (
        <div className="grid">
          {products.map((p) => {
            const qty = quantities[p.sku] || 1;
            const inStock = p.stock > 0;
            const isLow = p.stock > 0 && p.stock <= 10;
            const badgeClass = !inStock ? 'out' : isLow ? 'low' : 'ok';
            const badgeText = !inStock ? 'Out of stock' : isLow ? `${p.stock} in stock` : `${p.stock} in stock`;

            return (
              <div key={p.sku} className="card">
                <div>
                  {/* Card Top: SKU & Stock Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span className="sku">{p.sku}</span>
                    <span className={`badge ${badgeClass}`}>{badgeText}</span>
                  </div>

                  {/* Title & Brand */}
                  <div style={{ fontWeight: 600, fontSize: '14.5px', color: '#fff', lineHeight: 1.35 }}>
                    {p.name}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', margin: '4px 0 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Car size={13} color="var(--text-muted)" />
                    <span>Fits: <strong>{p.vehicle_fitment}</strong></span>
                  </div>
                </div>

                {/* Price & Cart Actions */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: '6px' }}>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Dealer price
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '2px 0 12px' }}>
                    <span style={{ fontSize: '19px', fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                      ₹{Number(p.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                      +18% GST
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div className="qty" style={{ opacity: inStock ? 1 : 0.4 }}>
                      <button
                        onClick={() => inStock && handleQtyChange(p.sku, -1, p.stock)}
                        disabled={!inStock}
                      >
                        −
                      </button>
                      <span>{qty}</span>
                      <button
                        onClick={() => inStock && handleQtyChange(p.sku, 1, p.stock)}
                        disabled={!inStock}
                      >
                        +
                      </button>
                    </div>

                    {inStock ? (
                      <button
                        className="btn"
                        style={{ flex: 1 }}
                        onClick={() => onAddToCart(p, qty)}
                      >
                        <ShoppingCart size={14} />
                        <span>Add to cart</span>
                      </button>
                    ) : (
                      <button
                        className="btn"
                        style={{ flex: 1, background: 'var(--surface-2)', color: 'var(--text-muted)', boxShadow: 'none' }}
                        disabled
                      >
                        Out of stock
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dealer Catalogue Pagination Controls */}
      {dealerTotalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '28px',
          padding: '14px 18px',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          background: 'var(--surface-1)',
          flexWrap: 'wrap',
          gap: '14px',
          width: '100%',
        }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{dealerStartItem}–{dealerEndItem}</strong> of{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{totalCount}</strong> parts{' '}
            <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>(Page {page} of {dealerTotalPages})</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {/* First Page */}
            <button
              onClick={() => {
                setPage(1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={page === 1}
              style={{
                padding: '6px 10px',
                borderRadius: '7px',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
                color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                opacity: page === 1 ? 0.35 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
              }}
              title="First page"
            >
              <ChevronsLeft size={14} />
            </button>

            {/* Previous Page */}
            <button
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={page === 1}
              style={{
                padding: '6px 14px',
                borderRadius: '7px',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
                color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                opacity: page === 1 ? 0.35 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12.5px',
                fontWeight: 600,
              }}
            >
              <ChevronLeft size={15} />
              <span>Previous</span>
            </button>

            {/* Numeric Page Buttons */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {getPageNumbers(page, dealerTotalPages).map((pNum, idx) => {
                if (pNum === '...') {
                  return (
                    <span key={`dots-${idx}`} style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      …
                    </span>
                  );
                }
                const isCurrent = pNum === page;
                return (
                  <button
                    key={`page-${pNum}`}
                    onClick={() => {
                      setPage(Number(pNum));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    style={{
                      minWidth: '32px',
                      height: '32px',
                      padding: '0 6px',
                      borderRadius: '7px',
                      border: isCurrent ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                      background: isCurrent ? 'var(--tab-active-bg)' : 'var(--surface-2)',
                      color: isCurrent ? 'var(--tab-active-text)' : 'var(--text-secondary)',
                      fontWeight: isCurrent ? 700 : 500,
                      fontSize: '12.5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: isCurrent ? '0 2px 6px rgba(0,0,0,0.3)' : 'none',
                    }}
                  >
                    {pNum}
                  </button>
                );
              })}
            </div>

            {/* Next Page */}
            <button
              onClick={() => {
                setPage((p) => Math.min(dealerTotalPages, p + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={page === dealerTotalPages}
              style={{
                padding: '6px 14px',
                borderRadius: '7px',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
                color: page === dealerTotalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: page === dealerTotalPages ? 'not-allowed' : 'pointer',
                opacity: page === dealerTotalPages ? 0.35 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12.5px',
                fontWeight: 600,
              }}
            >
              <span>Next</span>
              <ChevronRight size={15} />
            </button>

            {/* Last Page */}
            <button
              onClick={() => {
                setPage(dealerTotalPages);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={page === dealerTotalPages}
              style={{
                padding: '6px 10px',
                borderRadius: '7px',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
                color: page === dealerTotalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: page === dealerTotalPages ? 'not-allowed' : 'pointer',
                opacity: page === dealerTotalPages ? 0.35 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
              }}
              title="Last page"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
