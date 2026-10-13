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

  const reorderNeededCount = items.filter((i) => i.reorder_qty > 0).length;
  const totalSuggestedUnits = items.reduce((acc, curr) => acc + curr.reorder_qty, 0);

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Demand Forecast & Safety Stock Reorder
            </h1>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              padding: '2px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}>
              Section 10 Formula
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Mathematical safety stock formula: SS = ceil(1.65 × σ × √L), Reorder Point = LTD + SS, utilizing live warehouse stock.
          </p>
        </div>

        <button
          onClick={fetchReorderData}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--surface-0)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '0.85rem',
          }}
        >
          <RefreshCw size={15} />
          <span>Refresh Live Stock</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div className="card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Monitored Forecast SKUs
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
            {items.length}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>40 critical supplier lead-time parts</span>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.75rem', color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Reorder Triggered (Stock ≤ Reorder Point)
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f87171', marginTop: '4px' }}>
            {reorderNeededCount}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Urgent warehouse purchase recommended</span>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Suggested Reorder Units
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
            {totalSuggestedUnits.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Units to satisfy lead-time & safety buffer</span>
        </div>
      </div>

      {/* Main Content Grid: Table + 4-Week Drilldown Modal/Card */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedSku ? '1.4fr 1fr' : '1fr',
        gap: '24px',
        alignItems: 'start',
      }}>
        {/* Table */}
        <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: '50px' }} />
              ))}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ color: 'var(--text-dim)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ paddingBottom: '10px' }}>SKU</th>
                  <th style={{ paddingBottom: '10px', textAlign: 'center' }}>Live Stock</th>
                  <th style={{ paddingBottom: '10px', textAlign: 'center' }}>Lead Time</th>
                  <th style={{ paddingBottom: '10px', textAlign: 'right' }}>LT Demand</th>
                  <th style={{ paddingBottom: '10px', textAlign: 'right' }}>Safety Stock</th>
                  <th style={{ paddingBottom: '10px', textAlign: 'right' }}>Reorder Point</th>
                  <th style={{ paddingBottom: '10px', textAlign: 'center' }}>Reorder Qty</th>
                  <th style={{ paddingBottom: '10px', textAlign: 'center' }}>Forecast</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const needsReorder = row.reorder_qty > 0;
                  const isSelected = selectedSku === row.sku;

                  return (
                    <tr
                      key={row.sku}
                      onClick={() => handleSelectSku(row.sku)}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <td style={{ padding: '12px 6px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {row.sku}
                      </td>
                      <td style={{ padding: '12px 6px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                        <span style={{
                          color: row.current_stock === 0 ? '#f87171' : row.current_stock <= row.reorder_point ? '#fbbf24' : '#34d399',
                          fontWeight: 700,
                        }}>
                          {row.current_stock}
                        </span>
                      </td>
                      <td style={{ padding: '12px 6px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        {row.lead_time_weeks} wks
                      </td>
                      <td style={{ padding: '12px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {row.lead_time_demand}
                      </td>
                      <td style={{ padding: '12px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#60a5fa' }}>
                        {row.safety_stock}
                      </td>
                      <td style={{ padding: '12px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {row.reorder_point}
                      </td>
                      <td style={{ padding: '12px 6px', textAlign: 'center' }}>
                        {needsReorder ? (
                          <span style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.18)',
                            color: '#f87171',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 800,
                            fontFamily: 'var(--font-mono)',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                          }}>
                            +{row.reorder_qty}
                          </span>
                        ) : (
                          <span style={{
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            color: '#34d399',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                          }}>
                            Adequate
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 6px', textAlign: 'center' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSku(row.sku);
                          }}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-muted)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                          }}
                        >
                          View 4-Wk
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 4-Week Forecast Detail Pane */}
        {selectedSku && (
          <div className="card" style={{ padding: '24px', backgroundColor: 'var(--surface-1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  4-Week Forecast: {selectedSku}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSku(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                ✕ Close
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Weekly projected demand units from <code>ml/forecast.csv</code> (evaluated via <code>GET /api/forecast/{selectedSku}/</code>):
            </p>

            {forecastLoading ? (
              <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'var(--text-dim)' }}>Loading forecast curve...</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {forecastWeeks.map((fw, idx) => {
                  const maxUnits = Math.max(...forecastWeeks.map((f) => f.forecast_units), 50);
                  const barPct = Math.min(100, (fw.forecast_units / maxUnits) * 100);

                  return (
                    <div
                      key={fw.week_start}
                      style={{
                        backgroundColor: 'var(--surface-2)',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          Week {idx + 1} ({fw.week_start})
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                          {fw.forecast_units} units
                        </span>
                      </div>

                      {/* Visual Bar */}
                      <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
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
    </div>
  );
};
