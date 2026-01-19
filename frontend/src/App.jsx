import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function App() {
  const [readings, setReadings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchReadings() {
      try {
        const response = await fetch(`${API_URL}/meter_readings/every_third_day`)
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`)
        }
        const data = await response.json()
        setReadings(data)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchReadings()
  }, [])

  return (
    <main style={{ fontFamily: 'monospace', padding: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem' }}>Meter Readings (Every Third Day)</h1>
      
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {!loading && !error && (
        <pre style={{ background: '#f4f4f4', padding: '1rem', overflow: 'auto', maxHeight: '80vh' }}>
          {JSON.stringify(readings, null, 2)}
        </pre>
      )}
    </main>
  )
}

export default App
