# Expense Forecasting ML Feature Implementation

## 1. Feature Overview

This feature predicts a user's upcoming expenses based on their previous expense history. The first production-ready ML version should use **Random Forest Regression**, with **XGBoost Regression** added later as an advanced option.

The feature will predict:

- Next 7 days daily expense amounts
- Total predicted spending for the next 7 days
- Estimated month-end total spending
- Confidence level based on available user data
- Optional category-wise future spending

Example output:

```json
{
  "model": "RandomForestRegressor",
  "next_7_days_total": 420.75,
  "monthly_predicted_total": 1650.25,
  "confidence": "Medium",
  "forecast": [
    {
      "date": "2026-06-05",
      "predicted_amount": 52.4
    },
    {
      "date": "2026-06-06",
      "predicted_amount": 71.2
    }
  ]
}
```

## 2. Why Use Python For ML

The current app is built with Next.js, TypeScript, Prisma, PostgreSQL, Clerk, Chart.js, and OpenRouter. These are excellent for the web app, authentication, database, UI, and LLM-based insights.

For ML forecasting, Python is better because it has mature ML libraries:

- `pandas` for data processing
- `scikit-learn` for Random Forest Regression
- `xgboost` for XGBoost Regression
- `joblib` for saving/loading models
- `FastAPI` for exposing ML predictions as an API

The recommended architecture is:

```txt
Next.js App
  |
  | HTTP JSON request
  v
Python FastAPI ML Service
  |
  | preprocesses records and runs model
  v
Forecast JSON returned to Next.js
```

## 3. High-Level Architecture

Recommended folder structure:

```txt
next-expense-tracker-ai/
  app/
    actions/
      getExpenseForecast.ts
  components/
    ExpenseForecast.tsx
    ForecastChart.tsx
  lib/
    forecast.ts
  prisma/
    schema.prisma
  ml-service/
    main.py
    forecast_model.py
    schemas.py
    requirements.txt
    README.md
    models/
      .gitkeep
```

Runtime flow:

```txt
User opens dashboard
      |
Next.js server action fetches user's expense records from PostgreSQL
      |
Next.js sends records to Python FastAPI /forecast endpoint
      |
Python groups records by day and creates ML features
      |
RandomForestRegressor trains/predicts
      |
Python returns forecast JSON
      |
Next.js displays forecast card and chart
```

## 4. Current Data Available

Current Prisma schema has:

```prisma
model Record {
  id        String   @id @default(uuid())
  text      String
  amount    Float
  category  String   @default("Other")
  date      DateTime @default(now())
  userId    String
  user      User     @relation(fields: [userId], references: [clerkUserId], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@index([userId])
}
```

This is enough for the first forecasting version.

Useful fields:

- `amount`: target value source
- `category`: category-level features
- `date`: time-series grouping
- `text`: optional future feature for merchant/description patterns
- `userId`: user isolation

## 5. Data Transformation

Raw expense records are transaction-level data.

Example:

```txt
2026-06-01 Food 20
2026-06-01 Transportation 10
2026-06-02 Shopping 80
```

For forecasting, convert them into daily totals:

```txt
2026-06-01 total = 30
2026-06-02 total = 80
```

Also create category totals per day:

```txt
date        total  Food  Transportation  Shopping  Bills
2026-06-01  30     20    10              0         0
2026-06-02  80     0     0               80        0
```

Missing dates should be filled with `0`, otherwise the model will not understand days where no spending happened.

## 6. ML Features

For each day, create features such as:

```txt
day_of_week
day_of_month
month
is_weekend
previous_day_spending
last_3_days_average
last_7_days_average
last_14_days_average
last_30_days_average
food_total
transportation_total
shopping_total
entertainment_total
bills_total
healthcare_total
other_total
```

Target:

```txt
daily_total_expense
```

Example training row:

```txt
date: 2026-06-03
day_of_week: 2
day_of_month: 3
month: 6
is_weekend: 0
previous_day_spending: 80
last_7_days_average: 55
food_total: 20
transportation_total: 10
shopping_total: 0
target: 65
```

The model learns:

```txt
date/category/history features -> daily total expense
```

## 7. Model Choices

