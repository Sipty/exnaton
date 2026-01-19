import { useState, useMemo } from 'react'
import Plot from 'react-plotly.js'
import { useEnergyData } from '../hooks/useEnergyData'

// ============================================
// THEME CONFIGURATION
// ============================================
const THEME = {
  colors: {
    active: '#06b6d4',
    activeGlow: 'rgba(6, 182, 212, 0.3)',
    activeFill: 'rgba(6, 182, 212, 0.08)',
    reactive: '#a78bfa',
    reactiveGlow: 'rgba(167, 139, 250, 0.3)',
    reactiveFill: 'rgba(167, 139, 250, 0.08)',
    cost: '#f59e0b',
    costGlow: 'rgba(245, 158, 11, 0.3)',
    costFill: 'rgba(245, 158, 11, 0.08)',
    savings: '#10b981',
    savingsGlow: 'rgba(16, 185, 129, 0.3)',
    grid: 'rgba(148, 163, 184, 0.08)',
    text: '#64748b',
    textLight: '#94a3b8',
    paper: '#1a2332',
    plot: '#0f172a',
    annotation: '#475569',
  },
  font: {
    family: 'Inter, -apple-system, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },
}

// Base Plotly layout
const createLayout = (overrides = {}) => ({
  paper_bgcolor: 'transparent',
  plot_bgcolor: THEME.colors.plot,
  font: { 
    color: THEME.colors.text, 
    family: THEME.font.family,
    size: 11,
  },
  margin: { t: 24, r: 16, b: 40, l: 48, pad: 0 },
  xaxis: {
    gridcolor: THEME.colors.grid,
    linecolor: 'transparent',
    zerolinecolor: THEME.colors.grid,
    tickfont: { size: 10 },
  },
  yaxis: {
    gridcolor: THEME.colors.grid,
    linecolor: 'transparent',
    zerolinecolor: THEME.colors.grid,
    tickfont: { size: 10 },
  },
  legend: {
    orientation: 'h',
    yanchor: 'bottom',
    y: 1.02,
    xanchor: 'left',
    x: 0,
    bgcolor: 'transparent',
    font: { size: 11 },
  },
  hoverlabel: {
    bgcolor: '#1e293b',
    bordercolor: 'transparent',
    font: { family: THEME.font.family, size: 12 },
  },
  ...overrides,
})

const plotConfig = {
  responsive: true,
  displayModeBar: 'hover',
  modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
  displaylogo: false,
}

// ============================================
// HELPER FUNCTIONS
// ============================================
const formatNumber = (num, decimals = 2) => {
  if (num == null || isNaN(num)) return '—'
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

const formatCHF = (num) => {
  if (num == null || isNaN(num)) return '—'
  return `${num.toFixed(2)}`
}

const formatHour = (hour) => {
  if (hour == null) return '—'
  const h = hour % 12 || 12
  const ampm = hour >= 12 ? 'PM' : 'AM'
  return `${h} ${ampm}`
}

// ============================================
// KPI CARD COMPONENT
// ============================================
function KPICard({ title, value, unit, subtitle, type, icon, delay = 0, highlight = false, onClick, isActive = false }) {
  const colorMap = {
    active: { accent: 'var(--color-active)', glow: 'var(--color-active-glow)', subtle: 'var(--color-active-subtle)' },
    reactive: { accent: 'var(--color-reactive)', glow: 'var(--color-reactive-glow)', subtle: 'var(--color-reactive-subtle)' },
    cost: { accent: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', subtle: 'rgba(245, 158, 11, 0.12)' },
    savings: { accent: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', subtle: 'rgba(16, 185, 129, 0.12)' },
  }
  
  const colors = colorMap[type] || colorMap.active

  return (
    <div 
      className={`kpi-card animate-in ${highlight ? 'highlight' : ''} ${onClick ? 'clickable' : ''} ${isActive ? 'active' : ''}`}
      style={{ 
        animationDelay: `${delay}ms`,
        '--accent': colors.accent,
        '--glow': colors.glow,
        '--subtle': colors.subtle,
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="kpi-header">
        <span className="kpi-icon">{icon}</span>
        <span className="kpi-title">{title}</span>
        {onClick && (
          <span className="kpi-expand">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
          </span>
        )}
      </div>
      <div className="kpi-value">
        <span className="kpi-number">{value}</span>
        <span className="kpi-unit">{unit}</span>
      </div>
      {subtitle && <div className="kpi-subtitle">{subtitle}</div>}
      
      <style>{`
        .kpi-card {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: var(--space-5);
          position: relative;
          overflow: hidden;
          transition: all 0.2s ease;
        }
        
        .kpi-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--accent), transparent 80%);
        }
        
        .kpi-card.highlight {
          border-color: var(--accent);
          box-shadow: 0 0 24px -8px var(--glow);
        }
        
        .kpi-card.clickable {
          cursor: pointer;
        }
        
        .kpi-card.clickable:hover,
        .kpi-card.active {
          border-color: var(--accent);
          box-shadow: 0 0 32px -8px var(--glow);
          transform: translateY(-2px);
        }
        
        .kpi-card.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-bottom: 10px solid var(--accent);
        }
        
        .kpi-header {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          margin-bottom: var(--space-3);
        }
        
        .kpi-icon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--subtle);
          border-radius: var(--radius-md);
          color: var(--accent);
          font-size: 14px;
        }
        
        .kpi-title {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-tertiary);
        }
        
        .kpi-expand {
          margin-left: auto;
          color: var(--color-text-quaternary);
          opacity: 0;
          transition: opacity 0.2s;
        }
        
        .kpi-card.clickable:hover .kpi-expand,
        .kpi-card.active .kpi-expand {
          opacity: 1;
          color: var(--accent);
        }
        
        .kpi-value {
          display: flex;
          align-items: baseline;
          gap: var(--space-2);
        }
        
        .kpi-number {
          font-family: var(--font-mono);
          font-size: 2rem;
          font-weight: 600;
          color: var(--color-text-primary);
          letter-spacing: -0.02em;
          line-height: 1;
        }
        
        .kpi-unit {
          font-size: 0.875rem;
          color: var(--color-text-tertiary);
        }
        
        .kpi-subtitle {
          margin-top: var(--space-2);
          font-size: 0.8125rem;
          color: var(--color-text-tertiary);
        }
      `}</style>
    </div>
  )
}

// ============================================
// KPI INSIGHT PANEL COMPONENT
// ============================================
function KPIInsightPanel({ activeKPI, costBreakdown, activeStats, pricingConfig, hourlyData, onClose }) {
  if (!activeKPI) return null

  const getInsightContent = () => {
    switch (activeKPI) {
      case 'spend':
        return {
          title: '💰 Your Energy Spend Breakdown',
          color: '#f59e0b',
          content: (
            <>
              <div className="insight-metric-grid">
                <div className="insight-metric">
                  <span className="metric-label">High Tariff Usage</span>
                  <span className="metric-value" style={{ color: '#ef4444' }}>
                    {costBreakdown?.high_tariff?.percent_of_total?.toFixed(1) || 0}%
                  </span>
                  <span className="metric-sublabel">
                    Fr. {formatCHF(costBreakdown?.high_tariff?.cost_chf)} ({costBreakdown?.high_tariff?.kwh?.toFixed(1)} kWh)
                  </span>
                </div>
                <div className="insight-metric">
                  <span className="metric-label">Low Tariff Usage</span>
                  <span className="metric-value" style={{ color: '#10b981' }}>
                    {costBreakdown?.low_tariff?.percent_of_total?.toFixed(1) || 0}%
                  </span>
                  <span className="metric-sublabel">
                    Fr. {formatCHF(costBreakdown?.low_tariff?.cost_chf)} ({costBreakdown?.low_tariff?.kwh?.toFixed(1)} kWh)
                  </span>
                </div>
                <div className="insight-metric">
                  <span className="metric-label">Effective Rate</span>
                  <span className="metric-value">
                    {((costBreakdown?.effective_rate_chf_per_kwh || 0) * 100).toFixed(1)} Rp/kWh
                  </span>
                  <span className="metric-sublabel">Blended rate across all usage</span>
                </div>
                <div className="insight-metric">
                  <span className="metric-label">Daily Average</span>
                  <span className="metric-value">
                    Fr. {formatCHF((costBreakdown?.total_cost_chf || 0) / 28)}
                  </span>
                  <span className="metric-sublabel">Average cost per day</span>
                </div>
              </div>
              <div className="insight-tip">
                <span className="tip-icon">💡</span>
                <p>By shifting more usage to low-tariff hours (nights & weekends), you could lower your effective rate by up to 10 Rp/kWh!</p>
              </div>
            </>
          )
        }
      case 'active':
        return {
          title: '⚡ Active Energy Analysis',
          color: '#06b6d4',
          content: (
            <>
              <div className="insight-metric-grid">
                <div className="insight-metric">
                  <span className="metric-label">Total Consumption</span>
                  <span className="metric-value" style={{ color: '#06b6d4' }}>
                    {formatNumber(activeStats?.total_kwh)} kWh
                  </span>
                  <span className="metric-sublabel">{activeStats?.reading_count?.toLocaleString()} readings</span>
                </div>
                <div className="insight-metric">
                  <span className="metric-label">Peak Hour</span>
                  <span className="metric-value">
                    {formatHour(activeStats?.peak_hour)}
                  </span>
                  <span className="metric-sublabel">
                    {activeStats?.peak_hour >= 7 && activeStats?.peak_hour < 20 
                      ? '⚠️ High tariff zone!' 
                      : '✓ Low tariff zone'}
                  </span>
                </div>
                <div className="insight-metric">
                  <span className="metric-label">Min Reading</span>
                  <span className="metric-value">
                    {formatNumber(activeStats?.min_kwh, 4)} kWh
                  </span>
                  <span className="metric-sublabel">Lowest 15-min interval</span>
                </div>
                <div className="insight-metric">
                  <span className="metric-label">Max Reading</span>
                  <span className="metric-value">
                    {formatNumber(activeStats?.max_kwh, 4)} kWh
                  </span>
                  <span className="metric-sublabel">Highest 15-min interval</span>
                </div>
              </div>
              <div className="insight-tip">
                <span className="tip-icon">⚡</span>
                <p>Active energy is what you pay for! Consider identifying which appliances contribute most during peak hours.</p>
              </div>
            </>
          )
        }
      case 'savings':
        const potentialSavings = costBreakdown?.comparison?.potential_savings_chf || 0
        const yearlySavings = potentialSavings * 12
        return {
          title: '🎯 Your Savings Potential',
          color: '#10b981',
          content: (
            <>
              <div className="insight-metric-grid">
                <div className="insight-metric">
                  <span className="metric-label">Monthly Savings</span>
                  <span className="metric-value" style={{ color: '#10b981' }}>
                    Fr. {formatCHF(potentialSavings)}
                  </span>
                  <span className="metric-sublabel">By shifting to off-peak</span>
                </div>
                <div className="insight-metric">
                  <span className="metric-label">Yearly Potential</span>
                  <span className="metric-value" style={{ color: '#10b981' }}>
                    Fr. {formatCHF(yearlySavings)}
                  </span>
                  <span className="metric-sublabel">Projected annual savings</span>
                </div>
                <div className="insight-metric">
                  <span className="metric-label">HT to Shift</span>
                  <span className="metric-value">
                    {((costBreakdown?.high_tariff?.kwh || 0) * 0.3).toFixed(1)} kWh
                  </span>
                  <span className="metric-sublabel">30% of peak usage target</span>
                </div>
                <div className="insight-metric">
                  <span className="metric-label">Rate Difference</span>
                  <span className="metric-value">
                    {((pricingConfig?.high_tariff_rappen_per_kwh || 32) - (pricingConfig?.low_tariff_rappen_per_kwh || 22))} Rp/kWh
                  </span>
                  <span className="metric-sublabel">Savings per shifted kWh</span>
                </div>
              </div>
              <div className="insight-tip success">
                <span className="tip-icon">💚</span>
                <p>Top ways to save: Run laundry after 20:00, charge EV overnight, batch cook on weekends. Small shifts add up to big savings!</p>
              </div>
            </>
          )
        }
      default:
        return null
    }
  }

  const content = getInsightContent()
  if (!content) return null

  return (
    <div className="kpi-insight-panel animate-in" style={{ '--panel-color': content.color }}>
      <div className="insight-panel-header">
        <h3>{content.title}</h3>
        <button className="close-btn" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div className="insight-panel-content">
        {content.content}
      </div>

      <style>{`
        .kpi-insight-panel {
          background: var(--color-bg-card);
          border: 1px solid var(--panel-color);
          border-radius: var(--radius-xl);
          padding: var(--space-5);
          margin-bottom: var(--space-6);
          position: relative;
          box-shadow: 0 0 40px -10px var(--panel-color);
        }
        
        .kpi-insight-panel::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--panel-color);
          border-radius: var(--radius-xl) var(--radius-xl) 0 0;
        }
        
        .insight-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-5);
        }
        
        .insight-panel-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
        }
        
        .close-btn {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md);
          background: var(--color-bg-interactive);
          border: none;
          color: var(--color-text-tertiary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        
        .close-btn:hover {
          background: var(--color-bg-card-hover);
          color: var(--color-text-primary);
        }
        
        .insight-metric-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-4);
          margin-bottom: var(--space-5);
        }
        
        .insight-metric {
          display: flex;
          flex-direction: column;
          padding: var(--space-4);
          background: var(--color-bg-interactive);
          border-radius: var(--radius-lg);
          gap: var(--space-1);
        }
        
        .metric-label {
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-tertiary);
        }
        
        .metric-value {
          font-family: var(--font-mono);
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        
        .metric-sublabel {
          font-size: 0.75rem;
          color: var(--color-text-quaternary);
        }
        
        .insight-tip {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
          padding: var(--space-4);
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.2);
          border-radius: var(--radius-lg);
        }
        
        .insight-tip.success {
          background: rgba(16, 185, 129, 0.08);
          border-color: rgba(16, 185, 129, 0.2);
        }
        
        .insight-tip.info {
          background: rgba(6, 182, 212, 0.08);
          border-color: rgba(6, 182, 212, 0.2);
        }
        
        .insight-tip .tip-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }
        
        .insight-tip p {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          line-height: 1.6;
        }
        
        @media (max-width: 1024px) {
          .insight-metric-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 640px) {
          .insight-metric-grid {
            grid-template-columns: 1fr;
          }
          
          .metric-value {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </div>
  )
}

// ============================================
// MONEY-SAVING TIPS COMPONENT
// ============================================
function SavingsTipsCard({ pricingConfig, costBreakdown, hourlyData, delay = 0 }) {
  if (!pricingConfig || !costBreakdown) return null

  // Pricing config now uses flat structure from unified API
  const htRate = pricingConfig.high_tariff_rappen_per_kwh || 32
  const ltRate = pricingConfig.low_tariff_rappen_per_kwh || 22
  const savingsPercent = Math.round((htRate - ltRate) / htRate * 100)
  
  // Find peak consumption hours
  const peakHours = hourlyData
    ?.filter(h => h.hour >= 7 && h.hour < 20)
    .sort((a, b) => b.active - a.active)
    .slice(0, 3)
    .map(h => h.hour) || []

  const tips = [
    {
      icon: '🧺',
      title: 'Laundry & Dishwasher',
      action: 'Run after 20:00 or on weekends',
      saving: `Save ${savingsPercent}% on these appliances`,
      priority: 'high',
    },
    {
      icon: '🔌',
      title: 'EV Charging',
      action: 'Schedule charging 22:00–06:00',
      saving: `${ltRate} Rp/kWh vs ${htRate} Rp/kWh daytime`,
      priority: 'high',
    },
    {
      icon: '🍳',
      title: 'Weekend Cooking',
      action: 'Heavy oven use costs less Sat-Sun',
      saving: 'All-day low tariff on weekends',
      priority: 'medium',
    },
    {
      icon: '💡',
      title: `Avoid ${peakHours.map(h => `${h}:00`).join(', ') || '7-20'}`,
      action: 'Your peak usage hours are expensive',
      saving: 'Shift to off-peak when possible',
      priority: 'medium',
    },
  ]

  return (
    <div className="savings-card animate-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="savings-header">
        <div className="savings-header-icon">💰</div>
        <div>
          <h3>Money-Saving Tips</h3>
          <p>Based on Swiss dual-tariff pricing</p>
        </div>
      </div>
      
      <div className="tariff-comparison">
        <div className="tariff high">
          <span className="tariff-label">Hochtarif</span>
          <span className="tariff-time">Mon-Fri 07:00-20:00</span>
          <span className="tariff-rate">{htRate} Rp/kWh</span>
        </div>
        <div className="tariff low">
          <span className="tariff-label">Niedertarif</span>
          <span className="tariff-time">Nights & Weekends</span>
          <span className="tariff-rate">{ltRate} Rp/kWh</span>
        </div>
      </div>

      <div className="tips-list">
        {tips.map((tip, i) => (
          <div key={i} className={`tip-item priority-${tip.priority}`}>
            <span className="tip-icon">{tip.icon}</span>
            <div className="tip-content">
              <strong>{tip.title}</strong>
              <span>{tip.action}</span>
              <span className="tip-saving">{tip.saving}</span>
            </div>
          </div>
        ))}
      </div>

      {costBreakdown?.comparison?.potential_savings_chf > 0.5 && (
        <div className="potential-savings">
          <span className="savings-amount">
            Fr. {formatCHF(costBreakdown.comparison.potential_savings_chf)}
          </span>
          <span className="savings-label">
            potential monthly savings by shifting to off-peak hours
          </span>
        </div>
      )}

      <style>{`
        .savings-card {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: var(--space-5);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        
        .savings-header {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        
        .savings-header-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(16, 185, 129, 0.12);
          border-radius: var(--radius-lg);
          font-size: 20px;
        }
        
        .savings-header h3 {
          font-size: 1rem;
          margin-bottom: 2px;
        }
        
        .savings-header p {
          font-size: 0.8125rem;
          color: var(--color-text-tertiary);
        }
        
        .tariff-comparison {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-3);
        }
        
        .tariff {
          padding: var(--space-3);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .tariff.high {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        
        .tariff.low {
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        
        .tariff-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .tariff.high .tariff-label { color: #f87171; }
        .tariff.low .tariff-label { color: #34d399; }
        
        .tariff-time {
          font-size: 0.75rem;
          color: var(--color-text-tertiary);
        }
        
        .tariff-rate {
          font-family: var(--font-mono);
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin-top: var(--space-1);
        }
        
        .tips-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        
        .tip-item {
          display: flex;
          gap: var(--space-3);
          padding: var(--space-3);
          background: var(--color-bg-interactive);
          border-radius: var(--radius-md);
          border-left: 3px solid transparent;
        }
        
        .tip-item.priority-high {
          border-left-color: #10b981;
        }
        
        .tip-item.priority-medium {
          border-left-color: #f59e0b;
        }
        
        .tip-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }
        
        .tip-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 0.8125rem;
        }
        
        .tip-content strong {
          color: var(--color-text-primary);
        }
        
        .tip-content span {
          color: var(--color-text-tertiary);
        }
        
        .tip-saving {
          font-size: 0.75rem;
          color: #10b981 !important;
        }
        
        .potential-savings {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.04));
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: var(--radius-md);
          padding: var(--space-4);
          text-align: center;
        }
        
        .savings-amount {
          display: block;
          font-family: var(--font-mono);
          font-size: 1.5rem;
          font-weight: 700;
          color: #10b981;
        }
        
        .savings-label {
          font-size: 0.8125rem;
          color: var(--color-text-tertiary);
        }
      `}</style>
    </div>
  )
}

// ============================================
// COST BREAKDOWN COMPONENT
// ============================================
function CostBreakdownCard({ costBreakdown, delay = 0 }) {
  if (!costBreakdown) return null

  const htPercent = costBreakdown.high_tariff?.percent_of_total || 0
  const ltPercent = costBreakdown.low_tariff?.percent_of_total || 0
  const htKwh = costBreakdown.high_tariff?.kwh || 0
  const ltKwh = costBreakdown.low_tariff?.kwh || 0
  const totalKwh = costBreakdown.total_kwh || 0
  const totalCost = costBreakdown.total_cost_chf || 0
  const dailyAvgCost = totalCost / 28
  const dailyAvgKwh = totalKwh / 28
  
  // Calculate potential savings if all HT usage was shifted to LT
  const htRate = 0.32 // 32 Rp/kWh
  const ltRate = 0.22 // 22 Rp/kWh
  const maxSavings = htKwh * (htRate - ltRate)

  return (
    <div className="cost-card animate-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="cost-header">
        <h3>Cost Breakdown</h3>
        <span className="effective-rate">
          Avg: {(costBreakdown.effective_rate_chf_per_kwh * 100).toFixed(1)} Rp/kWh
        </span>
      </div>

      <div className="cost-bar">
        <div 
          className="cost-segment high" 
          style={{ width: `${htPercent}%` }}
          title={`High tariff: ${htPercent.toFixed(1)}%`}
        />
        <div 
          className="cost-segment low" 
          style={{ width: `${ltPercent}%` }}
          title={`Low tariff: ${ltPercent.toFixed(1)}%`}
        />
      </div>

      <div className="cost-legend">
        <div className="legend-item">
          <span className="legend-dot high" />
          <span className="legend-label">High Tariff (32 Rp)</span>
          <span className="legend-kwh">{formatNumber(htKwh, 1)} kWh</span>
          <span className="legend-value">{formatCHF(costBreakdown.high_tariff?.cost_chf)} CHF</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot low" />
          <span className="legend-label">Low Tariff (22 Rp)</span>
          <span className="legend-kwh">{formatNumber(ltKwh, 1)} kWh</span>
          <span className="legend-value">{formatCHF(costBreakdown.low_tariff?.cost_chf)} CHF</span>
        </div>
      </div>

      <div className="cost-stats">
        <div className="cost-stat">
          <span className="stat-label">Daily Average</span>
          <span className="stat-value">{formatNumber(dailyAvgKwh, 1)} kWh / Fr. {formatCHF(dailyAvgCost)}</span>
        </div>
        <div className="cost-stat">
          <span className="stat-label">Total Consumption</span>
          <span className="stat-value">{formatNumber(totalKwh, 1)} kWh</span>
        </div>
        <div className="cost-stat highlight">
          <span className="stat-label">Max Potential Savings</span>
          <span className="stat-value savings">Fr. {formatCHF(maxSavings)}</span>
        </div>
      </div>

      <div className="cost-note">
        💡 If all high-tariff usage was shifted to off-peak, you'd save up to Fr. {formatCHF(maxSavings)}/month
      </div>

      <style>{`
        .cost-card {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: var(--space-5);
        }
        
        .cost-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-4);
        }
        
        .cost-header h3 {
          font-size: 0.9375rem;
        }
        
        .effective-rate {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-text-tertiary);
          background: var(--color-bg-interactive);
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-sm);
        }
        
        .cost-bar {
          display: flex;
          height: 12px;
          border-radius: 6px;
          overflow: hidden;
          background: var(--color-bg-interactive);
          margin-bottom: var(--space-4);
        }
        
        .cost-segment {
          transition: width 0.5s ease;
        }
        
        .cost-segment.high {
          background: linear-gradient(90deg, #ef4444, #f87171);
        }
        
        .cost-segment.low {
          background: linear-gradient(90deg, #10b981, #34d399);
        }
        
        .cost-legend {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          margin-bottom: var(--space-4);
          padding-bottom: var(--space-4);
          border-bottom: 1px solid var(--color-border);
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: 0.8125rem;
        }
        
        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .legend-dot.high { background: #ef4444; }
        .legend-dot.low { background: #10b981; }
        
        .legend-label {
          color: var(--color-text-secondary);
          flex: 1;
        }
        
        .legend-kwh {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-text-tertiary);
          min-width: 70px;
          text-align: right;
        }
        
        .legend-value {
          font-family: var(--font-mono);
          color: var(--color-text-primary);
          min-width: 65px;
          text-align: right;
        }
        
        .cost-stats {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          margin-bottom: var(--space-4);
        }
        
        .cost-stat {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8125rem;
        }
        
        .cost-stat.highlight {
          background: rgba(16, 185, 129, 0.08);
          margin: 0 calc(-1 * var(--space-3));
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-md);
        }
        
        .stat-label {
          color: var(--color-text-tertiary);
        }
        
        .stat-value {
          font-family: var(--font-mono);
          color: var(--color-text-primary);
        }
        
        .stat-value.savings {
          color: #10b981;
          font-weight: 600;
        }
        
        .cost-note {
          font-size: 0.75rem;
          color: var(--color-text-tertiary);
          background: var(--color-bg-interactive);
          padding: var(--space-3);
          border-radius: var(--radius-md);
          line-height: 1.4;
        }
      `}</style>
    </div>
  )
}

// ============================================
// INSIGHT CARD COMPONENT
// ============================================
function InsightCard({ insights }) {
  if (!insights?.length) return null

  return (
    <div className="insight-card animate-in" style={{ animationDelay: '200ms' }}>
      <div className="insight-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
        <span>Usage Insights</span>
      </div>
      <div className="insight-list">
        {insights.map((insight, i) => (
          <div key={i} className="insight-item">
            <span className="insight-bullet" style={{ background: insight.color }} />
            <span>{insight.text}</span>
          </div>
        ))}
      </div>
      
      <style>{`
        .insight-card {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: var(--space-5);
        }
        
        .insight-header {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-tertiary);
          margin-bottom: var(--space-4);
        }
        
        .insight-header svg {
          color: var(--color-warning);
        }
        
        .insight-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        
        .insight-item {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          line-height: 1.5;
        }
        
        .insight-bullet {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          margin-top: 6px;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  )
}

// ============================================
// FILTER BAR COMPONENT
// ============================================
function FilterBar({ filters, onChange }) {
  const { startDate, endDate, meter, aggregation, periodFilter } = filters

  const formatDate = (date) => date?.toISOString().split('T')[0] || ''

  const handleDate = (field, value) => {
    onChange({ ...filters, [field]: value ? new Date(value) : null })
  }

  const handleChange = (field, value) => {
    onChange({ ...filters, [field]: value })
  }

  const presets = [
    { label: 'Week 1', start: '2023-02-01', end: '2023-02-07' },
    { label: 'Week 2', start: '2023-02-08', end: '2023-02-14' },
    { label: 'Full Month', start: '2023-02-01', end: '2023-02-28' },
  ]

  return (
    <div className="filter-bar animate-in" style={{ animationDelay: '50ms' }}>
      <div className="filter-section">
        <span className="filter-label">Period</span>
        <div className="filter-group">
          <input
            type="date"
            value={formatDate(startDate)}
            onChange={(e) => handleDate('startDate', e.target.value)}
          />
          <span className="filter-separator">→</span>
          <input
            type="date"
            value={formatDate(endDate)}
            onChange={(e) => handleDate('endDate', e.target.value)}
          />
        </div>
        <div className="filter-presets">
          {presets.map(p => (
            <button
              key={p.label}
              className={formatDate(startDate) === p.start && formatDate(endDate) === p.end ? 'active' : ''}
              onClick={() => {
                handleDate('startDate', p.start)
                handleDate('endDate', p.end)
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-divider" />

      <div className="filter-section">
        <span className="filter-label">Resolution</span>
        <div className="filter-group">
          {[
            { value: 'raw', label: '15m' },
            { value: 'hourly', label: '1h' },
            { value: 'daily', label: '1d' },
            { value: 'weekly', label: '1w' },
          ].map(({ value, label }) => (
            <button
              key={value}
              className={aggregation === value ? 'active' : ''}
              onClick={() => handleChange('aggregation', value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-divider" />

      <div className="filter-section">
        <span className="filter-label">Meter</span>
        <div className="filter-group">
          {[
            { value: 'both', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'reactive', label: 'Reactive' },
          ].map(({ value, label }) => (
            <button
              key={value}
              className={meter === value ? 'active' : ''}
              onClick={() => handleChange('meter', value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-divider" />

      <div className="filter-section">
        <span className="filter-label">Days</span>
        <div className="filter-group">
          {[
            { value: 'all', label: 'All' },
            { value: 'weekday', label: 'Weekday' },
            { value: 'weekend', label: 'Weekend' },
          ].map(({ value, label }) => (
            <button
              key={value}
              className={periodFilter === value ? 'active' : ''}
              onClick={() => handleChange('periodFilter', value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .filter-bar {
          display: flex;
          align-items: center;
          gap: var(--space-6);
          padding: var(--space-4) var(--space-5);
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          margin-bottom: var(--space-6);
          flex-wrap: wrap;
        }

        .filter-section {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .filter-label {
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-quaternary);
          min-width: 52px;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 2px;
          background: var(--color-bg-interactive);
          border-radius: var(--radius-md);
          padding: 2px;
        }

        .filter-group input[type="date"] {
          background: transparent;
          border: none;
          padding: var(--space-2) var(--space-3);
          font-size: 0.8125rem;
          width: 120px;
        }

        .filter-group input[type="date"]:focus {
          box-shadow: none;
        }

        .filter-separator {
          color: var(--color-text-quaternary);
          font-size: 0.75rem;
          padding: 0 var(--space-1);
        }

        .filter-group button {
          padding: var(--space-2) var(--space-3);
          font-size: 0.75rem;
          font-weight: 500;
          border: none;
          background: transparent;
          color: var(--color-text-tertiary);
          border-radius: var(--radius-sm);
          transition: all 0.15s ease;
        }

        .filter-group button:hover {
          color: var(--color-text-primary);
          background: var(--color-bg-card-hover);
        }

        .filter-group button.active {
          background: var(--color-active);
          color: var(--color-bg-deep);
          box-shadow: 0 0 12px var(--color-active-glow);
        }

        .filter-presets {
          display: flex;
          gap: 2px;
          margin-left: var(--space-2);
        }

        .filter-presets button {
          padding: var(--space-1) var(--space-2);
          font-size: 0.6875rem;
          background: transparent;
          border: 1px solid var(--color-border);
          color: var(--color-text-quaternary);
        }

        .filter-presets button:hover {
          border-color: var(--color-text-quaternary);
          color: var(--color-text-secondary);
        }

        .filter-presets button.active {
          border-color: var(--color-active);
          color: var(--color-active);
          background: var(--color-active-subtle);
          box-shadow: none;
        }

        .filter-divider {
          width: 1px;
          height: 32px;
          background: var(--color-border);
        }

        @media (max-width: 1200px) {
          .filter-bar {
            gap: var(--space-4);
          }
          .filter-divider {
            display: none;
          }
          .filter-presets {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}

// ============================================
// CHART CARD COMPONENT
// ============================================
function ChartCard({ title, subtitle, children, fullWidth, delay = 0 }) {
  return (
    <div 
      className={`chart-card animate-in ${fullWidth ? 'full-width' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="chart-card-header">
        <div>
          <h3 className="chart-card-title">{title}</h3>
          {subtitle && <p className="chart-card-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="chart-content">
        {children}
      </div>

      <style>{`
        .chart-card {
          position: relative;
        }
        
        .chart-card.full-width {
          grid-column: 1 / -1;
        }
        
        .chart-content {
          position: relative;
          min-height: 280px;
        }
      `}</style>
    </div>
  )
}

// ============================================
// LOADING SKELETON
// ============================================
function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton">
      <div className="skeleton-kpis">
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton skeleton-kpi" />
        ))}
      </div>
      <div className="skeleton skeleton-chart-main" />
      <div className="skeleton-charts">
        <div className="skeleton skeleton-chart" />
        <div className="skeleton skeleton-chart" />
      </div>

      <style>{`
        .dashboard-skeleton {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }
        
        .skeleton-kpis {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-4);
        }
        
        .skeleton-kpi {
          height: 140px;
          border-radius: var(--radius-xl);
        }
        
        .skeleton-chart-main {
          height: 400px;
          border-radius: var(--radius-xl);
        }
        
        .skeleton-charts {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-4);
        }
        
        .skeleton-chart {
          height: 320px;
          border-radius: var(--radius-xl);
        }
        
        @media (max-width: 768px) {
          .skeleton-kpis {
            grid-template-columns: 1fr;
          }
          .skeleton-charts {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================
export function PlotlyPage() {
  const [filters, setFilters] = useState({
    startDate: new Date('2023-02-01'),
    endDate: new Date('2023-02-28'),
    meter: 'both',
    aggregation: 'hourly',
    periodFilter: 'all',
  })
  
  const [activeKPI, setActiveKPI] = useState(null)

  const {
    stats,
    heatmapData,
    pricingConfig,
    costBreakdown,
    loading,
    error,
    getTimeSeriesData,
    getHourlyChartData,
    getDailyChartData,
  } = useEnergyData(filters)
  
  const handleKPIClick = (kpiId) => {
    setActiveKPI(activeKPI === kpiId ? null : kpiId)
  }

  // Compute derived data
  const timeSeriesData = getTimeSeriesData()
  const hourlyData = getHourlyChartData()
  const dailyData = getDailyChartData()

  // Get stats for KPIs
  const activeStats = stats?.find(s => s.measurement_type === 'active')
  const reactiveStats = stats?.find(s => s.measurement_type === 'reactive')

  // Generate insights focused on saving money
  const insights = useMemo(() => {
    if (!activeStats || !dailyData.length || !hourlyData.length || !costBreakdown) return []

    const result = []
    
    // Cost insight - high tariff usage
    if (costBreakdown?.high_tariff?.percent_of_total > 50) {
      result.push({
        text: `${costBreakdown.high_tariff.percent_of_total.toFixed(0)}% of your usage is during expensive peak hours (07:00-20:00). Shifting just 20% to off-peak could save Fr. ${((costBreakdown.high_tariff.cost_chf * 0.2 * 0.3125)).toFixed(2)}/month.`,
        color: '#f59e0b',
      })
    } else if (costBreakdown?.low_tariff?.percent_of_total > 50) {
      result.push({
        text: `Excellent! ${costBreakdown.low_tariff.percent_of_total.toFixed(0)}% of your usage is during cheap off-peak hours. You're already optimizing your energy costs!`,
        color: '#10b981',
      })
    }
    
    // Peak hour insight
    if (activeStats.peak_hour != null) {
      const isExpensiveHour = activeStats.peak_hour >= 7 && activeStats.peak_hour < 20
      if (isExpensiveHour) {
        result.push({
          text: `Your highest usage hour is ${formatHour(activeStats.peak_hour)} — that's during high-tariff time. Consider running dishwashers and washing machines after 20:00 instead.`,
          color: THEME.colors.active,
        })
      } else {
        result.push({
          text: `Great timing! Your peak usage at ${formatHour(activeStats.peak_hour)} falls in the low-tariff window — you're naturally saving money!`,
          color: '#10b981',
        })
      }
    }

    // Weekend vs weekday comparison
    const weekdayAvg = dailyData.slice(0, 5).reduce((a, d) => a + d.active, 0) / 5
    const weekendAvg = dailyData.slice(5).reduce((a, d) => a + d.active, 0) / 2
    
    if (weekendAvg > weekdayAvg * 1.2) {
      result.push({
        text: `Weekend usage is ${((weekendAvg / weekdayAvg - 1) * 100).toFixed(0)}% higher than weekdays — that's smart, since weekend rates are lower all day (22 Rp vs 32 Rp/kWh)!`,
        color: '#10b981',
      })
    } else if (weekdayAvg > weekendAvg * 1.3) {
      result.push({
        text: `Your weekday usage is ${((weekdayAvg / weekendAvg - 1) * 100).toFixed(0)}% higher than weekends. Try batch-cooking or doing laundry on Saturday/Sunday to benefit from all-day low rates.`,
        color: '#f59e0b',
      })
    }

    // Morning vs evening pattern
    const morningUsage = hourlyData.filter(h => h.hour >= 6 && h.hour < 12).reduce((sum, h) => sum + h.active, 0)
    const eveningUsage = hourlyData.filter(h => h.hour >= 18 && h.hour < 24).reduce((sum, h) => sum + h.active, 0)
    
    if (eveningUsage > morningUsage * 1.5) {
      result.push({
        text: `You're an evening person! Usage after 6 PM is ${((eveningUsage / morningUsage - 1) * 100).toFixed(0)}% higher than mornings. After 20:00, you're in the savings zone — keep those activities late!`,
        color: '#10b981',
      })
    } else if (morningUsage > eveningUsage * 1.5) {
      result.push({
        text: `Morning usage is ${((morningUsage / eveningUsage - 1) * 100).toFixed(0)}% higher than evenings. Before 7 AM is low-tariff — early risers save money!`,
        color: '#10b981',
      })
    }

    // Identify highest usage day
    const maxDay = dailyData.reduce((max, d) => d.active > max.active ? d : max, dailyData[0])
    const minDay = dailyData.reduce((min, d) => d.active < min.active ? d : min, dailyData[0])
    
    if (maxDay && minDay && maxDay.day !== minDay.day) {
      const isWeekendMax = ['Saturday', 'Sunday'].includes(maxDay.day)
      if (isWeekendMax) {
        result.push({
          text: `${maxDay.day} is your highest usage day — perfect timing since weekends have all-day low rates!`,
          color: '#10b981',
        })
      } else {
        result.push({
          text: `${maxDay.day} is your highest usage day. Consider shifting some activities to weekends for all-day savings.`,
          color: '#64748b',
        })
      }
    }

    // Night owl insight
    const lateNightUsage = hourlyData.filter(h => h.hour >= 22 || h.hour < 6).reduce((sum, h) => sum + h.active, 0)
    const totalUsage = hourlyData.reduce((sum, h) => sum + h.active, 0)
    const lateNightPercent = (lateNightUsage / totalUsage) * 100
    
    if (lateNightPercent > 25) {
      result.push({
        text: `${lateNightPercent.toFixed(0)}% of your daily usage is during late night hours (22:00-06:00) — that's prime savings time at just 22 Rp/kWh!`,
        color: '#10b981',
      })
    }

    // EV/High-power appliance suggestion based on peak
    if (activeStats.max_kwh > activeStats.avg_kwh * 4) {
      result.push({
        text: `You have high-power spikes up to ${formatNumber(activeStats.max_kwh, 3)} kWh per 15-min interval (${((activeStats.max_kwh / activeStats.avg_kwh)).toFixed(1)}x your average). If you have an EV or electric heater, scheduling these for after 20:00 could yield significant savings.`,
        color: '#64748b',
      })
    }

    return result
  }, [activeStats, dailyData, hourlyData, costBreakdown])

  if (error) {
    return (
      <div className="dashboard">
        <div className="error-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <h3>Unable to load data</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header animate-in">
        <div>
          <h1>Energy Analytics</h1>
          <p className="dashboard-subtitle">
            February 2023 • Residential meter data with Swiss pricing
          </p>
        </div>
      </header>

      {/* Filters */}
      <FilterBar filters={filters} onChange={setFilters} />

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="kpi-grid">
            <KPICard
              title="Total Spend"
              value={formatCHF(costBreakdown?.total_cost_chf)}
              unit="CHF"
              subtitle={`${formatNumber(costBreakdown?.total_kwh, 1)} kWh consumed`}
              type="cost"
              icon="💰"
              delay={100}
              highlight
              onClick={() => handleKPIClick('spend')}
              isActive={activeKPI === 'spend'}
            />
            <KPICard
              title="Active Energy"
              value={formatNumber(activeStats?.total_kwh)}
              unit="kWh"
              subtitle={`Peak at ${formatHour(activeStats?.peak_hour)}`}
              type="active"
              icon="⚡"
              delay={150}
              onClick={() => handleKPIClick('active')}
              isActive={activeKPI === 'active'}
            />
            <KPICard
              title="Potential Savings"
              value={formatCHF(costBreakdown?.comparison?.potential_savings_chf)}
              unit="CHF"
              subtitle="By shifting to off-peak"
              type="savings"
              icon="🎯"
              delay={200}
              onClick={() => handleKPIClick('savings')}
              isActive={activeKPI === 'savings'}
            />
          </div>

          {/* KPI Insight Panel (appears when a KPI is clicked) */}
          <KPIInsightPanel 
            activeKPI={activeKPI}
            costBreakdown={costBreakdown}
            activeStats={activeStats}
            pricingConfig={pricingConfig}
            hourlyData={hourlyData}
            onClose={() => setActiveKPI(null)}
          />

          {/* Main Time Series */}
          <ChartCard
            title="Consumption Timeline"
            subtitle="Energy usage over time — drag to zoom, double-click to reset"
            fullWidth
            delay={350}
          >
            <Plot
              data={[
                {
                  x: timeSeriesData.active.map(d => d.x),
                  y: timeSeriesData.active.map(d => d.y),
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Active Energy',
                  line: { color: THEME.colors.active, width: 1.5, shape: 'spline' },
                  fill: 'tozeroy',
                  fillcolor: THEME.colors.activeFill,
                  hovertemplate: '<b>%{x|%b %d, %H:%M}</b><br>%{y:.4f} kWh<extra></extra>',
                },
                {
                  x: timeSeriesData.reactive.map(d => d.x),
                  y: timeSeriesData.reactive.map(d => d.y),
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Reactive Energy',
                  line: { color: THEME.colors.reactive, width: 1.5, shape: 'spline' },
                  fill: 'tozeroy',
                  fillcolor: THEME.colors.reactiveFill,
                  hovertemplate: '<b>%{x|%b %d, %H:%M}</b><br>%{y:.4f} kVArh<extra></extra>',
                },
              ]}
              layout={createLayout({
                height: 360,
                xaxis: { 
                  title: { text: '', standoff: 10 },
                  rangeslider: { visible: true, thickness: 0.05 },
                  type: 'date',
                },
                yaxis: { title: { text: 'Energy', standoff: 10 } },
              })}
              config={plotConfig}
              style={{ width: '100%', height: '100%' }}
            />
          </ChartCard>

          {/* Pattern Charts Row */}
          <div className="chart-grid">
            {/* Hourly Pattern with Tariff Zones */}
            <ChartCard
              title="Daily Load Profile"
              subtitle="Green zones = savings windows (nights & weekends pay less)"
              delay={400}
            >
              <Plot
                data={[
                  {
                    x: hourlyData.map(d => d.hour),
                    y: hourlyData.map(d => d.active),
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: 'Active',
                    line: { color: THEME.colors.active, width: 2.5, shape: 'spline' },
                    marker: { size: 5, color: THEME.colors.active },
                    hovertemplate: '<b>%{x}:00</b><br>%{y:.4f} kWh<extra></extra>',
                  },
                  {
                    x: hourlyData.map(d => d.hour),
                    y: hourlyData.map(d => d.reactive),
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: 'Reactive',
                    line: { color: THEME.colors.reactive, width: 2.5, shape: 'spline' },
                    marker: { size: 5, color: THEME.colors.reactive },
                    hovertemplate: '<b>%{x}:00</b><br>%{y:.4f} kVArh<extra></extra>',
                  },
                ]}
                layout={createLayout({
                  height: 300,
                  margin: { t: 40, r: 16, b: 60, l: 48 },
                  xaxis: {
                    title: { text: '', standoff: 10 },
                    tickmode: 'array',
                    tickvals: [0, 7, 12, 20, 23],
                    ticktext: ['0:00', '7:00', '12:00', '20:00', '23:00'],
                    range: [-0.5, 23.5],
                  },
                  yaxis: { title: { text: 'Avg kWh', standoff: 10 } },
                  legend: {
                    orientation: 'h',
                    yanchor: 'top',
                    y: -0.15,
                    xanchor: 'center',
                    x: 0.5,
                  },
                  shapes: [
                    // Morning savings window (00:00 - 07:00)
                    {
                      type: 'rect',
                      xref: 'x',
                      yref: 'paper',
                      x0: -0.5,
                      x1: 7,
                      y0: 0,
                      y1: 1,
                      fillcolor: 'rgba(16, 185, 129, 0.12)',
                      line: { width: 0 },
                      layer: 'below',
                    },
                    // Evening savings window (20:00 - 24:00)
                    {
                      type: 'rect',
                      xref: 'x',
                      yref: 'paper',
                      x0: 20,
                      x1: 23.5,
                      y0: 0,
                      y1: 1,
                      fillcolor: 'rgba(16, 185, 129, 0.12)',
                      line: { width: 0 },
                      layer: 'below',
                    },
                    // High tariff zone (07:00 - 20:00) - subtle red
                    {
                      type: 'rect',
                      xref: 'x',
                      yref: 'paper',
                      x0: 7,
                      x1: 20,
                      y0: 0,
                      y1: 1,
                      fillcolor: 'rgba(239, 68, 68, 0.04)',
                      line: { width: 0 },
                      layer: 'below',
                    },
                    // Vertical line at 07:00
                    {
                      type: 'line',
                      xref: 'x',
                      yref: 'paper',
                      x0: 7,
                      x1: 7,
                      y0: 0,
                      y1: 1,
                      line: { color: '#f87171', width: 2, dash: 'dot' },
                    },
                    // Vertical line at 20:00
                    {
                      type: 'line',
                      xref: 'x',
                      yref: 'paper',
                      x0: 20,
                      x1: 20,
                      y0: 0,
                      y1: 1,
                      line: { color: '#10b981', width: 2, dash: 'dot' },
                    },
                  ],
                  annotations: [
                    {
                      x: 13.5,
                      y: 1.02,
                      xref: 'x',
                      yref: 'paper',
                      text: '💸 High Tariff (32 Rp/kWh)',
                      showarrow: false,
                      font: { size: 10, color: '#f87171' },
                      yanchor: 'bottom',
                    },
                    {
                      x: 3,
                      y: 1.02,
                      xref: 'x',
                      yref: 'paper',
                      text: '💚 SAVE (22 Rp/kWh)',
                      showarrow: false,
                      font: { size: 10, color: '#10b981', weight: 600 },
                      yanchor: 'bottom',
                    },
                    {
                      x: 21.5,
                      y: 1.02,
                      xref: 'x',
                      yref: 'paper',
                      text: '💚 SAVE',
                      showarrow: false,
                      font: { size: 10, color: '#10b981', weight: 600 },
                      yanchor: 'bottom',
                    },
                    // Time markers
                    {
                      x: 7,
                      y: -0.08,
                      xref: 'x',
                      yref: 'paper',
                      text: '07:00',
                      showarrow: false,
                      font: { size: 9, color: '#f87171' },
                      yanchor: 'top',
                    },
                    {
                      x: 20,
                      y: -0.08,
                      xref: 'x',
                      yref: 'paper',
                      text: '20:00',
                      showarrow: false,
                      font: { size: 9, color: '#10b981' },
                      yanchor: 'top',
                    },
                  ],
                })}
                config={plotConfig}
                style={{ width: '100%', height: '100%' }}
              />
            </ChartCard>

            {/* Day of Week */}
            <ChartCard
              title="Weekly Pattern"
              subtitle="Weekends (Sat-Sun) = all-day low tariff savings"
              delay={450}
            >
              <Plot
                data={[
                  {
                    x: dailyData.map(d => d.dayShort),
                    y: dailyData.map(d => d.active),
                    type: 'bar',
                    name: 'Active',
                    marker: { 
                      color: dailyData.map((d, i) => i >= 5 
                        ? '#10b981'  // Weekend = green (savings!)
                        : THEME.colors.active
                      ),
                      line: { width: 0 },
                    },
                    hovertemplate: '<b>%{x}</b><br>%{y:.4f} kWh<extra></extra>',
                  },
                  {
                    x: dailyData.map(d => d.dayShort),
                    y: dailyData.map(d => d.reactive),
                    type: 'bar',
                    name: 'Reactive',
                    marker: { 
                      color: dailyData.map((d, i) => i >= 5 
                        ? 'rgba(16, 185, 129, 0.5)' 
                        : THEME.colors.reactive
                      ),
                      line: { width: 0 },
                    },
                    hovertemplate: '<b>%{x}</b><br>%{y:.4f} kVArh<extra></extra>',
                  },
                ]}
                layout={createLayout({
                  height: 280,
                  barmode: 'group',
                  bargap: 0.3,
                  bargroupgap: 0.1,
                  xaxis: { title: { text: '', standoff: 10 } },
                  yaxis: { title: { text: 'Avg kWh', standoff: 10 } },
                  annotations: [{
                    x: 5.5,
                    y: 1,
                    xref: 'x',
                    yref: 'paper',
                    text: '← Weekdays | 💚 Weekend Savings →',
                    showarrow: false,
                    font: { size: 10, color: THEME.colors.annotation },
                    yanchor: 'bottom',
                  }],
                })}
                config={plotConfig}
                style={{ width: '100%', height: '100%' }}
              />
            </ChartCard>
          </div>

          {/* Bottom Row: Heatmaps */}
          <div className="chart-grid">
            {/* Heatmap - Active */}
            {heatmapData?.active && (
              <ChartCard
                title="Active Energy Heatmap"
                subtitle="Usage intensity by hour and day of week"
                delay={500}
              >
                <Plot
                  data={[{
                    z: heatmapData.active.values,
                    x: heatmapData.active.days.map(d => d.slice(0, 3)),
                    y: heatmapData.active.hours,
                    type: 'heatmap',
                    colorscale: [
                      [0, '#0f172a'],
                      [0.25, '#164e63'],
                      [0.5, '#0891b2'],
                      [0.75, '#22d3ee'],
                      [1, '#a5f3fc'],
                    ],
                    hovertemplate: '<b>%{x} %{y}:00</b><br>%{z:.4f} kWh<extra></extra>',
                    colorbar: {
                      title: { text: 'kWh', side: 'right' },
                      thickness: 12,
                      len: 0.9,
                      tickfont: { size: 10 },
                    },
                    showscale: true,
                  }]}
                  layout={createLayout({
                    height: 320,
                    xaxis: { side: 'top', tickangle: 0 },
                    yaxis: { autorange: 'reversed', dtick: 4 },
                    margin: { t: 40, r: 60, b: 20, l: 40 },
                  })}
                  config={{ ...plotConfig, displayModeBar: false }}
                  style={{ width: '100%', height: '100%' }}
                />
              </ChartCard>
            )}

            {/* Heatmap - Reactive */}
            {heatmapData?.reactive && (
              <ChartCard
                title="Reactive Energy Heatmap"
                subtitle="Reactive power patterns by hour and day"
                delay={550}
              >
                <Plot
                  data={[{
                    z: heatmapData.reactive.values,
                    x: heatmapData.reactive.days.map(d => d.slice(0, 3)),
                    y: heatmapData.reactive.hours,
                    type: 'heatmap',
                    colorscale: [
                      [0, '#0f172a'],
                      [0.25, '#3b0764'],
                      [0.5, '#7c3aed'],
                      [0.75, '#a78bfa'],
                      [1, '#ddd6fe'],
                    ],
                    hovertemplate: '<b>%{x} %{y}:00</b><br>%{z:.4f} kVArh<extra></extra>',
                    colorbar: {
                      title: { text: 'kVArh', side: 'right' },
                      thickness: 12,
                      len: 0.9,
                      tickfont: { size: 10 },
                    },
                    showscale: true,
                  }]}
                  layout={createLayout({
                    height: 320,
                    xaxis: { side: 'top', tickangle: 0 },
                    yaxis: { autorange: 'reversed', dtick: 4 },
                    margin: { t: 40, r: 60, b: 20, l: 40 },
                  })}
                  config={{ ...plotConfig, displayModeBar: false }}
                  style={{ width: '100%', height: '100%' }}
                />
              </ChartCard>
            )}
          </div>

          {/* Cost Breakdown, Insights & Savings Tips Row */}
          <div className="insights-row">
            <CostBreakdownCard costBreakdown={costBreakdown} delay={600} />
            <InsightCard insights={insights} />
            <SavingsTipsCard 
              pricingConfig={pricingConfig} 
              costBreakdown={costBreakdown}
              hourlyData={hourlyData}
              delay={650} 
            />
          </div>
        </>
      )}

      <style>{`
        .dashboard {
          max-width: 1440px;
          margin: 0 auto;
          padding: var(--space-6) var(--space-6) var(--space-12);
        }

        .dashboard-header {
          margin-bottom: var(--space-6);
        }

        .dashboard-header h1 {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: var(--space-1);
        }

        .dashboard-subtitle {
          color: var(--color-text-tertiary);
          font-size: 0.9375rem;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-4);
          margin-bottom: var(--space-4);
        }

        .insights-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-4);
          margin-top: var(--space-6);
        }

        .chart-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-4);
          margin-top: var(--space-6);
        }

        .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: var(--space-12);
          color: var(--color-text-tertiary);
        }

        .error-state svg {
          color: var(--color-danger);
          margin-bottom: var(--space-4);
        }

        .error-state h3 {
          margin-bottom: var(--space-2);
        }

        @media (max-width: 1280px) {
          .insights-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 1024px) {
          .kpi-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          
          .insights-row,
          .chart-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .kpi-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .dashboard {
            padding: var(--space-4);
          }
        }
      `}</style>
    </div>
  )
}

export default PlotlyPage
