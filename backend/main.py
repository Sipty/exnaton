from fastapi import FastAPI

app = FastAPI()

# Simple FastAPI endpoint to test if the server is up and running
@app.get("/hello_world")
def hello_world():
    return {"message": "Hello, World!"}
