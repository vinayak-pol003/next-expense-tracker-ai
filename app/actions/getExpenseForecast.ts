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
