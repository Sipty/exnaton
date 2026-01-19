import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Custom hook for fetching and managing energy data
 * Uses the unified /meter_readings API with optional includes
 * 
 * @param {Object} filters - Filter configuration
 * @param {Date} filters.startDate - Start date for data range
 * @param {Date} filters.endDate - End date for data range
 * @param {string} filters.meter - Meter type: 'active', 'reactive', or 'both'
 * @param {string} filters.aggregation - Aggregation level: 'raw', 'hourly', 'daily', 'weekly'
 * @param {string} filters.periodFilter - Period filter: 'all', 'weekday', 'weekend'
 */
export function useEnergyData(filters = {}) {
  const [data, setData] = useState([])
  const [stats, setStats] = useState([])
  const [hourlyPattern, setHourlyPattern] = useState([])
  const [dailyPattern, setDailyPattern] = useState([])
  const [heatmapData, setHeatmapData] = useState(null)
  const [pricingConfig, setPricingConfig] = useState(null)
  const [costBreakdown, setCostBreakdown] = useState(null)
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const {
    startDate,
    endDate,
    meter = 'both',
    aggregation = 'raw',
    periodFilter = 'all',
  } = filters

  // Format date for API, handling null/undefined gracefully
  const formatDateParam = (date) => {
    if (!date) return ''
    try {
      return format(date, 'yyyy-MM-dd')
    } catch {
      return ''
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Build query params for unified API
      const params = new URLSearchParams()
      
      const startStr = formatDateParam(startDate)
      const endStr = formatDateParam(endDate)
      
      if (startStr) params.set('start', startStr)
      if (endStr) params.set('end', endStr)
      if (meter) params.set('meter', meter)
      if (aggregation) params.set('aggregation', aggregation)
      if (periodFilter === 'weekday') params.set('weekday_only', 'true')
      else if (periodFilter === 'weekend') params.set('weekend_only', 'true')
      
      // Request all additional data in one call
      params.set('include', 'stats,patterns,heatmap,cost')
      
      // Generous pagination (10k rows ≈ 1 month of 15-min data)
      params.set('per_page', '10000')

      // Single unified API call
      const response = await fetch(`${API_URL}/meter_readings?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()

      // Transform readings data for charts
      const transformedData = (result.data || []).map(row => ({
        ...row,
        timestamp: new Date(row.timestamp),
        date: new Date(row.timestamp).toLocaleDateString(),
        time: new Date(row.timestamp).toLocaleTimeString(),
      }))

      // Update all state from single response
      setData(transformedData)
      setStats(result.stats || [])
      setHourlyPattern(result.hourly_pattern || [])
      setDailyPattern(result.daily_pattern || [])
      setHeatmapData(result.heatmap || null)
      setCostBreakdown(result.cost_breakdown || null)
      setPagination(result.pagination || null)
      
      // Pricing config is always included in response
      setPricingConfig(result.pricing || null)

    } catch (err) {
      console.error('Failed to fetch energy data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, meter, aggregation, periodFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Computed data for charts
  const getTimeSeriesData = useCallback(() => {
    if (!data.length) return { active: [], reactive: [] }

    const active = data
      .filter(d => d.measurement_type === 'active')
      .map(d => ({ x: d.timestamp, y: d.reading }))

    const reactive = data
      .filter(d => d.measurement_type === 'reactive')
      .map(d => ({ x: d.timestamp, y: d.reading }))

    return { active, reactive }
  }, [data])

  const getHourlyChartData = useCallback(() => {
    if (!hourlyPattern.length) return []

    // Group by hour with both meter types
    const hours = [...new Set(hourlyPattern.map(d => d.hour))].sort((a, b) => a - b)
    
    return hours.map(hour => {
      const activeData = hourlyPattern.find(d => d.hour === hour && d.measurement_type === 'active')
      const reactiveData = hourlyPattern.find(d => d.hour === hour && d.measurement_type === 'reactive')
      
      // Determine tariff for this hour (weekday assumption for display)
      const isHighTariff = hour >= 7 && hour < 20
      
      return {
        hour,
        hourLabel: `${hour.toString().padStart(2, '0')}:00`,
        active: activeData?.avg_reading || 0,
        reactive: reactiveData?.avg_reading || 0,
        activeStd: activeData?.std_reading || 0,
        reactiveStd: reactiveData?.std_reading || 0,
        tariff: isHighTariff ? 'high' : 'low',
      }
    })
  }, [hourlyPattern])

  const getDailyChartData = useCallback(() => {
    if (!dailyPattern.length) return []

    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    
    return dayOrder.map((dayName, idx) => {
      const pgDow = idx === 6 ? 0 : idx + 1  // Convert back to PostgreSQL DOW
      const activeData = dailyPattern.find(d => d.day_of_week === pgDow && d.measurement_type === 'active')
      const reactiveData = dailyPattern.find(d => d.day_of_week === pgDow && d.measurement_type === 'reactive')
      
      return {
        day: dayName,
        dayShort: dayName.slice(0, 3),
        active: activeData?.avg_reading || 0,
        reactive: reactiveData?.avg_reading || 0,
        activeTotal: activeData?.total_reading || 0,
        reactiveTotal: reactiveData?.total_reading || 0,
        isWeekend: idx >= 5,
      }
    })
  }, [dailyPattern])

  // Helper to calculate cost for a reading using pricing config
  const calculateCost = useCallback((kwh, hour, dayOfWeek) => {
    if (!pricingConfig) return null
    
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isHighTariff = !isWeekend && hour >= 7 && hour < 20
    
    const rate = isHighTariff 
      ? pricingConfig.high_tariff_chf_per_kwh 
      : pricingConfig.low_tariff_chf_per_kwh
    
    return kwh * rate
  }, [pricingConfig])

  return {
    // Raw data
    data,
    stats,
    hourlyPattern,
    dailyPattern,
    heatmapData,
    pricingConfig,
    costBreakdown,
    pagination,
    
    // State
    loading,
    error,
    
    // Chart-ready data
    getTimeSeriesData,
    getHourlyChartData,
    getDailyChartData,
    
    // Utilities
    calculateCost,
    
    // Actions
    refetch: fetchData,
  }
}

export default useEnergyData