### Random Forest Regressor

Use first.

Benefits:

- Easy to implement
- Good with small and medium datasets
- Handles nonlinear spending behavior
- Available in `scikit-learn`
- Easier to explain in documentation and project review

Suggested configuration:

```python
RandomForestRegressor(
    n_estimators=200,
    random_state=42,
    min_samples_leaf=2
)
```

### XGBoost Regressor

Add later as an advanced model.

Benefits:

- Often more accurate
- Strong tabular ML model
- Good for project presentation

Tradeoffs:

- Extra dependency
- More tuning required
- Slightly more deployment complexity

Suggested configuration:

```python
XGBRegressor(
    n_estimators=300,
    learning_rate=0.05,
    max_depth=3,
    random_state=42
)
```

## 8. Data Availability Strategy

Forecasting quality depends on how much user data exists.

Recommended logic:

```txt
0-6 days of data:
  Show "Need more data for forecast"

7-29 days of data:
  Use moving average fallback

30+ days of data:
  Use Random Forest Regression

90+ days of data:
  Random Forest or XGBoost should work better
```

Confidence rules:

```txt
Less than 14 days: Low
14-59 days: Medium
60+ days: High
```

## 9. Python ML Service

Create:

```txt
ml-service/
  main.py
  forecast_model.py
  schemas.py
  requirements.txt
```

### requirements.txt

```txt
fastapi
uvicorn
pandas
scikit-learn
pydantic
python-dateutil
```

For XGBoost later:

```txt
xgboost
```

### schemas.py

```python
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
```

### forecast_model.py

Core responsibilities:

- Convert records to DataFrame
- Group by date
- Fill missing dates
- Create features
- Train model
- Predict future dates
- Return forecast response

Basic implementation outline:

