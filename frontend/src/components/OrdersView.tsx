import React, { useState, useEffect } from 'react';
import {
  FileText,
  Filter,
  Eye,
  CheckCircle,
  Truck,
  CheckCheck,
  XCircle,
  Clock,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { ApiService } from '../api';

interface OrdersViewProps {
  selectedOrderNumber?: string | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  selectedOrderNumber,
  showToast,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await ApiService.getOrders({
        status: statusFilter || undefined,
        page_size: 50,
      });
      setOrders(res.results);

      // If an order number was passed, auto-select it
      if (selectedOrderNumber) {
        const found = res.results.find((o) => o.order_number === selectedOrderNumber);
        if (found) {
          setCurrentOrder(found);
        } else {
          // Fetch directly
          try {
            const single = await ApiService.getOrder(selectedOrderNumber);
            setCurrentOrder(single);
          } catch {}
        }
      }
    } catch (err: any) {
      showToast(err?.error?.message || 'Failed to load orders.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, selectedOrderNumber]);

  const handleAction = async (action: 'confirm' | 'dispatch' | 'deliver' | 'cancel') => {
    if (!currentOrder) return;
    try {
      setActionLoading(true);
      let updated: Order;
      if (action === 'confirm') {
        updated = await ApiService.confirmOrder(currentOrder.order_number);
        showToast(`Order #${updated.order_number} CONFIRMED! Inventory deducted.`, 'success');
      } else if (action === 'dispatch') {
        updated = await ApiService.dispatchOrder(currentOrder.order_number);
        showToast(`Order #${updated.order_number} DISPATCHED!`, 'success');
      } else if (action === 'deliver') {
        updated = await ApiService.deliverOrder(currentOrder.order_number);
        showToast(`Order #${updated.order_number} DELIVERED! Complete.`, 'success');
      } else {
        updated = await ApiService.cancelOrder(currentOrder.order_number);
        showToast(`Order #${updated.order_number} CANCELLED. (Stock restored if was confirmed)`, 'info');
      }

      setCurrentOrder(updated);
      setOrders((prev) => prev.map((o) => (o.order_number === updated.order_number ? updated : o)));
    } catch (err: any) {
      const errObj = err?.error || {};
      showToast(errObj.message || `Action failed: ${errObj.code || 'Error'}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const statuses = ['All', 'DRAFT', 'CONFIRMED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'];

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
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
            Orders & GST Engine
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Auditable lifecycle management with per-line 18% GST (ROUND_HALF_UP) and state transition enforcement.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-surface)',
            color: '#fff',
            border: '1px solid var(--border-color)',
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '0.85rem',
          }}
        >
          <RefreshCw size={15} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto' }}>
        {statuses.map((st) => {
          const isSelected = (st === 'All' && !statusFilter) || statusFilter === st;
          return (
            <button
              key={st}
              onClick={() => setStatusFilter(st === 'All' ? '' : st)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-surface)',
                color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
              }}
            >
              {st}
            </button>
          );
        })}
      </div>

      {/* Main Grid: Orders List & Detail Pane */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: currentOrder ? '1fr 1.2fr' : '1fr',
        gap: '24px',
        alignItems: 'start',
      }}>
        {/* Table of Orders */}
        <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: '54px' }} />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <FileText size={40} color="var(--text-dim)" style={{ margin: '0 auto 12px' }} />
              <h3>No orders found</h3>
              <p style={{ fontSize: '0.85rem' }}>Create draft orders from the Cart tab.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ color: 'var(--text-dim)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ paddingBottom: '10px' }}>Order #</th>
                  <th style={{ paddingBottom: '10px' }}>Dealer ID</th>
                  <th style={{ paddingBottom: '10px' }}>Status</th>
                  <th style={{ paddingBottom: '10px', textAlign: 'right' }}>Total (₹)</th>
                  <th style={{ paddingBottom: '10px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord) => {
                  const isSelected = currentOrder?.order_number === ord.order_number;
                  return (
                    <tr
                      key={ord.order_number}
                      onClick={() => setCurrentOrder(ord)}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <td style={{ padding: '12px 6px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff' }}>
                        {ord.order_number}
                      </td>
                      <td style={{ padding: '12px 6px', color: 'var(--text-muted)' }}>
                        Dealer #{ord.dealer_id}
                      </td>
                      <td style={{ padding: '12px 6px' }}>
                        <span className={`badge badge-${ord.status.toLowerCase()}`}>
                          {ord.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                        ₹{ord.grand_total}
                      </td>
                      <td style={{ padding: '12px 6px', textAlign: 'center' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentOrder(ord);
                          }}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-muted)',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Selected Order Detail Pane */}
        {currentOrder && (
          <div className="glass-panel" style={{ padding: '24px', backgroundColor: '#111827' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Order Details
                </span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                  {currentOrder.order_number}
                </h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Created: {new Date(currentOrder.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)
                </div>
              </div>

              <span className={`badge badge-${currentOrder.status.toLowerCase()}`} style={{ fontSize: '0.85rem', padding: '4px 12px' }}>
                {currentOrder.status}
              </span>
            </div>

            {/* Lifecycle Progress Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-surface)',
              padding: '14px 18px',
              borderRadius: '12px',
              marginBottom: '20px',
            }}>
              {['DRAFT', 'CONFIRMED', 'DISPATCHED', 'DELIVERED'].map((step, idx) => {
                const stepOrder = ['DRAFT', 'CONFIRMED', 'DISPATCHED', 'DELIVERED'];
                const currentIndex = stepOrder.indexOf(currentOrder.status);
                const isPassed = currentOrder.status !== 'CANCELLED' && currentIndex >= idx;
                const isCurrent = currentOrder.status === step;

                return (
                  <React.Fragment key={step}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: isPassed ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                        color: isPassed ? '#000' : 'var(--text-dim)',
                        border: isCurrent ? '2px solid #fff' : 'none',
                      }}>
                        {idx + 1}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: isPassed ? '#fff' : 'var(--text-dim)', fontWeight: isCurrent ? 700 : 500 }}>
                        {step}
                      </span>
                    </div>
                    {idx < 3 && (
                      <div style={{
                        flex: 1,
                        height: '2px',
                        backgroundColor: currentIndex > idx && currentOrder.status !== 'CANCELLED' ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                        margin: '0 8px',
                        marginBottom: '16px',
                      }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Per-line GST Item Table */}
            <div style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.04em' }}>
                Itemized GST Breakdown (§7.4 Exact to the Paisa)
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ color: 'var(--text-dim)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ paddingBottom: '8px' }}>SKU / Product</th>
                    <th style={{ paddingBottom: '8px', textAlign: 'center' }}>Qty</th>
                    <th style={{ paddingBottom: '8px', textAlign: 'right' }}>Price</th>
                    <th style={{ paddingBottom: '8px', textAlign: 'right' }}>Subtotal</th>
                    <th style={{ paddingBottom: '8px', textAlign: 'right' }}>18% Tax</th>
                    <th style={{ paddingBottom: '8px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {currentOrder.items.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 0' }}>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{it.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{it.sku}</div>
                      </td>
                      <td style={{ padding: '10px 0', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{it.quantity}</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>₹{it.unit_price}</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>₹{it.line_subtotal}</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#10b981' }}>₹{it.line_tax}</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                        ₹{it.line_total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Order Totals Summary */}
              <div style={{
                marginTop: '16px',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '0.88rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Order Subtotal:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#fff' }}>₹{currentOrder.subtotal}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>GST Total (Per-Line Quantized):</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#10b981' }}>₹{currentOrder.tax_total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                  <span style={{ fontWeight: 800, color: '#fff' }}>Grand Total:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                    ₹{currentOrder.grand_total}
                  </span>
                </div>
              </div>
            </div>

            {/* Allowed State Machine Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {currentOrder.status === 'DRAFT' && (
                <>
                  <button
                    onClick={() => handleAction('confirm')}
                    disabled={actionLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: 'var(--primary)',
                      color: '#000',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                    }}
                  >
                    <ShieldCheck size={16} />
                    <span>Confirm Order</span>
                  </button>
                  <button
                    onClick={() => handleAction('cancel')}
                    disabled={actionLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                    }}
                  >
                    <XCircle size={16} />
                    <span>Cancel Draft</span>
                  </button>
                </>
              )}

              {currentOrder.status === 'CONFIRMED' && (
                <>
                  <button
                    onClick={() => handleAction('dispatch')}
                    disabled={actionLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                    }}
                  >
                    <Truck size={16} />
                    <span>Dispatch Order</span>
                  </button>
                  <button
                    onClick={() => handleAction('cancel')}
                    disabled={actionLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                    }}
                  >
                    <XCircle size={16} />
                    <span>Cancel & Restore Stock</span>
                  </button>
                </>
              )}

              {currentOrder.status === 'DISPATCHED' && (
                <button
                  onClick={() => handleAction('deliver')}
                  disabled={actionLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#10b981',
                    color: '#000',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                  }}
                >
                  <CheckCheck size={16} />
                  <span>Mark as Delivered</span>
                </button>
              )}

              {(currentOrder.status === 'DELIVERED' || currentOrder.status === 'CANCELLED') && (
                <div style={{
                  color: 'var(--text-dim)',
                  fontSize: '0.82rem',
                  fontStyle: 'italic',
                  padding: '8px',
                }}>
                  This order is in terminal state ({currentOrder.status}). Further status transitions are rejected.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
