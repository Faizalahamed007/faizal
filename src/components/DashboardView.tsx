import { useEffect, useState } from 'react';
import { Users, Layers, Receipt, Headphones, ArrowUpRight } from 'lucide-react';
import { apiRequest, formatCurrency } from '../lib/api';
import { DashboardPayload, NavSection } from '../types';
import { MonthlyRevenueChart, ServiceDistributionPanel } from './Charts';
import { StatusText } from './StatusText';

interface DashboardViewProps {
  onNavigate: (section: NavSection) => void;
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    apiRequest<DashboardPayload>('/api/dashboard')
      .then(setData)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((k) => (
            <div key={k} className="bg-white border border-[#DCE3EC] rounded-xl p-5 h-28 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-[#DCE3EC] rounded-xl p-5 h-72 animate-pulse" />
          <div className="bg-white border border-[#DCE3EC] rounded-xl p-5 h-72 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-rose-200 rounded-xl p-6 text-sm text-rose-700">
        {error || 'Unable to load dashboard metrics.'}
      </div>
    );
  }

  const cards = [
    {
      label: 'Total Customers',
      value: data.summary.totalCustomers,
      sub: 'Registered subscriber accounts',
      icon: Users,
      target: 'customers' as NavSection,
    },
    {
      label: 'Active Plans',
      value: data.summary.activePlans,
      sub: 'Mobile, Broadband & Landline',
      icon: Layers,
      target: 'plans' as NavSection,
    },
    {
      label: 'Total Bills',
      value: data.summary.totalBills,
      sub: `${data.summary.pendingBills} awaiting settlement`,
      icon: Receipt,
      target: 'billing' as NavSection,
    },
    {
      label: 'Open Tickets',
      value: data.summary.openTickets,
      sub: 'Unresolved support requests',
      icon: Headphones,
      target: 'support' as NavSection,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => onNavigate(card.target)}
              className="text-left bg-white border border-[#DCE3EC] hover:border-[#0F213A]/40 rounded-xl p-5 transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">{card.label}</p>
                  <p className="text-3xl font-bold text-[#0F213A] mt-2 tabular-nums font-display">{card.value}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-[#EEF2F6] group-hover:bg-[#EAB308]/15 flex items-center justify-center transition-colors">
                  <Icon className="w-5 h-5 text-[#0F213A]" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{card.sub}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#CA8A04]" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-[#DCE3EC] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#0F213A]">Monthly Revenue</h2>
              <p className="text-xs text-slate-500 mt-0.5">Collected invoice payments aggregated by billing month</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-xs font-semibold text-[#0F213A] hover:text-[#CA8A04] cursor-pointer whitespace-nowrap"
            >
              View Full Reports
            </button>
          </div>
          <MonthlyRevenueChart data={data.monthlyRevenue} />
        </div>

        <div className="bg-white border border-[#DCE3EC] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#0F213A]">Service Statistics</h2>
              <p className="text-xs text-slate-500 mt-0.5">Distribution across provisioned lines</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('services')}
              className="text-xs font-semibold text-[#0F213A] hover:text-[#CA8A04] cursor-pointer whitespace-nowrap"
            >
              Manage
            </button>
          </div>
          <ServiceDistributionPanel data={data.serviceStats} />
        </div>
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Customers */}
        <div className="bg-white border border-[#DCE3EC] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#DCE3EC] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0F213A]">Recent Customers</h2>
            <button
              type="button"
              onClick={() => onNavigate('customers')}
              className="text-xs font-semibold text-[#CA8A04] hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 bg-slate-50/70">
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">City</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {data.recentCustomers.map((c) => (
                  <tr key={c.customer_id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-[#0F213A]">{c.full_name}</div>
                      <div className="text-slate-500 font-mono text-[11px]">{c.phone}</div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{c.city}</td>
                    <td className="py-2.5 px-4">
                      <StatusText status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Subscriptions */}
        <div className="bg-white border border-[#DCE3EC] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#DCE3EC] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0F213A]">Recent Subscriptions</h2>
            <button
              type="button"
              onClick={() => onNavigate('subscriptions')}
              className="text-xs font-semibold text-[#CA8A04] hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 bg-slate-50/70">
                  <th className="py-2.5 px-4">Subscriber</th>
                  <th className="py-2.5 px-4">Plan</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {data.recentSubscriptions.map((sub) => (
                  <tr key={sub.subscription_id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-[#0F213A]">{sub.customer_name}</div>
                      <div className="text-slate-500 font-mono text-[11px]">Exp: {sub.expiry_date}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-700">{sub.plan_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                        {formatCurrency(sub.monthly_fee || 0)}
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <StatusText status={sub.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white border border-[#DCE3EC] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#DCE3EC] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0F213A]">Recent Payments</h2>
            <button
              type="button"
              onClick={() => onNavigate('billing')}
              className="text-xs font-semibold text-[#CA8A04] hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 bg-slate-50/70">
                  <th className="py-2.5 px-4">Bill & Customer</th>
                  <th className="py-2.5 px-4">Mode</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {data.recentPayments.map((pay) => (
                  <tr key={pay.payment_id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-[#0F213A]">{pay.customer_name}</div>
                      <div className="text-slate-500 font-mono text-[11px]">{pay.bill_number}</div>
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-700">{pay.payment_mode}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                      {formatCurrency(pay.amount_paid)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
