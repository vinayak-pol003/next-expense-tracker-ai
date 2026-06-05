from pydantic import BaseModel
from typing import List, Optional


class ExpenseRecord(BaseModel):
    id: str
    text: str
    amount: float
    category: str
    date: str


class ForecastRequest(BaseModel):
    records: List[ExpenseRecord]
    days: int = 7
    model: Optional[str] = "random_forest"


class ForecastDay(BaseModel):
    date: str
    predicted_amount: float


class ForecastResponse(BaseModel):
    model: str
    next_7_days_total: float
    monthly_predicted_total: float
    confidence: str
    forecast: List[ForecastDay]
