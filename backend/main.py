import os
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional
from enum import Enum

from fastapi import FastAPI, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from databases import Database

from energy_pricing import (
    SWISS_ENERGY_CONFIG,
    get_tariff_for_hour,
)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://exnaton:exnaton@localhost:5432/meter_data")
database = Database(DATABASE_URL)


# =============================================================================
# ENUMS & DATA CLASSES
# =============================================================================

class Aggregation(str, Enum):
    RAW = "raw"
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"


class MeterType(str, Enum):
    ACTIVE = "active"
    REACTIVE = "reactive"
    BOTH = "both"


@dataclass
class QueryFilters:
    """Container for parsed query filters."""
    conditions: list[str]
    params: dict
    where_clause: str


# =============================================================================
# RESPONSE MODELS (Pydantic)
# =============================================================================

class PaginationInfo(BaseModel):
    """Pagination metadata for list responses."""
    page: int = Field(..., example=1)
    per_page: int = Field(..., example=10000)
    total_count: int = Field(..., example=8640)
    total_pages: int = Field(..., example=1)
    has_next: bool = Field(..., example=False)
    has_prev: bool = Field(..., example=False)


class TariffHours(BaseModel):
    """Tariff schedule information."""
    start: int | None = Field(None, example=7)
    end: int | None = Field(None, example=20)
    weekdays_only: bool | None = Field(None, example=True)
    description: str = Field(..., example="Mon-Fri 07:00-20:00")


class PricingInfo(BaseModel):
    """Pricing configuration for frontend cost calculations."""
    high_tariff_chf_per_kwh: float = Field(..., example=0.32)
    high_tariff_rappen_per_kwh: int = Field(..., example=32)
    low_tariff_chf_per_kwh: float = Field(..., example=0.22)
    low_tariff_rappen_per_kwh: int = Field(..., example=22)
    high_tariff_hours: TariffHours
    low_tariff_hours: TariffHours


class MeterReading(BaseModel):
    """Individual meter reading record (raw aggregation)."""
    timestamp: str = Field(..., example="2023-03-01T00:00:00")
    measurement_type: str = Field(..., example="active")
    reading: float = Field(..., description="Energy reading in kWh", example=0.0234)
    quality: str | None = Field(None, example="measured")
    hour: int | None = Field(None, ge=0, le=23, example=14)
    day_of_week: int | None = Field(None, ge=0, le=6, example=3)


class AggregatedReading(BaseModel):
    """Aggregated meter reading (hourly/daily/weekly)."""
    timestamp: str = Field(..., example="2023-03-01T00:00:00")
    measurement_type: str = Field(..., example="active")
    reading: float = Field(..., description="Sum of readings in period", example=1.234)
    count: int = Field(..., description="Number of readings aggregated", example=4)
    avg_reading: float = Field(..., example=0.3085)
    min_reading: float = Field(..., example=0.0234)
    max_reading: float = Field(..., example=0.5123)


class StatsSummary(BaseModel):
    """Summary statistics for a measurement type."""
    measurement_type: str = Field(..., example="active")
    total_kwh: float = Field(..., description="Total energy consumed", example=123.4567)
    avg_kwh: float = Field(..., description="Average per reading", example=0.014285)
    min_kwh: float = Field(..., example=0.0001)
    max_kwh: float = Field(..., example=0.8234)
    reading_count: int = Field(..., example=8640)
    peak_hour: int | None = Field(None, ge=0, le=23, description="Hour with highest average consumption", example=19)
    peak_hour_avg: float | None = Field(None, description="Average consumption during peak hour", example=0.0523)


class HourlyPattern(BaseModel):
    """Average consumption pattern for an hour of day."""
    measurement_type: str = Field(..., example="active")
    hour: int = Field(..., ge=0, le=23, example=14)
    avg_reading: float = Field(..., example=0.0234)
    std_reading: float = Field(..., description="Standard deviation", example=0.0089)
    min_reading: float = Field(..., example=0.0012)
    max_reading: float = Field(..., example=0.0892)


