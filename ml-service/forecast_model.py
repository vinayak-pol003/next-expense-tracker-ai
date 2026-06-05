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
