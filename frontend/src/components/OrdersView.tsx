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
import { Order, OrderStatus, UserRole } from '../types';
import { ApiService } from '../api';

interface OrdersViewProps {
  selectedOrderNumber?: string | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  userRole?: UserRole;
  activeDealerId?: number;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  selectedOrderNumber,
  showToast,
  userRole = 'dealer',
  activeDealerId,
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
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '14px',
      }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Orders and GST invoices
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '12.5px', marginTop: '2px' }}>
            Distributor Fulfillment Console: Review dealer draft orders, confirm stock allocations, dispatch shipments, and track deliveries.
          </div>
        </div>

        <button
          onClick={fetchOrders}
          style={{
            fontSize: '12px',
            border: '0.5px solid var(--border-strong)',
            borderRadius: '8px',
            padding: '6px 12px',
            background: 'transparent',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <i className="ti ti-refresh" aria-hidden="true"></i>
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto', flexWrap: 'wrap' }}>
        {statuses.map((st) => {
          const isSelected = (st === 'All' && !statusFilter) || statusFilter === st;
          return (
            <button
              key={st}
              className={`chip ${isSelected ? 'on' : ''}`}
              onClick={() => setStatusFilter(st === 'All' ? '' : st)}
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
        <div className="card" style={{ padding: '12px', overflowX: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ height: '40px', background: 'var(--surface-1)', borderRadius: '6px' }} />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <i className="ti ti-file-invoice" style={{ fontSize: '32px', display: 'block', margin: '0 auto 8px' }}></i>
              <div style={{ fontWeight: 500 }}>No orders found</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Create draft orders from the Cart tab.</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Dealer ID</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Total (₹)</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord) => {
                  const isSelected = currentOrder?.order_number === ord.order_number;
                  const badgeClass =
                    ord.status === 'DELIVERED' ? 'ok' :
                    ord.status === 'CONFIRMED' ? 'info' :
                    ord.status === 'CANCELLED' ? 'out' : 'low';

                  return (
                    <tr
                      key={ord.order_number}
                      onClick={() => setCurrentOrder(ord)}
                      style={{
                        backgroundColor: isSelected ? 'var(--surface-1)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <td className="sku" style={{ background: 'none' }}>
                        {ord.order_number}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        Dealer #{ord.dealer_id}
                      </td>
                      <td>
                        <span className={`badge ${badgeClass}`}>
                          {ord.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>
                        ₹{ord.grand_total}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentOrder(ord);
                          }}
                          style={{
                            background: 'transparent',
                            border: '0.5px solid var(--border-strong)',
                            color: 'var(--text-secondary)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                          }}
                        >
                          View
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
          <div className="card" style={{ padding: '16px', background: 'var(--surface-2)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Order Details
                </span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
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
              backgroundColor: 'var(--surface-1)',
              padding: '14px 18px',
              borderRadius: '12px',
              marginBottom: '20px',
              border: '1px solid var(--border)',
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
                        backgroundColor: isPassed ? 'var(--primary)' : 'var(--surface-2)',
                        color: isPassed ? '#fff' : 'var(--text-dim)',
                        border: isCurrent ? '2px solid var(--primary)' : 'none',
                      }}>
                        {idx + 1}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: isPassed ? 'var(--text-primary)' : 'var(--text-dim)', fontWeight: isCurrent ? 700 : 500 }}>
                        {step}
                      </span>
                    </div>
                    {idx < 3 && (
                      <div style={{
                        flex: 1,
                        height: '2px',
                        backgroundColor: currentIndex > idx && currentOrder.status !== 'CANCELLED' ? 'var(--primary)' : 'var(--border)',
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
              backgroundColor: 'var(--surface-1)',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '20px',
              border: '1px solid var(--border)',
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
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 0' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{it.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{it.sku}</div>
                      </td>
                      <td style={{ padding: '10px 0', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{it.quantity}</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>₹{it.unit_price}</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>₹{it.line_subtotal}</td>
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
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>₹{currentOrder.subtotal}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>GST Total (Per-Line Quantized):</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#10b981' }}>₹{currentOrder.tax_total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                  <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Grand Total:</span>
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
                      cursor: 'pointer',
                    }}
                  >
                    <Truck size={16} />
                    <span>Dispatch Shipment</span>
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
                      cursor: 'pointer',
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
                    cursor: 'pointer',
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