class DailyPattern(BaseModel):
    """Average consumption pattern for a day of week."""
    measurement_type: str = Field(..., example="active")
    day_of_week: int = Field(..., ge=0, le=6, description="0=Sunday, 6=Saturday", example=1)
    day_name: str = Field(..., example="Monday")
    avg_reading: float = Field(..., example=0.0234)
    total_reading: float = Field(..., example=12.456)
    count: int = Field(..., example=576)


class HeatmapData(BaseModel):
    """24x7 heatmap matrix for visualization."""
    hours: list[int] = Field(..., description="Hours 0-23")
    days: list[str] = Field(..., description="Day names Sunday-Saturday")
    values: list[list[float]] = Field(..., description="24x7 matrix [hour][day] of average readings")


class TariffBreakdown(BaseModel):
    """Cost breakdown for a single tariff period."""
    kwh: float = Field(..., example=45.67)
    cost_chf: float = Field(..., example=14.61)
    rate_chf_per_kwh: float = Field(..., example=0.32)
    percent_of_total: float = Field(..., example=37.2)


class CostComparison(BaseModel):
    """Hypothetical cost comparison scenarios."""
    all_high_tariff_cost: float = Field(..., description="Cost if all usage was at high tariff", example=39.26)
    all_low_tariff_cost: float = Field(..., description="Cost if all usage was at low tariff", example=27.00)
    potential_savings_chf: float = Field(..., description="Max savings by shifting high tariff usage", example=4.57)


class CostBreakdown(BaseModel):
    """Full cost analysis by tariff period."""
    total_kwh: float = Field(..., example=122.69)
    total_cost_chf: float = Field(..., example=31.45)
    high_tariff: TariffBreakdown
    low_tariff: TariffBreakdown
    effective_rate_chf_per_kwh: float = Field(..., description="Blended rate actually paid", example=0.2564)
    comparison: CostComparison


class MeterReadingsResponse(BaseModel):
    """
    Response from the meter_readings endpoint.
    
    Always includes data, pagination, and pricing.
    Optional fields are included based on the 'include' query parameter.
    """
    data: list[MeterReading | AggregatedReading] = Field(..., description="Meter readings (raw or aggregated)")
    pagination: PaginationInfo
    pricing: PricingInfo
    stats: list[StatsSummary] | None = Field(None, description="Included when include=stats")
    hourly_pattern: list[HourlyPattern] | None = Field(None, description="Included when include=patterns")
    daily_pattern: list[DailyPattern] | None = Field(None, description="Included when include=patterns")
    heatmap: dict[str, HeatmapData] | None = Field(None, description="Included when include=heatmap")
    cost_breakdown: CostBreakdown | None = Field(None, description="Included when include=cost")


# =============================================================================
# PARSING HELPERS
# =============================================================================

def parse_optional_date(value: str | None) -> date | None:
    """Parse date string, returning None for empty strings."""
    if not value or value.strip() == "":
        return None
    return date.fromisoformat(value)


def parse_includes(include: str | None) -> set[str]:
    """Parse comma-separated include string into a set."""
    if not include:
        return set()
    return {i.strip().lower() for i in include.split(",")}


# =============================================================================
# QUERY BUILDING
# =============================================================================

def build_query_filters(
    start_date: date | None,
    end_date: date | None,
    meter: MeterType,
    weekday_only: bool | None,
    weekend_only: bool | None,
) -> QueryFilters:
    """Build SQL WHERE conditions and parameters from filter inputs."""
    conditions = []
    params = {}
    
    if start_date:
        conditions.append("timestamp >= :start")
        params["start"] = datetime.combine(start_date, datetime.min.time())
    
    if end_date:
        conditions.append("timestamp <= :end")
        params["end"] = datetime.combine(end_date, datetime.max.time())
    
    if meter != MeterType.BOTH:
        conditions.append("measurement_type = :meter")
        params["meter"] = meter.value
    
    if weekday_only:
        conditions.append("EXTRACT(DOW FROM timestamp) BETWEEN 1 AND 5")
    elif weekend_only:
        conditions.append("EXTRACT(DOW FROM timestamp) IN (0, 6)")
    
    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    
    return QueryFilters(conditions=conditions, params=params, where_clause=where_clause)


