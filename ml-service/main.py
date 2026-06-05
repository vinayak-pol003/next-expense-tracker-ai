from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from schemas import ForecastRequest
from forecast_model import random_forest_forecast

app = FastAPI(title="ExpenseTracker ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/forecast")
def forecast(request: ForecastRequest):
    return random_forest_forecast(request.records, request.days)
