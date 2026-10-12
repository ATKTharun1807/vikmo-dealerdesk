import React, { useState } from 'react';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  FileText,
  Key,
  RefreshCw,
} from 'lucide-react';
import { CartItem, Dealer, Order } from '../types';
import { ApiService } from '../api';

interface CartCheckoutViewProps {
  cart: CartItem[];
  onUpdateQty: (sku: string, delta: number) => void;
  onRemoveItem: (sku: string) => void;
  onClearCart: () => void;
  selectedDealer: Dealer | undefined;
  onOrderCreated: (order: Order) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onViewOrder: (orderNumber: string) => void;
}

export const CartCheckoutView: React.FC<CartCheckoutViewProps> = ({
  cart,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  selectedDealer,
  onOrderCreated,
  showToast,
  onViewOrder,
}) => {
  const [submittingDraft, setSubmittingDraft] = useState(false);
  const [confirmingOrder, setConfirmingOrder] = useState(false);
  const [createdDraft, setCreatedDraft] = useState<Order | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [stockError, setStockError] = useState<{
    message: string;
    details: Array<{ sku: string; requested: number; available: number }>;
  } | null>(null);

  // Exact per-line 18% GST preview (rounded half up to paisa)
  const calculateTotals = () => {
    let subtotalCents = 0;
    let taxTotalCents = 0;

    const lineCalculations = cart.map((item) => {
      const priceCents = Math.round(parseFloat(item.product.price) * 100);
      const lineSubtotalCents = priceCents * item.quantity;
      // 18% tax ROUND_HALF_UP to paisa
      const lineTaxCents = Math.round(lineSubtotalCents * 0.18);
      const lineTotalCents = lineSubtotalCents + lineTaxCents;

      subtotalCents += lineSubtotalCents;
      taxTotalCents += lineTaxCents;

      return {
        sku: item.product.sku,
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: (priceCents / 100).toFixed(2),
        subtotal: (lineSubtotalCents / 100).toFixed(2),
        tax: (lineTaxCents / 100).toFixed(2),
        total: (lineTotalCents / 100).toFixed(2),
      };
    });

    const grandTotalCents = subtotalCents + taxTotalCents;

    return {
      lines: lineCalculations,
      subtotal: (subtotalCents / 100).toFixed(2),
      taxTotal: (taxTotalCents / 100).toFixed(2),
      grandTotal: (grandTotalCents / 100).toFixed(2),
    };
  };

  const totals = calculateTotals();

  const handleGenerateKey = () => {
    const randomKey = `idem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setIdempotencyKey(randomKey);
  };

  const handleCreateDraft = async () => {
    if (!selectedDealer) {
      showToast('Please select a dealer first.', 'error');
      return;
    }
    if (cart.length === 0) {
      showToast('Cart is empty.', 'error');
      return;
    }

    try {
      setSubmittingDraft(true);
      setStockError(null);
      const itemsPayload = cart.map((i) => ({ sku: i.product.sku, quantity: i.quantity }));
      const order = await ApiService.createOrder(
        selectedDealer.id,
        itemsPayload,
        idempotencyKey.trim() || undefined
      );

      setCreatedDraft(order);
      onOrderCreated(order);
      onClearCart();
      showToast(`DRAFT Order #${order.order_number} created successfully! Cart converted to draft.`, 'success');
    } catch (err: any) {
      const errObj = err?.error || {};
      showToast(errObj.message || 'Failed to create order.', 'error');
    } finally {
      setSubmittingDraft(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!createdDraft) return;
    try {
      setConfirmingOrder(true);
      setStockError(null);
      const confirmed = await ApiService.confirmOrder(createdDraft.order_number);
      setCreatedDraft(confirmed);
      onOrderCreated(confirmed);
      onClearCart();
      showToast(`Order #${confirmed.order_number} CONFIRMED! Stock locked.`, 'success');
    } catch (err: any) {
      const errObj = err?.error || {};
      if (errObj.code === 'INSUFFICIENT_STOCK') {
        setStockError({
          message: errObj.message || 'Insufficient stock for one or more items.',
          details: errObj.details || [],
        });
        showToast('Confirmation rejected: Insufficient stock (all-or-nothing rollback).', 'error');
      } else {
        showToast(errObj.message || 'Failed to confirm order.', 'error');
      }
    } finally {
      setConfirmingOrder(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '18px', fontWeight: 500 }}>Cart and order checkout</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>
          Cart → Draft (zero stock locked) → Confirm (PostgreSQL row-level locking, exact 18% GST).
        </div>
      </div>

      {/* Stock Shortage Banner (409 INSUFFICIENT_STOCK) */}
      {stockError && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '12px',
          padding: '18px 20px',
          marginBottom: '24px',
          display: 'flex',
          gap: '14px',
          alignItems: 'flex-start',
        }}>
          <AlertTriangle size={24} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                backgroundColor: 'rgba(239, 68, 68, 0.25)',
                color: '#fca5a5',
                padding: '2px 8px',
                borderRadius: '4px',
                fontFamily: 'var(--font-mono)',
              }}>
                409 INSUFFICIENT_STOCK
              </span>
              <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700 }}>Stock Shortage Detected</h4>
            </div>
            <p style={{ color: '#fca5a5', fontSize: '0.88rem', marginTop: '6px' }}>
              {stockError.message}
            </p>

            {stockError.details && stockError.details.length > 0 && (
              <div style={{
                marginTop: '12px',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                padding: '12px',
                borderRadius: '8px',
              }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Contract Shortage Breakdown:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                  {stockError.details.map((item, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.85rem',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      <span style={{ color: '#fff' }}>SKU: {item.sku}</span>
                      <span style={{ color: '#f87171' }}>
                        Requested: <strong>{item.requested}</strong> | Available: <strong>{item.available}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Items vs Summary */}
      <div className="cart-layout-grid">
        {/* Left Column: Cart Items or Created Draft Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {createdDraft ? (
            <div className="glass-panel" style={{ padding: '24px', backgroundColor: '#111827' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={22} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                    {createdDraft.order_number}
                  </h3>
                </div>
                <span className={`badge badge-${createdDraft.status.toLowerCase()}`}>
                  {createdDraft.status}
                </span>
              </div>

              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                {createdDraft.status === 'DRAFT'
                  ? 'This order is currently a DRAFT. Inventory is untouched until confirmed. Confirming will verify live stock with zero-oversell row locking.'
                  : `Order is now ${createdDraft.status}. Inventory quantities have been updated.`}
              </p>

              {/* Items List in Draft */}
              <div style={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '20px',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-dim)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ paddingBottom: '8px' }}>SKU / Item</th>
                      <th style={{ paddingBottom: '8px', textAlign: 'center' }}>Qty</th>
                      <th style={{ paddingBottom: '8px', textAlign: 'right' }}>Unit Price</th>
                      <th style={{ paddingBottom: '8px', textAlign: 'right' }}>Line Total (inc GST)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {createdDraft.items.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '10px 0' }}>
                          <div style={{ fontWeight: 600, color: '#fff' }}>{item.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{item.sku}</div>
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{item.quantity}</td>
                        <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>₹{item.unit_price}</td>
                        <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                          ₹{item.line_total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions for Draft */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                {createdDraft.status === 'DRAFT' && (
                  <button
                    onClick={handleConfirmOrder}
                    disabled={confirmingOrder}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: 'var(--primary)',
                      color: '#000',
                      border: 'none',
                      padding: '12px 22px',
                      borderRadius: '10px',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      opacity: confirmingOrder ? 0.7 : 1,
                    }}
                  >
                    <ShieldCheck size={18} />
                    <span>{confirmingOrder ? 'Locking Stock & Confirming...' : 'Confirm Order (Atomic)'}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    const ordNum = createdDraft.order_number;
                    setCreatedDraft(null);
                    onViewOrder(ordNum);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#fff',
                    border: '1px solid var(--border-color)',
                    padding: '12px 18px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <span>Track in Orders Desk</span>
                  <ArrowRight size={16} />
                </button>

                <button
                  onClick={() => {
                    setCreatedDraft(null);
                    onClearCart();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: 'transparent',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-color)',
                    padding: '12px 18px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={16} />
                  <span>Start New Order</span>
                </button>
              </div>
            </div>
          ) : cart.length === 0 ? (
            <div className="glass-panel" style={{
              padding: '60px 24px',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}>
              <ShoppingCart size={48} color="var(--text-dim)" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '8px' }}>Your Cart is Empty</h3>
              <p style={{ fontSize: '0.9rem' }}>
                Browse the catalogue and add items to place a draft order for {selectedDealer?.name || 'the dealer'}.
              </p>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '12px',
              }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                  Cart Items ({cart.length})
                </h3>
                <button
                  onClick={onClearCart}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#f87171',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Trash2 size={14} />
                  <span>Clear All</span>
                </button>
              </div>

              {/* Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {cart.map((item) => (
                  <div
                    key={item.product.sku}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'var(--bg-surface)',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      gap: '12px',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        {item.product.sku} · {item.product.brand}
                      </span>
                      <h4 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 600 }}>{item.product.name}</h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>
                        ₹{Number(item.product.price).toFixed(2)} / unit
                      </span>
                    </div>

                    {/* Stepper */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                    }}>
                      <button
                        onClick={() => onUpdateQty(item.product.sku, -1)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#fff',
                          padding: '6px 8px',
                          display: 'flex',
                        }}
                      >
                        <Minus size={13} />
                      </button>
                      <span style={{ padding: '0 8px', fontWeight: 700, fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQty(item.product.sku, 1)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#fff',
                          padding: '6px 8px',
                          display: 'flex',
                        }}
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => onRemoveItem(item.product.sku)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-dim)',
                        padding: '6px',
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Checkout Summary & GST Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Dealer Card */}
          {selectedDealer && (
            <div className="glass-panel" style={{ padding: '18px 20px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Ordering Dealership
              </span>
              <h4 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 700, marginTop: '2px' }}>
                {selectedDealer.name}
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                marginTop: '10px',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
              }}>
                <div>Code: <strong style={{ color: '#fff' }}>{selectedDealer.dealer_code}</strong></div>
                <div>City: <strong style={{ color: '#fff' }}>{selectedDealer.city}</strong></div>
                <div>GSTIN: <strong style={{ color: '#fff' }}>{selectedDealer.gstin || 'N/A'}</strong></div>
                <div>Credit: <strong style={{ color: 'var(--primary)' }}>₹{Number(selectedDealer.credit_limit).toLocaleString('en-IN')}</strong></div>
              </div>
            </div>
          )}

          {/* Money & GST Breakdown Card */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '14px' }}>
              Payment & GST Breakdown
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Subtotal (Net Price)</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#fff' }}>₹{totals.subtotal}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>CGST + SGST (18% Per-Line)</span>
                  <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '1px 5px', borderRadius: '4px' }}>
                    ROUND_HALF_UP
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#fff' }}>₹{totals.taxTotal}</span>
              </div>

              <div style={{
                borderTop: '1px solid var(--border-color)',
                paddingTop: '12px',
                marginTop: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>Grand Total</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                  ₹{totals.grandTotal}
                </span>
              </div>
            </div>

            {/* Idempotency Test Key */}
            <div style={{
              marginTop: '18px',
              borderTop: '1px solid var(--border-color)',
              paddingTop: '14px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Idempotency-Key Header (§7.5)
                </span>
                <button
                  type="button"
                  onClick={handleGenerateKey}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#60a5fa',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  Generate Key
                </button>
              </div>
              <input
                type="text"
                placeholder="Optional: Enter key to test idempotency"
                value={idempotencyKey}
                onChange={(e) => setIdempotencyKey(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  color: '#fff',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-mono)',
                }}
              />
            </div>

            {/* Create Draft Button */}
            {!createdDraft && (
              <button
                onClick={handleCreateDraft}
                disabled={submittingDraft || cart.length === 0}
                style={{
                  width: '100%',
                  marginTop: '20px',
                  backgroundColor: cart.length > 0 ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                  color: cart.length > 0 ? '#000' : 'var(--text-dim)',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: cart.length > 0 ? 'var(--shadow-glow)' : 'none',
                  opacity: submittingDraft ? 0.7 : 1,
                }}
              >
                <FileText size={18} />
                <span>{submittingDraft ? 'Generating Draft Order...' : 'Create DRAFT Order'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
