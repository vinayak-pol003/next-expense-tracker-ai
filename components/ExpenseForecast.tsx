'use client';

import { useState, useEffect, useCallback } from 'react';
import { getExpenseForecast, type ExpenseForecastResponse } from '@/app/actions/getExpenseForecast';
import ForecastChart from './ForecastChart';

const getConfidenceColor = (confidence: string) => {
  switch (confidence) {
    case 'High':
      return 'text-green-600 dark:text-green-400';
    case 'Medium':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'Low':
    default:
      return 'text-gray-500 dark:text-gray-400';
  }
};

const getModelBadge = (model: string) => {
  switch (model) {
    case 'RandomForestRegressor':
      return { bg: 'bg-emerald-100 dark:bg-emerald-900/50', text: 'text-emerald-700 dark:text-emerald-300', label: 'ML Forecast' };
    case 'MovingAverageFallback':
      return { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-700 dark:text-blue-300', label: 'Average Estimate' };
    default:
      return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', label: model };
  }
};

const ExpenseForecast = () => {
  const [data, setData] = useState<ExpenseForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadForecast = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getExpenseForecast();
      setData(result);
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error('Failed to load forecast:', err);
      setError('Unable to generate forecast');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForecast();
  }, [loadForecast]);

  if (isLoading) {
    return (
      <div className='bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-xl border border-gray-100/50 dark:border-gray-700/50'>
        <div className='flex items-center gap-3 mb-4'>
          <div className='w-10 h-10 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg'>
            <span className='text-white text-lg'>📊</span>
          </div>
          <div className='flex-1'>
            <h3 className='text-lg font-bold text-gray-900 dark:text-gray-100'>Expense Forecast</h3>
            <p className='text-xs text-gray-500 dark:text-gray-400'>Predicting your future spending...</p>
          </div>
          <div className='w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin'></div>
        </div>
        <div className='animate-pulse space-y-3'>
          <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4'></div>
          <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/2'></div>
          <div className='h-32 bg-gray-200 dark:bg-gray-700 rounded-xl'></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className='bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-xl border border-gray-100/50 dark:border-gray-700/50'>
        <div className='flex items-center gap-3 mb-4'>
          <div className='w-10 h-10 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg'>
            <span className='text-white text-lg'>📊</span>
          </div>
          <div>
            <h3 className='text-lg font-bold text-gray-900 dark:text-gray-100'>Expense Forecast</h3>
            <p className='text-xs text-gray-500 dark:text-gray-400'>Future spending predictions</p>
          </div>
        </div>
        <div className='text-center py-8'>
          <p className='text-gray-500 dark:text-gray-400 mb-4'>
            {error === 'Unable to generate forecast'
              ? 'Forecast service is offline. Start the ML service to see predictions.'
              : error}
          </p>
          <button
            onClick={loadForecast}
            className='px-4 py-2 bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 hover:from-emerald-700 hover:via-green-600 hover:to-teal-600 text-white rounded-lg font-medium text-sm shadow-lg hover:shadow-xl transition-all'
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (data.model === 'InsufficientData' || (data.forecast.length === 0 && !data.error)) {
    return (
      <div className='bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-xl border border-gray-100/50 dark:border-gray-700/50'>
        <div className='flex items-center gap-3 mb-4'>
          <div className='w-10 h-10 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg'>
            <span className='text-white text-lg'>📊</span>
          </div>
          <div>
            <h3 className='text-lg font-bold text-gray-900 dark:text-gray-100'>Expense Forecast</h3>
            <p className='text-xs text-gray-500 dark:text-gray-400'>Future spending predictions</p>
          </div>
        </div>
        <div className='text-center py-8'>
          <p className='text-gray-500 dark:text-gray-400'>
            Need at least 7 days of expense data to generate a forecast.
          </p>
          <p className='text-xs text-gray-400 dark:text-gray-500 mt-2'>
            Keep adding your daily expenses to unlock predictions.
          </p>
        </div>
      </div>
    );
  }

  const badge = getModelBadge(data.model);

  return (
    <div className='bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-xl border border-gray-100/50 dark:border-gray-700/50 hover:shadow-2xl'>
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg'>
            <span className='text-white text-lg'>📊</span>
          </div>
          <div>
            <h3 className='text-lg font-bold text-gray-900 dark:text-gray-100'>Expense Forecast</h3>
            <p className='text-xs text-gray-500 dark:text-gray-400'>Based on your past spending</p>
          </div>
        </div>
        <button
          onClick={loadForecast}
          className='w-8 h-8 bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 hover:from-emerald-700 hover:via-green-600 hover:to-teal-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all'
        >
          <span className='text-sm'>🔄</span>
        </button>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4'>
        <div className='bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-xl'>
          <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Next 7 Days</p>
          <p className='text-xl font-bold text-gray-900 dark:text-gray-100'>
            ${data.next_7_days_total.toFixed(2)}
          </p>
        </div>
        <div className='bg-blue-50 dark:bg-blue-900/30 p-3 rounded-xl'>
          <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Month-End Estimate</p>
          <p className='text-xl font-bold text-gray-900 dark:text-gray-100'>
            ${data.monthly_predicted_total.toFixed(2)}
          </p>
        </div>
        <div className='bg-purple-50 dark:bg-purple-900/30 p-3 rounded-xl flex flex-col justify-between'>
          <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Confidence</p>
          <div className='flex items-center justify-between'>
            <p className={`text-lg font-bold ${getConfidenceColor(data.confidence)}`}>
              {data.confidence}
            </p>
            <span className={`text-xs px-2 py-1 rounded-full ${badge.bg} ${badge.text} font-medium`}>
              {badge.label}
            </span>
          </div>
        </div>
      </div>

      <ForecastChart forecast={data.forecast} />
    </div>
  );
};

export default ExpenseForecast;