# =============================================================================
# DATA FETCHING FUNCTIONS
# =============================================================================

async def fetch_readings_paginated(
    filters: QueryFilters,
    aggregation: Aggregation,
    page: int,
    per_page: int,
) -> tuple[list[dict], int]:
    """
    Fetch meter readings with optional aggregation and pagination.
    Returns (data, total_count).
    """
    offset = (page - 1) * per_page
    params = {**filters.params, "limit": per_page, "offset": offset}
    
    if aggregation == Aggregation.RAW:
        count_query = f"SELECT COUNT(*) as cnt FROM meter_readings {filters.where_clause}"
        count_result = await database.fetch_one(count_query, filters.params)
        total_count = count_result["cnt"] if count_result else 0
        
        query = f"""
            SELECT 
                timestamp,
                measurement_type,
                reading,
                quality,
                EXTRACT(HOUR FROM timestamp)::int as hour,
                EXTRACT(DOW FROM timestamp)::int as day_of_week
            FROM meter_readings
            {filters.where_clause}
            ORDER BY timestamp, measurement_type
            LIMIT :limit OFFSET :offset
        """
        rows = await database.fetch_all(query, params)
        
        data = [
            {
                "timestamp": row["timestamp"].isoformat(),
                "measurement_type": row["measurement_type"],
                "reading": float(row["reading"]),
                "quality": row["quality"],
                "hour": row["hour"],
                "day_of_week": row["day_of_week"],
            }
            for row in rows
        ]
    else:
        interval = {"hourly": "1 hour", "daily": "1 day", "weekly": "1 week"}[aggregation.value]
        
        count_query = f"""
            SELECT COUNT(*) as cnt FROM (
                SELECT DISTINCT time_bucket('{interval}', timestamp), measurement_type
                FROM meter_readings {filters.where_clause}
            ) sub
        """
        count_result = await database.fetch_one(count_query, filters.params)
        total_count = count_result["cnt"] if count_result else 0
        
        query = f"""
            SELECT 
                time_bucket('{interval}', timestamp) AS timestamp,
                measurement_type,
                SUM(reading) AS reading,
                COUNT(*) AS count,
                AVG(reading) AS avg_reading,
                MIN(reading) AS min_reading,
                MAX(reading) AS max_reading
            FROM meter_readings
            {filters.where_clause}
            GROUP BY time_bucket('{interval}', timestamp), measurement_type
            ORDER BY timestamp, measurement_type
            LIMIT :limit OFFSET :offset
        """
        rows = await database.fetch_all(query, params)
        
        data = [
            {
                "timestamp": row["timestamp"].isoformat(),
                "measurement_type": row["measurement_type"],
                "reading": float(row["reading"]),
                "count": row["count"],
                "avg_reading": float(row["avg_reading"]),
                "min_reading": float(row["min_reading"]),
                "max_reading": float(row["max_reading"]),
            }
            for row in rows
        ]
    
    return data, total_count


async def fetch_statistics(filters: QueryFilters) -> list[dict]:
    """Fetch summary statistics with peak hour analysis."""
    stats_query = f"""
        SELECT 
            measurement_type,
            SUM(reading) AS total,
            AVG(reading) AS avg,
            MIN(reading) AS min,
            MAX(reading) AS max,
            COUNT(*) AS count
        FROM meter_readings
        {filters.where_clause}
        GROUP BY measurement_type
    """
    stats_rows = await database.fetch_all(stats_query, filters.params)
    
    peak_query = f"""
        WITH hourly_avg AS (
            SELECT 
                measurement_type,
                EXTRACT(HOUR FROM timestamp)::int AS hour,
                AVG(reading) AS avg_reading
            FROM meter_readings
            {filters.where_clause}
            GROUP BY measurement_type, EXTRACT(HOUR FROM timestamp)
        )
        SELECT DISTINCT ON (measurement_type)
            measurement_type,
            hour AS peak_hour,
            avg_reading AS peak_avg
        FROM hourly_avg
        ORDER BY measurement_type, avg_reading DESC
    """
    peak_rows = await database.fetch_all(peak_query, filters.params)
    peak_map = {row["measurement_type"]: row for row in peak_rows}
    
    return [
        {
            "measurement_type": row["measurement_type"],
            "total_kwh": round(float(row["total"]), 4),
            "avg_kwh": round(float(row["avg"]), 6),
            "min_kwh": round(float(row["min"]), 6),
            "max_kwh": round(float(row["max"]), 6),
            "reading_count": row["count"],
            "peak_hour": peak_map[row["measurement_type"]]["peak_hour"] if row["measurement_type"] in peak_map else None,
            "peak_hour_avg": round(float(peak_map[row["measurement_type"]]["peak_avg"]), 6) if row["measurement_type"] in peak_map else None,
        }
        for row in stats_rows
    ]


