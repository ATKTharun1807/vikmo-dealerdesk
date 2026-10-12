import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Minus,
  ShoppingCart,
  RefreshCw,
  Edit3,
  CheckCircle,
  AlertTriangle,
  Info,
  Car,
  Tag,
  Boxes,
} from 'lucide-react';
import { Product, SupplierSyncResult, UserRole } from '../types';
import { ApiService } from '../api';

interface CatalogueViewProps {
  onAddToCart: (product: Product, quantity: number) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  userRole?: UserRole;
}

export const CatalogueView: React.FC<CatalogueViewProps> = ({ onAddToCart, showToast, userRole = 'dealer' }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Quantity stepper local state per product SKU
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Inventory update modal state
  const [adjustModalProduct, setAdjustModalProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState('Stock count correction');
  const [adjustLoading, setAdjustLoading] = useState(false);

  // Supplier Sync state
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<SupplierSyncResult | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);

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
        page_size: 20,
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

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, category, vehicle, page]);

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
      showToast(`Stock for ${res.sku} set to ${res.quantity} units.`, 'success');
      // Update local product list
      setProducts((prev) =>
        prev.map((p) => (p.sku === res.sku ? { ...p, stock: res.quantity } : p))
      );
      setAdjustModalProduct(null);
    } catch (err: any) {
      showToast(err?.error?.message || 'Failed to adjust stock.', 'error');
    } finally {
      setAdjustLoading(false);
    }
  };

  const handleRunSupplierSync = async () => {
    try {
      setSyncLoading(true);
      showToast('Initiating supplier catalogue sync... (this fetches paginated vendor feed)', 'info');
      const result = await ApiService.triggerSupplierSync();
      setSyncResult(result);
      setShowSyncModal(true);
      showToast(`Sync complete! ${result.created} created, ${result.updated} updated.`, 'success');
      fetchProducts();
    } catch (err: any) {
      showToast(err?.error?.message || 'Supplier sync failed or unavailable.', 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
      {/* Top Banner / Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            {userRole === 'warehouse' ? 'Warehouse Stock & Inventory Control' : 'Parts Catalogue & Live Stock'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            {userRole === 'warehouse'
              ? `Live warehouse stock management for ${totalCount} parts across South India. Audit counts and sync supplier catalogue.`
              : `Showing ${products.length} of ${totalCount} authentic motorcycle & car components with verified live warehouse quantities.`}
          </p>
        </div>

        {/* Sync Action - ONLY VISIBLE TO WAREHOUSE ROLE */}
        {userRole === 'warehouse' && (
          <button
            onClick={handleRunSupplierSync}
            disabled={syncLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              color: '#60a5fa',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              padding: '10px 18px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '0.88rem',
              opacity: syncLoading ? 0.7 : 1,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={17} className={syncLoading ? 'spin' : ''} />
            <span>{syncLoading ? 'Syncing Supplier API...' : 'Run Supplier Sync (Part B)'}</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="glass-panel" style={{ padding: '18px 20px', marginBottom: '24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          alignItems: 'center',
        }}>
          {/* Search Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--bg-surface)',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
          }}>
            <Search size={18} color="var(--text-dim)" />
            <input
              type="text"
              placeholder="Search SKU, part name, brand..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                width: '100%',
                fontSize: '0.9rem',
              }}
            />
          </div>

          {/* Vehicle Fitment Filter */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--bg-surface)',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
          }}>
            <Car size={18} color="var(--text-dim)" />
            <input
              type="text"
              placeholder="Filter by vehicle (e.g. Pulsar 150, Duke 390)"
              value={vehicle}
              onChange={(e) => {
                setVehicle(e.target.value);
                setPage(1);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                width: '100%',
                fontSize: '0.9rem',
              }}
            />
          </div>
        </div>

        {/* Category Pills */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          marginTop: '16px',
          paddingBottom: '4px',
        }}>
          {categories.map((cat) => {
            const isSelected = (cat === 'All' && !category) || category === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setCategory(cat === 'All' ? '' : cat);
                  setPage(1);
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
        }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-panel skeleton" style={{ height: '240px' }} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="glass-panel" style={{
          padding: '48px',
          textAlign: 'center',
          color: 'var(--text-muted)',
        }}>
          <Boxes size={48} color="var(--text-dim)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '8px' }}>No products found</h3>
          <p>Try clearing your search query or vehicle fitment filters.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
        }}>
          {products.map((p) => {
            const qty = quantities[p.sku] || 1;
            const inStock = p.stock > 0;
            const isLow = p.stock > 0 && p.stock <= 10;

            return (
              <div
                key={p.sku}
                className="glass-panel"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div>
                  {/* Card Header: Brand, SKU, Category */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {p.sku}
                      </span>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        backgroundColor: 'rgba(139, 92, 246, 0.12)',
                        color: '#a78bfa',
                        padding: '2px 8px',
                        borderRadius: '6px',
                      }}>
                        {p.brand}
                      </span>
                    </div>

                    {/* Stock Pill */}
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: !inStock ? 'rgba(239, 68, 68, 0.15)' : isLow ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: !inStock ? '#f87171' : isLow ? '#fbbf24' : '#34d399',
                      border: `1px solid ${!inStock ? 'rgba(239, 68, 68, 0.3)' : isLow ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                    }}>
                      {!inStock ? 'Out of Stock' : `${p.stock} in stock`}
                    </span>
                  </div>

                  {/* Title & Fitment */}
                  <h3 style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: '#fff',
                    marginTop: '10px',
                    lineHeight: 1.4,
                  }}>
                    {p.name}
                  </h3>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    marginTop: '6px',
                  }}>
                    <Car size={14} color="var(--text-dim)" />
                    <span>Fits: <strong>{p.vehicle_fitment}</strong></span>
                  </div>

                  {p.description && (
                    <p style={{
                      color: 'var(--text-dim)',
                      fontSize: '0.78rem',
                      marginTop: '8px',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {p.description}
                    </p>
                  )}
                </div>

                {/* Price, Stock Adjust & Add to Cart */}
                <div style={{
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '14px',
                  marginTop: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                        Dealer Price
                      </span>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)' }}>
                        ₹{Number(p.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '4px' }}>
                          +18% GST
                        </span>
                      </div>
                    </div>

                    {/* Stock Adjust button - ONLY VISIBLE TO WAREHOUSE ROLE */}
                    {userRole === 'warehouse' && (
                      <button
                        onClick={() => {
                          setAdjustModalProduct(p);
                          setAdjustQty(p.stock);
                        }}
                        title="Direct stock adjustment (PUT /api/inventory/{sku}/)"
                        style={{
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          color: '#60a5fa',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        <Edit3 size={12} />
                        <span>Adjust Qty</span>
                      </button>
                    )}
                  </div>

                  {/* Action Row: Dealer gets Add to Cart; Warehouse gets Stock Audit Level */}
                  {userRole === 'dealer' ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: 'var(--bg-surface)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                      }}>
                        <button
                          onClick={() => handleQtyChange(p.sku, -1, p.stock)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#fff',
                            padding: '8px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <Minus size={14} />
                        </button>
                        <span style={{
                          padding: '0 8px',
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                        }}>
                          {qty}
                        </span>
                        <button
                          onClick={() => handleQtyChange(p.sku, 1, p.stock)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#fff',
                            padding: '8px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <button
                        onClick={() => onAddToCart(p, qty)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          backgroundColor: 'var(--primary)',
                          color: '#000',
                          border: 'none',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          boxShadow: 'var(--shadow-sm)',
                          cursor: 'pointer',
                        }}
                      >
                        <ShoppingCart size={16} />
                        <span>Add to Cart</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                    }}>
                      <span style={{ color: 'var(--text-muted)' }}>Warehouse Live Count:</span>
                      <span style={{
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: p.stock > 10 ? '#34d399' : p.stock > 0 ? '#fbbf24' : '#f87171',
                      }}>
                        {p.stock > 0 ? `${p.stock} Units In Stock` : '0 Units (Depleted)'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '32px',
        padding: '16px 20px',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
      }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Page {page} of {Math.ceil(totalCount / 20) || 1}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'transparent',
              color: page === 1 ? 'var(--text-dim)' : '#fff',
              fontSize: '0.85rem',
            }}
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(totalCount / 20)}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'transparent',
              color: page >= Math.ceil(totalCount / 20) ? 'var(--text-dim)' : '#fff',
              fontSize: '0.85rem',
            }}
          >
            Next
          </button>
        </div>
      </div>

      {/* Stock Adjust Modal */}
      {adjustModalProduct && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '20px',
        }}>
          <div className="glass-panel" style={{
            maxWidth: '460px',
            width: '100%',
            padding: '24px',
            backgroundColor: '#111827',
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
              Update Stock: {adjustModalProduct.sku}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Testing contract endpoint: <code>PUT /api/inventory/{'{sku}'}/</code>. Sets available stock directly without modifying historical orders.
            </p>

            <form onSubmit={handleAdjustSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>
                  Target Available Stock Quantity (&ge; 0)
                </label>
                <input
                  type="number"
                  min="0"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#fff',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1rem',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>
                  Audit Reason
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#fff',
                    fontSize: '0.88rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAdjustModalProduct(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustLoading}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--primary)',
                    color: '#000',
                    border: 'none',
                    fontWeight: 700,
                  }}
                >
                  {adjustLoading ? 'Updating...' : 'Save Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Sync Results Modal */}
      {showSyncModal && syncResult && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '20px',
        }}>
          <div className="glass-panel" style={{
            maxWidth: '520px',
            width: '100%',
            padding: '24px',
            backgroundColor: '#111827',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <CheckCircle size={24} color="#10b981" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                Supplier Sync Summary (Part B)
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Supplier feed fetched across paginated cursors with duplicate resolution and automatic retry handling:
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '20px',
            }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#34d399', textTransform: 'uppercase' }}>Created</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399' }}>{syncResult.created}</div>
              </div>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#60a5fa', textTransform: 'uppercase' }}>Updated</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#60a5fa' }}>{syncResult.updated}</div>
              </div>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#fbbf24', textTransform: 'uppercase' }}>Unchanged</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>{syncResult.unchanged}</div>
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--bg-surface)',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>Pages Fetched: <strong>{syncResult.pages_fetched}</strong></span>
              <span>HTTP Requests Made: <strong>{syncResult.requests_made}</strong></span>
              <span>Rejected Items: <strong>{syncResult.rejected.length}</strong></span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSyncModal(false)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--primary)',
                  color: '#000',
                  border: 'none',
                  fontWeight: 700,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
