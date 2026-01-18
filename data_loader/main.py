"""
Data Loader Service

Fetches energy meter data from S3 endpoints, transforms it to the required schema,
and performs upserts to PostgreSQL every 15 minutes.

This service is responsible for:
1. Creating the database schema on startup
2. Loading initial data and subsequent syncs
3. Signaling readiness to dependent services (backend)
"""

import os
import time
import logging
from datetime import datetime
from pathlib import Path

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import requests
import schedule

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Health marker file - signals that initial sync is complete
HEALTH_MARKER = Path("/tmp/data_loader_ready")

# =============================================================================
# S3 ENDPOINTS (SIMULATING AN API)
# =============================================================================
# In a real-world scenario, we would NOT be fetching from static S3 JSON files.
# Instead, we'd have a proper API that supports query parameters like:
#
#     GET /api/meters/{muid}/readings?after=2023-02-28T23:45:00Z
#
# This would allow us to fetch ONLY new data since our last sync, rather than
# downloading the entire dataset every time. The API might also support:
#   - Pagination (limit/offset or cursor-based)
#   - Webhooks to push new data to us
#   - Last-Modified headers for cache validation
#
# Since we're working with static S3 files that always return the full dataset,
# we implement a client-side optimization: we query our database for the latest
# timestamp we already have, and filter out records we've already processed.
# This avoids unnecessary database writes on subsequent syncs.
# =============================================================================
METER_URLS = {
    "active": "https://exnaton-public-s3-bucket20230329123331528000000001.s3.eu-central-1.amazonaws.com/challenge/95ce3367-cbce-4a4d-bbe3-da082831d7bd.json",
    "reactive": "https://exnaton-public-s3-bucket20230329123331528000000001.s3.eu-central-1.amazonaws.com/challenge/1db7649e-9342-4e04-97c7-f0ebb88ed1f8.json",
}

# OBIS codes mapping to measurement types (Note: This would be verified with the provider/ or my fellow ds folk.)
OBIS_CODES = {
    "0100011D00FF": "active",
    "0100021D00FF": "reactive",
}

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://exnaton:exnaton@localhost:5432/meter_data")


def get_db_connection():
    """Create a database connection."""
    return psycopg2.connect(DATABASE_URL)


def init_schema():
    """
    Initialize database schema - creates tables if they don't exist.
    This makes the data_loader the single source of truth for schema management.
    """
    logger.info("Initializing database schema...")
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Create meter_readings table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS meter_readings (
                    timestamp TIMESTAMPTZ NOT NULL,
                    muid TEXT NOT NULL,
                    measurement_type TEXT NOT NULL,
                    reading DOUBLE PRECISION NOT NULL,
                    quality TEXT,
                    UNIQUE (muid, timestamp, measurement_type)
                )
            """)
            
            # Convert to hypertable if not already (idempotent)
            cur.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM timescaledb_information.hypertables 
                    WHERE hypertable_name = 'meter_readings'
                )
            """)
            is_hypertable = cur.fetchone()[0]
            
            if not is_hypertable:
                cur.execute("SELECT create_hypertable('meter_readings', 'timestamp')")
                logger.info("Created hypertable for meter_readings")
            else:
                logger.info("meter_readings hypertable already exists")
            
            conn.commit()
            logger.info("Schema initialization complete")
    finally:
        conn.close()


def get_latest_timestamp(muid: str, measurement_type: str) -> datetime | None:
    """
    Get the latest timestamp we already have in the database for this meter.
    
    This is used to filter out records we've already processed, avoiding
    unnecessary database writes on subsequent syncs.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT MAX(timestamp) 
                FROM meter_readings 
                WHERE muid = %s AND measurement_type = %s
                """,
                (muid, measurement_type)
            )
            result = cur.fetchone()
            return result[0] if result and result[0] else None
    finally:
        conn.close()


def fetch_meter_data(url: str) -> dict:
    """Fetch meter data from S3 endpoint."""
    logger.info(f"Fetching data from {url[:80]}...")
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.json()