async def fetch_hourly_pattern(filters: QueryFilters) -> list[dict]:
    """Fetch average consumption by hour of day."""
    query = f"""
        SELECT 
            measurement_type,
            EXTRACT(HOUR FROM timestamp)::int AS hour,
            AVG(reading) AS avg_reading,
            STDDEV(reading) AS std_reading,
            MIN(reading) AS min_reading,
            MAX(reading) AS max_reading
        FROM meter_readings
        {filters.where_clause}
        GROUP BY measurement_type, EXTRACT(HOUR FROM timestamp)
        ORDER BY measurement_type, hour
    """
    rows = await database.fetch_all(query, filters.params)
    
    return [
        {
            "measurement_type": row["measurement_type"],
            "hour": row["hour"],
            "avg_reading": round(float(row["avg_reading"]), 6),
            "std_reading": round(float(row["std_reading"]), 6) if row["std_reading"] else 0,
            "min_reading": round(float(row["min_reading"]), 6),
            "max_reading": round(float(row["max_reading"]), 6),
        }
        for row in rows
    ]


async def fetch_daily_pattern(filters: QueryFilters) -> list[dict]:
    """Fetch average consumption by day of week."""
    query = f"""
        SELECT 
            measurement_type,
            EXTRACT(DOW FROM timestamp)::int AS day_of_week,
            AVG(reading) AS avg_reading,
            SUM(reading) AS total_reading,
            COUNT(*) AS count
        FROM meter_readings
        {filters.where_clause}
        GROUP BY measurement_type, EXTRACT(DOW FROM timestamp)
        ORDER BY measurement_type, day_of_week
    """
    rows = await database.fetch_all(query, filters.params)
    
    day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    
    return [
        {
            "measurement_type": row["measurement_type"],
            "day_of_week": row["day_of_week"],
            "day_name": day_names[row["day_of_week"]],
            "avg_reading": round(float(row["avg_reading"]), 6),
            "total_reading": round(float(row["total_reading"]), 4),
            "count": row["count"],
        }
        for row in rows
    ]


async def fetch_heatmap(filters: QueryFilters) -> dict[str, dict]:
    """Fetch 24x7 heatmap matrices for active and reactive energy."""
    day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    heatmaps = {}
    
    # Build params without meter filter
    heatmap_params = {k: v for k, v in filters.params.items() if k != "meter"}
    
    for meter_type in ["active", "reactive"]:
        # Build heatmap-specific where clause
        heatmap_conditions = [c for c in filters.conditions if "measurement_type" not in c]
        heatmap_conditions.append("measurement_type = :heatmap_meter")
        heatmap_where = f"WHERE {' AND '.join(heatmap_conditions)}"
        
        query = f"""
            SELECT 
                EXTRACT(HOUR FROM timestamp)::int AS hour,
                EXTRACT(DOW FROM timestamp)::int AS day_of_week,
                AVG(reading) AS avg_reading
            FROM meter_readings
            {heatmap_where}
            GROUP BY EXTRACT(HOUR FROM timestamp), EXTRACT(DOW FROM timestamp)
            ORDER BY hour, day_of_week
        """
        rows = await database.fetch_all(query, {**heatmap_params, "heatmap_meter": meter_type})
        
        # Build 24x7 matrix
        matrix = [[0.0 for _ in range(7)] for _ in range(24)]
        for row in rows:
            matrix[row["hour"]][row["day_of_week"]] = round(float(row["avg_reading"]), 6)
        
        heatmaps[meter_type] = {
            "hours": list(range(24)),
            "days": day_names,
            "values": matrix,
        }
    
    return heatmaps


