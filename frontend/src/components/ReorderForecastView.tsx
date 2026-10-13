import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  Layers,
  ChevronRight,
  BarChart3,
  RefreshCw,
  Info,
  Check,
  Truck,
  ArrowUpRight,
  ShoppingBag,
  Boxes,
  Zap,
  X,
} from 'lucide-react';
import { ReorderItem, ForecastWeek } from '../types';
import { ApiService } from '../api';

interface ReorderForecastViewProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ReorderForecastView: React.FC<ReorderForecastViewProps> = ({ showToast }) => {
  const [items, setItems] = useState<ReorderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [forecastWeeks, setForecastWeeks] = useState<ForecastWeek[]>([]);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [reorderingSku, setReorderingSku] = useState<string | null>(null);

  // Batch Procurement Progress Modal State
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchCurrentSku, setBatchCurrentSku] = useState('');
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchCompleted, setBatchCompleted] = useState(false);
  const [batchLogs, setBatchLogs] = useState<string[]>([]);

  const fetchReorderData = async () => {
    try {
      setLoading(true);
      const res = await ApiService.getReorderSuggestions();
      setItems(res.results);
    } catch (err: any) {
      showToast(err?.error?.message || 'Failed to fetch reorder suggestions.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReorderData();
  }, []);

  const handleSelectSku = async (sku: string) => {
    setSelectedSku(sku);
    try {
      setForecastLoading(true);
      const res = await ApiService.getForecast(sku);
      setForecastWeeks(res.forecast);
    } catch (err: any) {
      showToast(`Failed to load forecast for ${sku}.`, 'error');
    } finally {
      setForecastLoading(false);
    }
  };

  // 1-Click Individual Reorder Action
  const handleSingleReorder = async (row: ReorderItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setReorderingSku(row.sku);
      const newQuantity = row.current_stock + row.reorder_qty;
      await ApiService.updateInventory(
        row.sku,
        newQuantity,
        'Demand Forecast Safety Stock Restock'
      );
      showToast(`Procured +${row.reorder_qty} units for ${row.sku}. Stock updated to ${newQuantity}!`, 'success');
      await fetchReorderData();
    } catch (err: any) {
      showToast(err?.error?.message || `Failed to reorder SKU ${row.sku}.`, 'error');
    } finally {
      setReorderingSku(null);
    }
  };

  // Batch Reorder All Triggered SKUs via Django Backend Core
  const handleStartBatchReorder = async () => {
    const needed = items.filter((i) => i.reorder_qty > 0);
    if (needed.length === 0) {
      showToast('All items are already adequately stocked!', 'info');
      return;
    }

    setBatchModalOpen(true);
    setBatchRunning(true);
    setBatchCompleted(false);
    setBatchTotal(needed.length);
    setBatchProgress(0);
    setBatchLogs([]);

    try {
      setBatchCurrentSku('Django Core Processing...');
      const targetSkus = needed.map((item) => item.sku);
      
      // Call Django backend core atomic procurement endpoint
      const res = await ApiService.procureReorders(targetSkus);

      const logs = (res.procured_items || []).map(
        (p) => `✓ ${p.sku}: Restocked +${p.reordered_units} units (New Stock: ${p.new_stock})`
      );

      setBatchLogs(logs);
      setBatchProgress(needed.length);
      setBatchRunning(false);
      setBatchCompleted(true);
      showToast(res.message || `Django batch procurement completed for ${needed.length} SKUs!`, 'success');
      await fetchReorderData();
    } catch (err: any) {
      setBatchLogs((prev) => [`✕ Django backend error: ${err?.error?.message || 'Procurement failed'}`, ...prev]);
      setBatchRunning(false);
      showToast(err?.error?.message || 'Failed to execute batch procurement on Django backend.', 'error');
    }
  };

  const reorderNeededCount = items.filter((i) => i.reorder_qty > 0).length;
  const totalSuggestedUnits = items.reduce((acc, curr) => acc + curr.reorder_qty, 0);
  const safeCount = items.length - reorderNeededCount;
  const safePercentage = items.length > 0 ? Math.round((safeCount / items.length) * 100) : 100;

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Demand Forecast & Safety Stock Reorder
            </h1>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              backgroundColor: 'var(--tab-active-bg)',
              color: 'var(--primary)',
              padding: '2px 8px',
              borderRadius: '6px',
              border: '1px solid var(--primary)',
            }}>
              Section 10 Formula
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Mathematical safety stock formula: SS = ceil(1.65 × σ × √L), Reorder Point = LTD + SS, utilizing live warehouse stock.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {reorderNeededCount > 0 && (
            <button
              onClick={handleStartBatchReorder}
              className="btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
              }}
            >
              <Zap size={15} />
              <span>Auto-Procure Reorders ({reorderNeededCount} SKUs)</span>
            </button>
          )}

          <button
            onClick={fetchReorderData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--surface-1)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh Live Stock</span>
          </button>
        </div>
      </div>

      {/* KPI Cards & Overall Warehouse Buffer Progress Meter */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '16px',
        marginBottom: '20px',
      }}>
        {/* Monitored SKUs Card */}
        <div className="card" style={{ padding: '18px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
            Monitored Forecast SKUs
          </span>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
            {items.length}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>40 critical supplier lead-time parts</span>
        </div>

        {/* Reorder Triggered Card */}
        <div className="card" style={{ padding: '18px' }}>
          <span style={{ fontSize: '0.75rem', color: reorderNeededCount > 0 ? '#ef4444' : 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
            Reorder Triggered (Stock ≤ Reorder Point)
          </span>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: reorderNeededCount > 0 ? '#ef4444' : 'var(--primary)', marginTop: '2px' }}>
            {reorderNeededCount}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {reorderNeededCount > 0 ? 'Urgent warehouse purchase recommended' : 'All monitored SKUs healthy'}
          </span>
        </div>

        {/* Total Suggested Units Card */}
        <div className="card" style={{ padding: '18px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
            Total Suggested Reorder Units
          </span>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--primary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
            {totalSuggestedUnits.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Units to satisfy lead-time & safety buffer</span>
        </div>

        {/* Safety Stock Buffer Health Progress Card */}
        <div className="card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Warehouse Buffer Health
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: safePercentage >= 80 ? 'var(--primary)' : '#f59e0b' }}>
              {safePercentage}%
            </span>
          </div>

          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0 8px' }}>
            {safeCount} of {items.length} SKUs Safe
          </div>

          {/* Overall Health Progress Bar */}
          <div style={{ height: '8px', width: '100%', background: 'var(--surface-3)', borderRadius: '999px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${safePercentage}%`,
                background: safePercentage >= 80
                  ? 'linear-gradient(90deg, #10b981, #059669)'
                  : 'linear-gradient(90deg, #ef4444, #f59e0b)',
                borderRadius: '999px',
                transition: 'width 0.6s ease',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '5px' }}>
            <span>{reorderNeededCount} Reorders Pending</span>
            <span>{safeCount} Fully Stocked</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Table + 4-Week Drilldown Card */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedSku ? '1.45fr 1fr' : '1fr',
        gap: '20px',
        alignItems: 'start',
      }}>
        {/* Table with Stock Health Progress Bars */}
        <div className="card" style={{ padding: '18px', overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px', color: 'var(--primary)' }} />
              <div style={{ fontWeight: 600 }}>Loading demand forecasts & safety thresholds...</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th style={{ textAlign: 'center' }}>Live Stock</th>
                  <th style={{ textAlign: 'center' }}>Lead Time</th>
                  <th style={{ textAlign: 'right' }}>LT Demand</th>
                  <th style={{ textAlign: 'right' }}>Safety Stock</th>
                  <th style={{ textAlign: 'right' }}>Reorder Point</th>
                  <th style={{ minWidth: '150px' }}>Stock Health Progress</th>
                  <th style={{ textAlign: 'center' }}>Reorder Qty</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const needsReorder = row.reorder_qty > 0;
                  const isSelected = selectedSku === row.sku;
                  const bufferRatio = Math.min(100, Math.round((row.current_stock / Math.max(1, row.reorder_point)) * 100));
                  const isCritical = row.current_stock === 0;
                  const isLow = row.current_stock <= row.reorder_point;

                  return (
                    <tr
                      key={row.sku}
                      onClick={() => handleSelectSku(row.sku)}
                      style={{
                        backgroundColor: isSelected ? 'var(--tab-active-bg)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <span className="sku">{row.sku}</span>
                      </td>

                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                        <span style={{
                          color: isCritical ? '#ef4444' : isLow ? '#f59e0b' : 'var(--primary)',
                          fontWeight: 700,
                          fontSize: '13.5px',
                        }}>
                          {row.current_stock}
                        </span>
                      </td>

                      <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        {row.lead_time_weeks} wks
                      </td>

                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                        {row.lead_time_demand}
                      </td>

                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#3b82f6', fontWeight: 600 }}>
                        {row.safety_stock}
                      </td>

                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {row.reorder_point}
                      </td>

                      {/* Stock Health Working Progress Bar */}
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600 }}>
                            <span style={{ color: isCritical ? '#ef4444' : isLow ? '#f59e0b' : 'var(--primary)' }}>
                              {bufferRatio}%
                            </span>
                            <span style={{ color: isLow ? '#ef4444' : 'var(--text-muted)', fontSize: '10px', fontWeight: 500 }}>
                              {isCritical ? 'Stockout' : isLow ? `-${row.reorder_qty} Deficit` : 'Safe Buffer'}
                            </span>
                          </div>

                          {/* Animated Progress Bar */}
                          <div style={{ height: '6px', width: '100%', background: 'var(--surface-3)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${bufferRatio}%`,
                                background: isCritical
                                  ? '#ef4444'
                                  : isLow
                                  ? 'linear-gradient(90deg, #ef4444, #f59e0b)'
                                  : 'linear-gradient(90deg, #10b981, #059669)',
                                borderRadius: '999px',
                                transition: 'width 0.4s ease',
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Reorder Qty Badge */}
                      <td style={{ textAlign: 'center' }}>
                        {needsReorder ? (
                          <span className="badge out" style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                            +{row.reorder_qty}
                          </span>
                        ) : (
                          <span className="badge ok">
                            Adequate
                          </span>
                        )}
                      </td>

                      {/* Actions: 1-Click Reorder & View 4-Wk */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                          {needsReorder && (
                            <button
                              onClick={(e) => handleSingleReorder(row, e)}
                              disabled={reorderingSku === row.sku}
                              title={`Procure +${row.reorder_qty} units into live warehouse`}
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                border: '1px solid var(--primary)',
                                background: 'var(--tab-active-bg)',
                                color: 'var(--tab-active-text)',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Truck size={12} className={reorderingSku === row.sku ? 'spin' : ''} />
                              <span>{reorderingSku === row.sku ? 'Reordering...' : `Reorder`}</span>
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectSku(row.sku);
                            }}
                            style={{
                              background: 'var(--surface-2)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-secondary)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 500,
                              cursor: 'pointer',
                            }}
                          >
                            4-Wk
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 4-Week Forecast Detail Pane with Working Progress Bars */}
        {selectedSku && (
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  4-Week Forecast: {selectedSku}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSku(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                ✕ Close
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Weekly projected demand units from <code>ml/forecast.csv</code> (evaluated via <code>GET /api/forecast/{selectedSku}/</code>):
            </p>

            {forecastLoading ? (
              <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Loading forecast curve...</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {forecastWeeks.map((fw, idx) => {
                  const maxUnits = Math.max(...forecastWeeks.map((f) => f.forecast_units), 50);
                  const barPct = Math.min(100, Math.round((fw.forecast_units / maxUnits) * 100));

                  return (
                    <div
                      key={fw.week_start}
                      style={{
                        backgroundColor: 'var(--surface-2)',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          Week {idx + 1} ({fw.week_start})
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                          {fw.forecast_units} units
                        </span>
                      </div>

                      {/* Visual Demand Bar */}
                      <div style={{ height: '7px', backgroundColor: 'var(--surface-3)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${barPct}%`,
                          background: 'linear-gradient(90deg, #f59e0b, #ea580c)',
                          borderRadius: '999px',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Batch Procurement Live Working Progress Modal */}
      {batchModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '16px',
            animation: 'fadeIn 0.16s ease-out',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '520px',
              width: '100%',
              background: 'var(--surface-1)',
              border: '1px solid var(--border-strong)',
              borderRadius: '14px',
              padding: '24px',
              boxShadow: '0 20px 48px rgba(0, 0, 0, 0.4)',
            }}
          >
            {/* Modal Header */}
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
                  <Zap size={18} className={batchRunning ? 'spin' : ''} />
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Auto-Procurement in Progress
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Restocking all {batchTotal} triggered SKUs to optimal safety thresholds
                  </div>
                </div>
              </div>

              {!batchRunning && (
                <button
                  onClick={() => setBatchModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Live Working Progress Meter */}
            <div style={{ margin: '16px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-primary)' }}>
                  {batchRunning ? `Procuring: ${batchCurrentSku}` : batchCompleted ? 'All SKUs Restocked' : 'Progress'}
                </span>
                <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                  {batchProgress} / {batchTotal} ({batchTotal > 0 ? Math.round((batchProgress / batchTotal) * 100) : 0}%)
                </span>
              </div>

              {/* Working Animated Progress Bar */}
              <div style={{ height: '10px', width: '100%', background: 'var(--surface-3)', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${batchTotal > 0 ? (batchProgress / batchTotal) * 100 : 0}%`,
                    background: 'linear-gradient(90deg, #10b981, #059669)',
                    borderRadius: '999px',
                    transition: 'width 0.25s ease',
                  }}
                />
              </div>
            </div>

            {/* Live Execution Activity Stream */}
            <div style={{ maxHeight: '160px', overflowY: 'auto', background: 'var(--surface-0)', borderRadius: '8px', padding: '10px', border: '1px solid var(--border)', fontSize: '11.5px', fontFamily: 'var(--font-mono)' }}>
              {batchLogs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>Initializing automated procurement pipeline...</div>
              ) : (
                batchLogs.map((log, idx) => (
                  <div key={idx} style={{ padding: '2px 0', color: log.startsWith('✓') ? 'var(--primary)' : '#ef4444' }}>
                    {log}
                  </div>
                ))
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
              <button
                onClick={() => setBatchModalOpen(false)}
                disabled={batchRunning}
                className="btn"
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  opacity: batchRunning ? 0.6 : 1,
                  cursor: batchRunning ? 'not-allowed' : 'pointer',
                }}
              >
                {batchRunning ? 'Procuring Warehouse Stock...' : 'Done (View Updated Stock)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