```python
import pandas as pd
from datetime import timedelta
from sklearn.ensemble import RandomForestRegressor


CATEGORIES = [
    "Food",
    "Transportation",
    "Entertainment",
    "Shopping",
    "Bills",
    "Healthcare",
    "Other",
]


def build_daily_frame(records):
    df = pd.DataFrame([record.model_dump() for record in records])

    if df.empty:
        return pd.DataFrame()

    df["date"] = pd.to_datetime(df["date"]).dt.date
    df["category"] = df["category"].fillna("Other")

    totals = df.groupby("date")["amount"].sum().reset_index(name="total")
    category_totals = (
        df.pivot_table(
            index="date",
            columns="category",
            values="amount",
            aggfunc="sum",
            fill_value=0,
        )
        .reset_index()
    )

    daily = totals.merge(category_totals, on="date", how="left")
    daily["date"] = pd.to_datetime(daily["date"])

    full_range = pd.date_range(daily["date"].min(), daily["date"].max(), freq="D")
    daily = daily.set_index("date").reindex(full_range).fillna(0)
    daily.index.name = "date"
    daily = daily.reset_index()

    for category in CATEGORIES:
        if category not in daily.columns:
            daily[category] = 0

    return daily


def add_features(daily):
    daily = daily.copy()
    daily["day_of_week"] = daily["date"].dt.dayofweek
    daily["day_of_month"] = daily["date"].dt.day
    daily["month"] = daily["date"].dt.month
    daily["is_weekend"] = daily["day_of_week"].isin([5, 6]).astype(int)
    daily["previous_day_spending"] = daily["total"].shift(1).fillna(0)
    daily["last_3_days_average"] = daily["total"].shift(1).rolling(3).mean().fillna(0)
    daily["last_7_days_average"] = daily["total"].shift(1).rolling(7).mean().fillna(0)
    daily["last_14_days_average"] = daily["total"].shift(1).rolling(14).mean().fillna(0)
    daily["last_30_days_average"] = daily["total"].shift(1).rolling(30).mean().fillna(0)
    return daily


def get_confidence(days_count):
    if days_count < 14:
        return "Low"
    if days_count < 60:
        return "Medium"
    return "High"


def moving_average_forecast(daily, days):
    avg = daily["total"].tail(min(14, len(daily))).mean()
    last_date = daily["date"].max()

    forecast = []
    for index in range(1, days + 1):
        forecast_date = last_date + timedelta(days=index)
        forecast.append({
            "date": forecast_date.date().isoformat(),
            "predicted_amount": round(float(max(avg, 0)), 2),
        })

    return forecast


def random_forest_forecast(records, days=7):
    daily = build_daily_frame(records)

    if daily.empty or len(daily) < 7:
        return {
            "model": "InsufficientData",
            "next_7_days_total": 0,
            "monthly_predicted_total": 0,
            "confidence": "Low",
            "forecast": [],
        }

    if len(daily) < 30:
        forecast = moving_average_forecast(daily, days)
        total = sum(item["predicted_amount"] for item in forecast)
        return {
            "model": "MovingAverageFallback",
            "next_7_days_total": round(total, 2),
            "monthly_predicted_total": round(daily["total"].sum() + total, 2),
            "confidence": get_confidence(len(daily)),
            "forecast": forecast,
        }

    featured = add_features(daily)

    feature_columns = [
        "day_of_week",
        "day_of_month",
        "month",
        "is_weekend",
        "previous_day_spending",
        "last_3_days_average",
        "last_7_days_average",
        "last_14_days_average",
        "last_30_days_average",
        *CATEGORIES,
    ]

    x = featured[feature_columns]
    y = featured["total"]

    model = RandomForestRegressor(
        n_estimators=200,
        random_state=42,
        min_samples_leaf=2,
    )
    model.fit(x, y)

    history = daily.copy()
    forecast = []

    for index in range(1, days + 1):
        next_date = history["date"].max() + timedelta(days=1)
        future_row = {
            "date": next_date,
            "total": 0,
            **{category: 0 for category in CATEGORIES},
        }

        temp = pd.concat([history, pd.DataFrame([future_row])], ignore_index=True)
        temp = add_features(temp)
        prediction_input = temp.iloc[[-1]][feature_columns]
        prediction = max(float(model.predict(prediction_input)[0]), 0)

        forecast.append({
            "date": next_date.date().isoformat(),
            "predicted_amount": round(prediction, 2),
        })

        future_row["total"] = prediction
        history = pd.concat([history, pd.DataFrame([future_row])], ignore_index=True)

    next_7_total = sum(item["predicted_amount"] for item in forecast)

    today = pd.Timestamp.today()
    current_month_actual = daily[
        (daily["date"].dt.month == today.month) &
        (daily["date"].dt.year == today.year)
    ]["total"].sum()

    monthly_predicted_total = current_month_actual + next_7_total

    return {
        "model": "RandomForestRegressor",
        "next_7_days_total": round(next_7_total, 2),
        "monthly_predicted_total": round(float(monthly_predicted_total), 2),
        "confidence": get_confidence(len(daily)),
        "forecast": forecast,
    }
```

### main.py

```python
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
```

Run locally:

```bash
cd ml-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## 10. Next.js Integration

### Environment Variable

Add to `.env`:

```env
ML_API_URL="http://localhost:8000"
```

For production:

```env
ML_API_URL="https://your-ml-service-url.com"
```

### Server Action

Create:

```txt
app/actions/getExpenseForecast.ts
```

Example:

```ts
'use server';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export interface ForecastDay {
  date: string;
  predicted_amount: number;
}

export interface ExpenseForecastResponse {
  model: string;
  next_7_days_total: number;
  monthly_predicted_total: number;
  confidence: string;
  forecast: ForecastDay[];
  error?: string;
}