async def fetch_cost_breakdown(filters: QueryFilters) -> dict:
    """Calculate cost breakdown by tariff period."""
    # Build cost-specific params and where clause (active energy only)
    cost_params = {k: v for k, v in filters.params.items() if k != "meter"}
    cost_conditions = [c for c in filters.conditions if "measurement_type" not in c]
    cost_conditions.append("measurement_type = 'active'")
    cost_where = f"WHERE {' AND '.join(cost_conditions)}"
    
    query = f"""
        SELECT 
            EXTRACT(HOUR FROM timestamp)::int AS hour,
            EXTRACT(DOW FROM timestamp)::int AS day_of_week,
            SUM(reading) AS total_kwh
        FROM meter_readings
        {cost_where}
        GROUP BY EXTRACT(HOUR FROM timestamp), EXTRACT(DOW FROM timestamp)
    """
    rows = await database.fetch_all(query, cost_params)
    
    # Calculate costs by tariff
    ht_rate = SWISS_ENERGY_CONFIG["high_tariff"]["rate_chf_per_kwh"]
    lt_rate = SWISS_ENERGY_CONFIG["low_tariff"]["rate_chf_per_kwh"]
    
    high_tariff_kwh = 0.0
    low_tariff_kwh = 0.0
    
    for row in rows:
        kwh = float(row["total_kwh"])
        is_weekend = row["day_of_week"] in (0, 6)
        tariff = get_tariff_for_hour(row["hour"], is_weekend)
        
        if tariff["tariff"] == "high":
            high_tariff_kwh += kwh
        else:
            low_tariff_kwh += kwh
    
    total_kwh = high_tariff_kwh + low_tariff_kwh
    high_cost = high_tariff_kwh * ht_rate
    low_cost = low_tariff_kwh * lt_rate
    total_cost = high_cost + low_cost
    
    return {
        "total_kwh": round(total_kwh, 2),
        "total_cost_chf": round(total_cost, 2),
        "high_tariff": {
            "kwh": round(high_tariff_kwh, 2),
            "cost_chf": round(high_cost, 2),
            "rate_chf_per_kwh": ht_rate,
            "percent_of_total": round(high_tariff_kwh / total_kwh * 100, 1) if total_kwh > 0 else 0,
        },
        "low_tariff": {
            "kwh": round(low_tariff_kwh, 2),
            "cost_chf": round(low_cost, 2),
            "rate_chf_per_kwh": lt_rate,
            "percent_of_total": round(low_tariff_kwh / total_kwh * 100, 1) if total_kwh > 0 else 0,
        },
        "effective_rate_chf_per_kwh": round(total_cost / total_kwh, 4) if total_kwh > 0 else 0,
        "comparison": {
            "all_high_tariff_cost": round(total_kwh * ht_rate, 2),
            "all_low_tariff_cost": round(total_kwh * lt_rate, 2),
            "potential_savings_chf": round(high_tariff_kwh * (ht_rate - lt_rate), 2),
        },
    }


# =============================================================================
# RESPONSE BUILDERS
# =============================================================================

