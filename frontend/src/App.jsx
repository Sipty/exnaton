import { Routes, Route, Navigate, Link } from 'react-router-dom'
import PlotlyPage from './pages/PlotlyPage'

function App() {
  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo">
            <div className="logo-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div className="logo-text">
              <span className="logo-brand">Exnaton</span>
              <span className="logo-product">Energy</span>
            </div>
          </Link>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<PlotlyPage />} />
        </Routes>
      </main>

      <style>{`
        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(3, 7, 18, 0.8);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--color-border);
        }

        .header-content {
          max-width: 1440px;
          margin: 0 auto;
          padding: var(--space-4) var(--space-6);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          text-decoration: none;
          transition: opacity 0.15s ease;
        }
        
        .logo:hover {
          opacity: 0.85;
        }

        .logo-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-active) 0%, #0e7490 100%);
          border-radius: var(--radius-md);
          color: white;
          box-shadow: 0 0 20px var(--color-active-glow);
        }

        .logo-text {
          display: flex;
          align-items: baseline;
          gap: var(--space-2);
        }

        .logo-brand {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--color-text-primary);
          letter-spacing: -0.02em;
        }

        .logo-product {
          font-size: 1.125rem;
          font-weight: 500;
          color: var(--color-text-tertiary);
          letter-spacing: -0.02em;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-3);
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--color-text-tertiary);
          text-decoration: none;
          border-radius: var(--radius-md);
          transition: all 0.15s ease;
        }

        .nav-link:hover {
          color: var(--color-text-primary);
          background: var(--color-bg-card);
        }

        main {
          flex: 1;
        }

        @media (max-width: 640px) {
          .header-content {
            padding: var(--space-3) var(--space-4);
          }

          .logo-text {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}

export default App
