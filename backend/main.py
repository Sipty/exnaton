import math
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from databases import Database

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://exnaton:exnaton@localhost:5432/meter_data")
database = Database(DATABASE_URL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.connect()
    yield
    await database.disconnect()


app = FastAPI(lifespan=lifespan)


@app.get("/hello_world")
def hello_world():
    """Simple endpoint to test if the server is up and running."""
    return {"message": "Hello, World!"}


@app.get("/hello_big_bang")
async def hello_big_bang():
    """Fetch the first event in the universe from TimescaleDB."""
    query = "SELECT time, event, energy FROM universe ORDER BY time LIMIT 1"
    row = await database.fetch_one(query)
    if row:
        energy = row["energy"]
        # JSON doesn't support Infinity, so convert to string
        if math.isinf(energy):
            energy = "Infinity"
        return {
            "time": row["time"].isoformat(),
            "event": row["event"],
            "energy": energy,
        }
    return {"message": "What are you doing here? - God"}