export async function getExpenseForecast(): Promise<ExpenseForecastResponse> {
  const { userId } = await auth();

  if (!userId) {
    return {
      model: 'Unavailable',
      next_7_days_total: 0,
      monthly_predicted_total: 0,
      confidence: 'Low',
      forecast: [],
      error: 'User not found',
    };
  }

  try {
    const records = await db.record.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
      take: 365,
    });

    const mlApiUrl = process.env.ML_API_URL || 'http://localhost:8000';

    const response = await fetch(`${mlApiUrl}/forecast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        days: 7,
        model: 'random_forest',
        records: records.map((record) => ({
          id: record.id,
          text: record.text,
          amount: record.amount,
          category: record.category || 'Other',
          date: record.date.toISOString(),
        })),
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('ML forecast service returned an error');
    }

    return await response.json();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P1001'
    ) {
      return {
        model: 'Unavailable',
        next_7_days_total: 0,
        monthly_predicted_total: 0,
        confidence: 'Low',
        forecast: [],
        error: 'Database connection unavailable',
      };
    }

    console.error('Error getting expense forecast:', error);

    return {
      model: 'Unavailable',
      next_7_days_total: 0,
      monthly_predicted_total: 0,
      confidence: 'Low',
      forecast: [],
      error: 'Unable to generate forecast',
    };
  }
}
```

## 11. UI Components

Create:

```txt
components/ExpenseForecast.tsx
components/ForecastChart.tsx
```

### ExpenseForecast Component Responsibilities

Display:

- Next 7 days predicted total
- Month-end predicted total
- Model name
- Confidence level
- 7-day forecast chart
- Empty state when there is not enough data
- Error state when Python service is offline

Suggested placement:

```tsx
// app/page.tsx
<RecordChart />
<ExpenseStats />
<ExpenseForecast />
```

or full-width below analytics:

```tsx
<AIInsights />
<ExpenseForecast />
<RecordHistory />
```

### UI Copy

Use clear labels:

```txt
Expense Forecast
Next 7 Days
Month-End Estimate
Confidence
Model
```

Avoid overclaiming accuracy. Prefer:

```txt
Predicted
Estimated
Based on your past spending
```

## 12. Optional Database Changes

The first version can call the Python service live and does not need schema changes.

For better performance and history, add a forecast cache later.

Example:

```prisma
model ExpenseForecast {
  id                    String   @id @default(uuid())
  userId                String
  model                 String
  confidence            String
  next7DaysTotal        Float
  monthlyPredictedTotal Float
  forecastJson          Json
  createdAt             DateTime @default(now())

  @@index([userId])
  @@index([createdAt])
}
```

Benefits:

- Avoid repeated ML calls
- Show previous forecasts
- Compare forecast vs actual later
- Improve project documentation

## 13. Forecast Evaluation

To make the feature more complete, evaluate model quality.

Useful metrics:

- MAE: Mean Absolute Error
- RMSE: Root Mean Squared Error
- MAPE: Mean Absolute Percentage Error

Example:

```txt
MAE = average absolute difference between predicted and actual spending
```

Add later:

```json
{
  "metrics": {
    "mae": 12.4,
    "rmse": 18.9
  }
}
```

Evaluation strategy:

- Train on first 80% of days
- Test on last 20% of days
- Calculate MAE/RMSE
- Return confidence based on data volume and error

## 14. XGBoost Upgrade Plan

After Random Forest works:

1. Add `xgboost` to `requirements.txt`.
2. Add model switch in request:

```json
{
  "model": "xgboost",
  "days": 7,
  "records": []
}
```

3. Implement:

```python
from xgboost import XGBRegressor
```

4. Compare model performance:

```txt
Random Forest MAE: 18.5
XGBoost MAE: 15.2
```

5. Use the better model automatically if enough data exists.

Recommended behavior:

```txt
30-89 days: Random Forest
90+ days: Compare Random Forest and XGBoost
```

## 15. API Contract

### Request

Endpoint:

```txt
POST /forecast
```

Body:

```json
{
  "days": 7,
  "model": "random_forest",
  "records": [
    {
      "id": "record-id",
      "text": "Coffee",
      "amount": 5.5,
      "category": "Food",
      "date": "2026-06-01T10:30:00.000Z"
    }
  ]
}
```

### Response

```json
{
  "model": "RandomForestRegressor",
  "next_7_days_total": 420.75,
  "monthly_predicted_total": 1650.25,
  "confidence": "Medium",
  "forecast": [
    {
      "date": "2026-06-05",
      "predicted_amount": 52.4
    }
  ]
}
```

## 16. Local Development Commands

Terminal 1:

```bash
npm run dev
```

Terminal 2:

```bash
cd ml-service
.venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

Check Python service:

```bash
curl http://localhost:8000/health
```

Expected:

```json
{
  "status": "ok"
}
```

## 17. Deployment Plan

Recommended deployment:

```txt
Next.js app: Vercel
Python ML service: Render / Railway / Fly.io / AWS / Azure
Database: Neon PostgreSQL
```

Production environment variables:

Next.js:

```env
ML_API_URL="https://your-ml-service.onrender.com"
```

Python service:

```env
ALLOWED_ORIGIN="https://your-next-app.vercel.app"
```

Important production notes:

- Keep Python service separate from Vercel.
- Vercel is not ideal for long-running Python ML services.
- Add timeout handling in Next.js.
- Add fallback UI if ML service is unavailable.

## 18. Security Considerations

Current recommended flow keeps authentication in Next.js.

Python service receives only the authenticated user's records from Next.js.

Do not expose the Python ML service directly to users without protection.

Recommended later:

- Add internal API secret.
- Next.js sends header:

```txt
x-ml-api-key: secret-value
```

- Python verifies this header.

Example:

```python
from fastapi import Header, HTTPException
import os


def verify_api_key(x_ml_api_key: str = Header(None)):
    if x_ml_api_key != os.getenv("ML_API_KEY"):
        raise HTTPException(status_code=401, detail="Unauthorized")
```

## 19. Error Handling

Handle these cases:

```txt
No records:
  Show empty state

Less than 7 days:
  Show "Need more data"

7-29 days:
  Use moving average fallback

Python service offline:
  Show friendly unavailable message

Database unavailable:
  Reuse existing P1001 handling style

Prediction negative:
  Clamp to 0
```

## 20. Testing Plan

### Python Tests

Test:

- Empty records
- Less than 7 days of records
- 30+ days of records
- Missing dates are filled
- Negative predictions are clamped to 0
- Response shape matches API contract

### Next.js Tests

Test:

- Server action returns fallback on ML service error
- Server action sends correct payload
- UI shows forecast values
- UI shows error state
- UI shows insufficient data state

### Manual Testing

Use sample records:

```txt
30 days of expenses
Weekend expenses higher than weekdays
Different category totals
Some missing days
```

Expected result:

- Forecast should not be empty
- Weekend predictions may be higher if training data shows that pattern
- Total should be positive
- Confidence should be Medium or High depending on data size

## 21. Implementation Checklist

### Phase 1: Python Service

- Create `ml-service` folder
- Add `requirements.txt`
- Add FastAPI app in `main.py`
- Add request/response schemas
- Add daily aggregation logic
- Add feature engineering
- Add moving average fallback
- Add Random Forest prediction
- Test `/health`
- Test `/forecast`

### Phase 2: Next.js Connection

- Add `ML_API_URL` env variable
- Create `app/actions/getExpenseForecast.ts`
- Fetch authenticated user's records
- Send records to Python service
- Handle Python service errors
- Return forecast response to UI

### Phase 3: UI

- Create `components/ExpenseForecast.tsx`
- Create or reuse Chart.js chart component
- Show next 7 days total
- Show month-end estimate
- Show confidence
- Show model name
- Add component to dashboard

### Phase 4: Polish

- Add loading state
- Add insufficient data state
- Add retry button
- Add responsive design
- Add documentation update in README

### Phase 5: Advanced

- Add forecast cache model
- Add forecast evaluation metrics
- Add XGBoost option
- Add model comparison
- Add category-wise forecasting

## 22. Project Documentation Text

Use this in `PROJECT_DOCUMENTATION.md`:

```txt
The expense forecasting module predicts future spending using historical expense records. User transactions are transformed into daily spending totals and category-wise aggregates. Features such as day of week, day of month, weekend status, previous day spending, rolling averages, and category-level totals are passed to a Random Forest Regression model. The model predicts expected expenses for the next 7 days and estimates the user's month-end spending. When insufficient data is available, the system falls back to a moving average forecast or asks the user to add more expense records.
```

## 23. Recommended First Version

Build the first version like this:

```txt
Model: RandomForestRegressor
Forecast horizon: 7 days
Minimum ML data: 30 days
Fallback: moving average for 7-29 days
No forecast: less than 7 days
UI: dashboard card + 7-day bar chart
Deployment: separate FastAPI service
```

This gives the project a clear ML feature without making it unnecessarily complex.

