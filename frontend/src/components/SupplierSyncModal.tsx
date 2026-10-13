import React, { useState } from 'react';
import {
  RefreshCw,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  Layers,
  FileCheck,
  ShieldCheck,
  Server,
} from 'lucide-react';
import { SupplierSyncResult } from '../types';
import { ApiService } from '../api';

interface SupplierSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onSyncComplete?: () => void;
}

export const SupplierSyncModal: React.FC<SupplierSyncModalProps> = ({
  isOpen,
  onClose,
  showToast,
  onSyncComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SupplierSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunSync = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ApiService.syncSupplier();
      setResult(res);
      showToast(
        `Supplier sync completed: ${res.created} created, ${res.updated} updated, ${res.unchanged} unchanged.`,
        'success'
      );
      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      const errObj = err?.error || {};
      const errMsg = errObj.message || 'Supplier API unavailable (HTTP 502).';
      setError(errMsg);
      showToast(`Supplier sync failed: ${errMsg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '16px',
        animation: 'fadeIn 0.16s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '560px',
          width: '100%',
          background: 'var(--surface-1)',
          border: '1px solid var(--border-strong)',
          borderRadius: '14px',
          padding: '24px',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.35)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--tab-active-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <RefreshCw size={18} className={loading ? 'spin' : ''} />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Supplier Catalogue Sync
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Resilient Feed Integration (Contract Section 8) · Port 8099
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '6px',
              borderRadius: '6px',
              color: 'var(--text-muted)',
              border: 'none',
              background: 'transparent',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Status Callout / Architecture Info */}
        <div
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: '9px',
            padding: '12px 14px',
            marginBottom: '18px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            <ShieldCheck size={14} color="var(--primary)" />
            <span>Strict Idempotency & All-Or-Nothing Atomicity</span>
          </div>
          <div>
            Syncs external supplier catalogue using cursor pagination. Automatically backs off on <strong>HTTP 429</strong> and retries <strong>5xx</strong> errors up to 5 times. Deduplicates records by latest <code>updated_at</code> without modifying local dealer stock.
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div
            style={{
              background: 'var(--badge-out-bg)',
              border: '1px solid var(--badge-out-border)',
              color: 'var(--badge-out-text)',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Sync Result KPI Cards */}
        {result && (
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
              <div
                style={{
                  background: 'var(--surface-0)',
                  border: '1px solid var(--border)',
                  borderRadius: '9px',
                  padding: '12px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Created
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                  +{result.created}
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  New SKUs Ingested
                </div>
              </div>

              <div
                style={{
                  background: 'var(--surface-0)',
                  border: '1px solid var(--border)',
                  borderRadius: '9px',
                  padding: '12px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Updated
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                  {result.updated}
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Prices / Specs Fresh
                </div>
              </div>

              <div
                style={{
                  background: 'var(--surface-0)',
                  border: '1px solid var(--border)',
                  borderRadius: '9px',
                  padding: '12px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Unchanged
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {result.unchanged}
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Already in Sync
                </div>
              </div>
            </div>

            {/* Transmission Meta */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'var(--surface-2)',
                borderRadius: '8px',
                fontSize: '11.5px',
                color: 'var(--text-secondary)',
              }}
            >
              <span>Pages Fetched: <strong>{result.pages_fetched}</strong></span>
              <span>Total Requests Made: <strong>{result.requests_made}</strong></span>
              <span>Rejected Items: <strong>{result.rejected?.length || 0}</strong></span>
            </div>

            {/* Rejected Items Preview */}
            {result.rejected && result.rejected.length > 0 && (
              <div style={{ marginTop: '10px', fontSize: '11.5px' }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                  Sanitized Rejected Feed Records ({result.rejected.length}):
                </div>
                <div style={{ maxHeight: '90px', overflowY: 'auto', background: 'var(--surface-0)', borderRadius: '6px', padding: '6px 8px', border: '1px solid var(--border)' }}>
                  {result.rejected.map((rej, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{rej.supplier_sku || 'Unknown SKU'}</span>
                      <span style={{ color: '#ef4444' }}>{rej.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface-0)',
              color: 'var(--text-secondary)',
              fontSize: '12.5px',
              fontWeight: 500,
            }}
          >
            Close
          </button>

          <button
            onClick={handleRunSync}
            disabled={loading}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              gap: '8px',
              background: 'var(--primary)',
              color: 'var(--primary-text)',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px var(--primary-glow)',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>{loading ? 'Syncing Supplier Feed...' : result ? 'Run Again (Verify Idempotency)' : 'Trigger Supplier Sync'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
