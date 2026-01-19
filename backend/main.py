import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from databases import Database

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://exnaton:exnaton@localhost:5432/meter_data")
database = Database(DATABASE_URL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # DB and data are guaranteed ready by docker-compose dependency chain:
    # db (healthy) -> data_loader (healthy) -> backend
    await database.connect()
    yield
    await database.disconnect()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "ok"}



@app.get("/meter_readings/every_third_day")
async def get_readings_every_third_day():
    """
    Fetch the first meter reading for each 3-day period.
    
    Uses TimescaleDB's time_bucket to group data into 3-day intervals,
    then returns the earliest reading within each bucket.
    """
    query = """
        WITH bucketed AS (
            SELECT 
                time_bucket('3 days', timestamp) AS bucket,
                timestamp,
                muid,
                measurement_type,
                reading,
                quality,
                ROW_NUMBER() OVER (
                    PARTITION BY time_bucket('3 days', timestamp), muid, measurement_type 
                    ORDER BY timestamp
                ) AS rn
            FROM meter_readings
        )
        SELECT bucket, timestamp, muid, measurement_type, reading, quality
        FROM bucketed
        WHERE rn = 1
        ORDER BY bucket, muid, measurement_type
    """
    rows = await database.fetch_all(query)
    
    return [
        {
            "bucket": row["bucket"].isoformat(),
            "timestamp": row["timestamp"].isoformat(),
            "muid": row["muid"],
            "measurement_type": row["measurement_type"],
            "reading": row["reading"],
            "quality": row["quality"],
        }
        for row in rows
    ]