def build_pagination_response(page: int, per_page: int, total_count: int) -> dict:
    """Build pagination metadata."""
    return {
        "page": page,
        "per_page": per_page,
        "total_count": total_count,
        "total_pages": max(1, (total_count + per_page - 1) // per_page),
        "has_next": page * per_page < total_count,
        "has_prev": page > 1,
    }


def build_pricing_response() -> dict:
    """Build pricing information for frontend calculations."""
    return {
        "high_tariff_chf_per_kwh": SWISS_ENERGY_CONFIG["high_tariff"]["rate_chf_per_kwh"],
        "high_tariff_rappen_per_kwh": SWISS_ENERGY_CONFIG["high_tariff"]["rate_rappen_per_kwh"],
        "low_tariff_chf_per_kwh": SWISS_ENERGY_CONFIG["low_tariff"]["rate_chf_per_kwh"],
        "low_tariff_rappen_per_kwh": SWISS_ENERGY_CONFIG["low_tariff"]["rate_rappen_per_kwh"],
        "high_tariff_hours": {
            "start": 7,
            "end": 20,
            "weekdays_only": True,
            "description": "Mon-Fri 07:00-20:00",
        },
        "low_tariff_hours": {
            "description": "Mon-Fri 20:00-07:00 and all weekend",
        },
    }


# =============================================================================
# CACHING
# =============================================================================

def add_cache_headers(response: Response, max_age: int = 300, is_static: bool = False):
    """Add caching headers to response."""
    if is_static:
        response.headers["Cache-Control"] = "public, max-age=86400"
    else:
        response.headers["Cache-Control"] = f"public, max-age={max_age}"
    response.headers["Vary"] = "Accept-Encoding"


# =============================================================================
# APP SETUP
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.connect()
    yield
    await database.disconnect()


app = FastAPI(
    title="Exnaton Energy API",
    description="Unified API for residential energy meter readings with time-series aggregations, usage patterns, and cost analysis.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# ENDPOINTS
# =============================================================================

@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/pricing/config")
async def get_pricing_config(response: Response):
    """Get full energy pricing configuration (static, cached 24h)."""
    add_cache_headers(response, is_static=True)
    return SWISS_ENERGY_CONFIG


@app.get("/meter_readings", response_model=MeterReadingsResponse)
async def get_meter_readings(
    response: Response,
    start: Optional[str] = Query(None, description="Start date (inclusive) - YYYY-MM-DD", example="2023-03-01"),
    end: Optional[str] = Query(None, description="End date (inclusive) - YYYY-MM-DD", example="2023-03-31"),
    meter: MeterType = Query(MeterType.BOTH, description="Meter type: active, reactive, or both"),
    aggregation: Aggregation = Query(Aggregation.RAW, description="Aggregation level: raw, hourly, daily, weekly"),
    weekday_only: Optional[bool] = Query(None, description="Filter to weekdays only (Mon-Fri)", example=False),
    weekend_only: Optional[bool] = Query(None, description="Filter to weekends only (Sat-Sun)", example=False),
    page: int = Query(1, ge=1, description="Page number (1-indexed)", example=1),
    per_page: int = Query(10000, ge=100, le=50000, description="Results per page (default: 10000 ≈ 1 month)", example=10000),
    include: Optional[str] = Query(None, description="Comma-separated: stats,patterns,heatmap,cost", example="stats,cost"),
):
    """
    Unified meter readings endpoint with optional aggregations.
    
    ### Include Options
    - **stats**: Summary statistics (total, avg, min, max, peak hour)
    - **patterns**: Hourly and daily consumption patterns
    - **heatmap**: 24x7 heatmap matrices for active & reactive
    - **cost**: Cost breakdown by high/low tariff
    
    ### Response
    Always includes `data`, `pagination`, and `pricing`.
    """
    # Parse inputs
    start_date = parse_optional_date(start)
    end_date = parse_optional_date(end)
    includes = parse_includes(include)
    
    # Build query filters
    filters = build_query_filters(start_date, end_date, meter, weekday_only, weekend_only)
    
    # Fetch main data
    data, total_count = await fetch_readings_paginated(filters, aggregation, page, per_page)
    
    # Build response
    result = {
        "data": data,
        "pagination": build_pagination_response(page, per_page, total_count),
        "pricing": build_pricing_response(),
    }
    
    # Add optional includes
    if "stats" in includes:
        result["stats"] = await fetch_statistics(filters)
    
    if "patterns" in includes:
        result["hourly_pattern"] = await fetch_hourly_pattern(filters)
        result["daily_pattern"] = await fetch_daily_pattern(filters)
    
    if "heatmap" in includes:
        result["heatmap"] = await fetch_heatmap(filters)
    
    if "cost" in includes:
        result["cost_breakdown"] = await fetch_cost_breakdown(filters)
    
    add_cache_headers(response)
    return result