def transform_data(raw_data: dict, measurement_type: str) -> pd.DataFrame:
    """
    Transform raw S3 data to normalized schema.
    
    Raw format:
    {
        "measurement": "energy",
        "timestamp": "2023-02-28T23:45:00.000Z",
        "tags": {"muid": "...", "quality": "measured"},
        "0100011D00FF": 0.0117
    }
    
    Transformed format:
    {
        "timestamp": datetime,
        "muid": str,
        "measurement_type": str,
        "reading": float,
        "quality": str
    }
    """
    df = pd.DataFrame(raw_data["data"])
    
    # Find the OBIS code column (the one that's not a standard column)
    standard_cols = {"measurement", "timestamp", "tags"}
    obis_col = [col for col in df.columns if col not in standard_cols][0]
    
    # Extract muid and quality from tags
    df["muid"] = df["tags"].apply(lambda x: x["muid"])
    df["quality"] = df["tags"].apply(lambda x: x.get("quality", "unknown"))
    
    # Rename OBIS code column to reading
    df["reading"] = df[obis_col]
    
    # Add measurement type
    df["measurement_type"] = measurement_type
    
    # Convert timestamp to datetime
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    
    # Select only the columns we need
    return df[["timestamp", "muid", "measurement_type", "reading", "quality"]]


def upsert_data(df: pd.DataFrame) -> int:
    """
    Upsert data to PostgreSQL using INSERT ... ON CONFLICT DO UPDATE.
    Returns the number of rows affected.
    """
    if df.empty:
        logger.warning("No data to upsert")
        return 0
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Prepare data as list of tuples
            records = [
                (row.timestamp, row.muid, row.measurement_type, row.reading, row.quality)
                for row in df.itertuples(index=False)
            ]
            
            # Upsert query
            query = """
                INSERT INTO meter_readings (timestamp, muid, measurement_type, reading, quality)
                VALUES %s
                ON CONFLICT (muid, timestamp, measurement_type)
                DO UPDATE SET
                    reading = EXCLUDED.reading,
                    quality = EXCLUDED.quality
            """
            
            execute_values(cur, query, records)
            conn.commit()
            
            return len(records)
    finally:
        conn.close()


def run_sync():
    """Run a full sync: fetch, transform, and upsert data for all meters."""
    logger.info("=" * 50)
    logger.info(f"Starting data sync at {datetime.now().isoformat()}")
    
    total_rows = 0
    
    for measurement_type, url in METER_URLS.items():
        try:
            # Fetch (we have to fetch everything since S3 doesn't support filtering)
            raw_data = fetch_meter_data(url)
            total_fetched = len(raw_data.get("data", []))
            logger.info(f"Fetched {total_fetched} records for {measurement_type}")
            
            # Transform
            df = transform_data(raw_data, measurement_type)
            
            # Filter out records we already have
            # (In a real API, we'd request only data after this timestamp)
            if not df.empty:
                # Each S3 file should contain data for a single meter
                muid = df["muid"].iloc[0]
                if df["muid"].nunique() > 1:
                    logger.warning(
                        f"Expected single muid in {measurement_type} data, "
                        f"found {df['muid'].nunique()}: {df['muid'].unique().tolist()}"
                    )
                
                latest_ts = get_latest_timestamp(muid, measurement_type)
                
                if latest_ts:
                    original_count = len(df)
                    df = df[df["timestamp"] > latest_ts]
                    logger.info(
                        f"Filtered to {len(df)} new records "
                        f"(had {original_count}, latest in DB: {latest_ts.isoformat()})"
                    )
                else:
                    logger.info(f"First sync for {muid} - inserting all {len(df)} records")
            
            # Skip upsert if no new data
            if df.empty:
                logger.info(f"No new data for {measurement_type}, skipping upsert")
                continue
            
            # Upsert only new records
            rows_affected = upsert_data(df)
            total_rows += rows_affected
            logger.info(f"Inserted {rows_affected} new records for {measurement_type}")
            
        except requests.RequestException as e:
            logger.error(f"Failed to fetch data for {measurement_type}: {e}")
        except Exception as e:
            logger.error(f"Error processing {measurement_type}: {e}")
            raise
    
    logger.info(f"Sync complete. Total new rows inserted: {total_rows}")
    logger.info("=" * 50)


def main():
    """Main entry point."""
    logger.info("Data Loader Service starting...")
    
    # Step 1: Initialize schema (creates tables if needed)
    init_schema()
    
    # Step 2: Run initial sync
    run_sync()
    
    # Step 3: Signal readiness to dependent services
    HEALTH_MARKER.touch()
    logger.info(f"Health marker created at {HEALTH_MARKER} - ready for dependents")
    
    # Schedule sync every 15 minutes
    schedule.every(15).minutes.do(run_sync)
    logger.info("Scheduled sync every 15 minutes")
    
    # Keep running
    while True:
        schedule.run_pending()
        time.sleep(1)


if __name__ == "__main__":
    main()
