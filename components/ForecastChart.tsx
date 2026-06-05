'use client';

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useTheme } from '@/contexts/ThemeContext';
import type { ForecastDay } from '@/app/actions/getExpenseForecast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const ForecastChart = ({ forecast }: { forecast: ForecastDay[] }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!forecast || forecast.length === 0) return null;

  const data = {
    labels: forecast.map((item) => {
      const [, month, day] = item.date.split('-');
      return `${month}/${day}`;
    }),
    datasets: [
      {
        label: 'Predicted Amount ($)',
        data: forecast.map((item) => item.predicted_amount),
        backgroundColor: isDark
          ? 'rgba(52, 211, 153, 0.3)'
          : 'rgba(16, 185, 129, 0.2)',
        borderColor: isDark
          ? 'rgba(52, 211, 153, 0.8)'
          : 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
        borderRadius: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDark
          ? 'rgba(31, 41, 55, 0.95)'
          : 'rgba(255, 255, 255, 0.95)',
        titleColor: isDark ? '#f9fafb' : '#1f2937',
        bodyColor: isDark ? '#d1d5db' : '#374151',
        borderColor: isDark ? '#374151' : '#e5e7eb',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function (context: { parsed: { y: number } }) {
            return `Predicted: $${context.parsed.y.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date',
          font: { size: 12, weight: 'bold' as const },
          color: isDark ? '#d1d5db' : '#2c3e50',
        },
        ticks: {
          font: { size: 10 },
          color: isDark ? '#9ca3af' : '#7f8c8d',
          maxRotation: 0,
        },
        grid: { display: false },
      },
      y: {
        title: {
          display: true,
          text: 'Amount ($)',
          font: { size: 12, weight: 'bold' as const },
          color: isDark ? '#d1d5db' : '#2c3e50',
        },
        ticks: {
          font: { size: 10 },
          color: isDark ? '#9ca3af' : '#7f8c8d',
          callback: function (value: string | number) {
            return '$' + value;
          },
        },
        grid: {
          color: isDark ? '#374151' : '#e0e0e0',
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className='relative w-full h-48 sm:h-56'>
      <Bar data={data} options={options} />
    </div>
  );
};

export default ForecastChart;
