import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import {
  RiBarChart2Line, RiLineChartLine, RiPieChartLine,
  RiArrowUpLine, RiProgress3Line, RiCheckLine,
  RiCloseLine,
} from 'react-icons/ri';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export default function StudentAnalytics() {
  const [timeRange, setTimeRange] = useState('all');

  // Fetch analytics data
  const { data: analyticsData = {}, isLoading } = useQuery(
    ['student-analytics', timeRange],
    () => api.get(`/profile/me/analytics?range=${timeRange}`).then(r => r.data || {}),
    { staleTime: 120000 }
  );

  const {
    summary = {},
    submission_trend = [],
    accuracy_by_topic = [],
    difficulty_stats = {},
    performance_metrics = {},
    recent_achievements = [],
  } = analyticsData;

  // Chart data preparation
  const submissionTrendData = submission_trend.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    submissions: d.count,
    accepted: d.accepted,
  })) || [];

  const accuracyData = (accuracy_by_topic || []).map(d => ({
    topic: d.topic.substring(0, 12),
    accuracy: parseFloat(d.accuracy) || 0,
    submissions: d.attempts || 0,
  })) || [];

  const difficultyData = Object.entries(difficulty_stats || {}).map(([level, data]) => ({
    name: level.charAt(0).toUpperCase() + level.slice(1),
    value: data.count || 0,
    solved: data.solved || 0,
  }));

  const COLORS = ['#4F7CF3', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6'];

  const StatCard = ({ icon: Icon, label, value, change, unit = '', color = 'text-blue-600' }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 border border-gray-100"
    >
      <div className={`w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center ${color} mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <div className="flex items-baseline gap-2 mt-2">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {unit && <span className="text-xs text-gray-400">{unit}</span>}
      </div>
      {change !== undefined && (
        <p className={`text-xs mt-2 flex items-center gap-1 ${
          change >= 0 ? 'text-emerald-600' : 'text-red-600'
        }`}>
          <RiArrowUpLine className={`w-3 h-3 ${change < 0 ? 'rotate-180' : ''}`} />
          {Math.abs(change)}% vs last period
        </p>
      )}
    </motion.div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <RiProgress3Line className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="sticky top-16 z-20 bg-surface/95 backdrop-blur border-b border-theme">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Performance Analytics</h1>
              <p className="text-sm text-gray-500 mt-1">Detailed insights into your progress</p>
            </div>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={RiCheckLine}
            label="Accepted"
            value={summary.accepted || 0}
            change={summary.accepted_change}
            color="text-emerald-600"
          />
          <StatCard
            icon={RiBarChart2Line}
            label="Total Attempts"
            value={summary.total_attempts || 0}
            change={summary.attempts_change}
            color="text-blue-600"
          />
          <StatCard
            icon={RiLineChartLine}
            label="Accuracy"
            value={Math.round(summary.accuracy || 0)}
            unit="%"
            change={summary.accuracy_change}
            color="text-purple-600"
          />
          <StatCard
            icon={RiArrowUpLine}
            label="Current Streak"
            value={summary.streak || 0}
            unit="days"
            color="text-pink-600"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Submission Trend */}
          {submissionTrendData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 border border-gray-100"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <RiLineChartLine className="w-5 h-5 text-blue-600" /> Submission Trend
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={submissionTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#1F2937' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="submissions"
                    stroke="#4F7CF3"
                    strokeWidth={2}
                    dot={{ fill: '#4F7CF3', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="accepted"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ fill: '#10B981', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Difficulty Distribution */}
          {difficultyData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 border border-gray-100"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <RiPieChartLine className="w-5 h-5 text-emerald-600" /> By Difficulty
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={difficultyData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="solved"
                  >
                    {difficultyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                {difficultyData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-gray-600">
                      {d.name}: {d.solved}/{d.value}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Accuracy by Topic */}
        {accuracyData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 border border-gray-100"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">Accuracy by Topic</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={accuracyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="topic" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#1F2937' }}
                />
                <Legend />
                <Bar
                  dataKey="accuracy"
                  fill="#4F7CF3"
                  radius={[8, 8, 0, 0]}
                  name="Accuracy %"
                />
                <Bar
                  dataKey="submissions"
                  fill="#E0E7FF"
                  radius={[8, 8, 0, 0]}
                  name="Attempts"
                />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Performance Metrics */}
        {Object.keys(performance_metrics || {}).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 border border-gray-100"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">Performance Metrics</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(performance_metrics).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-xl border border-gray-100 p-4 bg-gray-50"
                >
                  <p className="text-xs font-semibold text-gray-500 uppercase">
                    {key.replace(/_/g, ' ')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent Achievements */}
        {recent_achievements && recent_achievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-6 border border-gray-100"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">🎖️ Recent Achievements</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {recent_achievements.map((achievement, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3"
                >
                  <span className="text-2xl">{achievement.icon || '🏅'}</span>
                  <div>
                    <p className="font-semibold text-gray-800">{achievement.name}</p>
                    <p className="text-xs text-gray-600">{achievement.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
