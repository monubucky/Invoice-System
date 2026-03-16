'use client';
import { useEffect, useState } from 'react';
import {
  DollarSign, FileText, Users,
  AlertTriangle, TrendingUp, Clock,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Navbar from '@/components/layout/Navbar';
import StatsCard from '@/components/dashboard/StatsCard';
import StatusBadge from '@/components/invoices/StatusBadge';
import api from '@/lib/api';
import { DashboardSummary, Invoice } from '@/types';
import { format } from 'date-fns';

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, revenueRes] = await Promise.all([
          api.get('/reports/summary'),
          api.get(`/reports/revenue?year=${new Date().getFullYear()}`),
        ]);
        setSummary(summaryRes.data.summary);
        setRevenue(revenueRes.data.months);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  if (loading) {
    return (
      <DashboardLayout>
        <Navbar title="Dashboard" />
        <div className="p-8">
          <div className="grid grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 h-32 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-32" />
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Navbar title="Dashboard" subtitle={`Welcome back! Here's what's happening.`} />
      <div className="p-8 space-y-8">

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Revenue"
            value={formatCurrency(summary?.revenue.allTime || 0)}
            subtitle="All time"
            icon={DollarSign}
            trend={{ value: summary?.revenue.growth || 0, positive: (summary?.revenue.growth || 0) >= 0 }}
            color="green"
          />
          <StatsCard
            title="This Month"
            value={formatCurrency(summary?.revenue.thisMonth || 0)}
            subtitle={`Last month: ${formatCurrency(summary?.revenue.lastMonth || 0)}`}
            icon={TrendingUp}
            color="blue"
          />
          <StatsCard
            title="Outstanding"
            value={formatCurrency(summary?.outstanding || 0)}
            subtitle={`${summary?.counts.sent || 0} unpaid invoices`}
            icon={Clock}
            color="amber"
          />
          <StatsCard
            title="Overdue"
            value={formatCurrency(summary?.overdueAmount || 0)}
            subtitle={`${summary?.counts.overdue || 0} overdue invoices`}
            icon={AlertTriangle}
            color="red"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-3 gap-6">
          <StatsCard title="Total Clients" value={String(summary?.counts.clients || 0)} icon={Users} color="purple" />
          <StatsCard title="Total Invoices" value={String(summary?.counts.invoices || 0)} icon={FileText} color="blue" />
          <StatsCard title="Paid Invoices" value={String(summary?.counts.paid || 0)} icon={DollarSign} color="green" />
        </div>

        {/* Revenue Chart + Recent Invoices */}
        <div className="grid grid-cols-3 gap-6">
          {/* Chart */}
          <div className="col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-6">Monthly Revenue {new Date().getFullYear()}</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenue} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="monthName" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#4F46E5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Invoices */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Recent Invoices</h3>
            <div className="space-y-3">
              {summary?.recentInvoices?.slice(0, 5).map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{inv.client?.name}</p>
                    <p className="text-xs text-gray-400">{inv.invoiceNumber}</p>
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(Number(inv.total))}</p>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              ))}
              {!summary?.recentInvoices?.length && (
                <p className="text-sm text-gray-400 text-center py-4">No invoices yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Status Breakdown */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Invoice Overview</h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Draft',    count: summary?.counts.draft,   color: 'bg-gray-100 text-gray-600' },
              { label: 'Sent',     count: summary?.counts.sent,    color: 'bg-blue-100 text-blue-600' },
              { label: 'Paid',     count: summary?.counts.paid,    color: 'bg-green-100 text-green-600' },
              { label: 'Overdue',  count: summary?.counts.overdue, color: 'bg-red-100 text-red-600' },
            ].map(({ label, count, color }) => (
              <div key={label} className={`rounded-xl p-4 ${color}`}>
                <p className="text-2xl font-bold">{count || 0}</p>
                <p className="text-sm font-medium mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}