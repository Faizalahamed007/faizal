import { useEffect, useState } from 'react';
import { Users, HardDrive, IndianRupee, Headphones } from 'lucide-react';
import { apiRequest, formatCurrency } from '../lib/api';
import { ReportsPayload } from '../types';
import { MonthlyRevenueChart, CustomerGrowthChart, ServiceDistributionPanel } from './Charts';
import { StatusText } from './StatusText';

export function ReportsView() {
  const [data, setData] = useState<ReportsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    apiRequest<ReportsPayload>('/api/reports')
      .then(setData)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-[#DCE3EC] rounded-xl p-5 h-28 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-rose-200 rounded-xl p-6 text-sm text-rose-700">
        {error || 'Unable to generate reports.'}
      </div>
    );
  }

  const totalPaymentsAmount = data.paymentByMode.reduce((acc, m) => acc + m.total_amount, 0) || 1;

  return (
    <div className="space-y-6">
      {/* Top KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-[#DCE3EC] rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Customers</p>
              <p className="text-3xl font-bold text-[#0F213A] mt-2 tabular-nums font-display">
                {data.kpis.totalCustomers}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#EEF2F6] flex items-center justify-center">
              <Users className="w-5 h-5 text-[#0F213A]" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Active, inactive & suspended accounts</p>
        </div>

        <div className="bg-white border border-[#DCE3EC] rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Data Usage</p>
              <p className="text-3xl font-bold text-[#0F213A] mt-2 tabular-nums font-display">
                {data.kpis.totalDataUsage.toLocaleString()} GB
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#EEF2F6] flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-[#CA8A04]" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Aggregated across usage_records</p>
        </div>

        <div className="bg-white border border-[#DCE3EC] rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Revenue</p>
              <p className="text-3xl font-bold text-[#0F213A] mt-2 tabular-nums font-display">
                {formatCurrency(data.kpis.totalRevenue)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#EEF2F6] flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-emerald-700" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Settled UPI, Card & Cash payments</p>
        </div>

        <div className="bg-white border border-[#DCE3EC] rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Open Tickets</p>
              <p className="text-3xl font-bold text-[#0F213A] mt-2 tabular-nums font-display">
                {data.kpis.openTickets}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#EEF2F6] flex items-center justify-center">
              <Headphones className="w-5 h-5 text-rose-700" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Open, Pending & In Progress queue</p>
        </div>
      </div>

      {/* Charts Grid: Monthly Revenue & Customer Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#DCE3EC] rounded-xl p-5">
          <h2 className="text-base font-bold text-[#0F213A]">Monthly Revenue Chart</h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">From SQL View v_monthly_revenue_stats</p>
          <MonthlyRevenueChart data={data.monthlyRevenue} />
        </div>

        <div className="bg-white border border-[#DCE3EC] rounded-xl p-5">
          <h2 className="text-base font-bold text-[#0F213A]">Customer Growth Chart</h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">Cumulative subscriber onboarding trajectory</p>
          <CustomerGrowthChart data={data.customerGrowth} />
        </div>
      </div>

      {/* Service Distribution & Payment Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#DCE3EC] rounded-xl p-5">
          <h2 className="text-base font-bold text-[#0F213A]">Service Distribution</h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">Active vs total lines across Mobile, Broadband & Landline</p>
          <ServiceDistributionPanel data={data.serviceDistribution} />
        </div>

        <div className="bg-white border border-[#DCE3EC] rounded-xl p-5">
          <h2 className="text-base font-bold text-[#0F213A]">Payment Statistics</h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">Breakdown by payment mode and invoice status</p>

          <div className="space-y-4">
            <div className="space-y-2.5">
              {data.paymentByMode.map((pm) => {
                const pct = Math.round((pm.total_amount / totalPaymentsAmount) * 100);
                return (
                  <div key={pm.payment_mode} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#0F213A]">
                        {pm.payment_mode} ({pm.tx_count} transactions)
                      </span>
                      <span className="font-mono font-semibold text-[#0F213A] tabular-nums">
                        {formatCurrency(pm.total_amount)} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0F213A] rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: pm.payment_mode === 'UPI' ? '#CA8A04' : '#0F213A',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {data.billStatusBreakdown.map((bs) => (
                <div key={bs.status} className="bg-[#EEF2F6]/70 rounded-lg p-2.5">
                  <StatusText status={bs.status} />
                  <div className="font-mono text-xs font-bold text-[#0F213A] mt-1 tabular-nums">
                    {bs.bill_count} bills
                  </div>
                  <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                    {formatCurrency(bs.total_amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* DBMS Relational Queries Showcase */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border border-[#DCE3EC] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#DCE3EC]">
            <h2 className="text-sm font-bold text-[#0F213A]">
              High-Value Subscribers (Subquery + GROUP BY + HAVING)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Customers whose cumulative payments exceed the average invoice amount
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 bg-slate-50/70">
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">City</th>
                  <th className="py-2.5 px-4 text-right">Total Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {data.dbmsAnalytics.highValueCustomers.map((hc) => (
                  <tr key={hc.customer_id}>
                    <td className="py-2.5 px-4 font-semibold text-[#0F213A]">{hc.full_name}</td>
                    <td className="py-2.5 px-4 text-slate-600">{hc.city}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                      {formatCurrency(hc.total_spent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-[#DCE3EC] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#DCE3EC]">
            <h2 className="text-sm font-bold text-[#0F213A]">Plan Utilization (RIGHT JOIN + Aggregate)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Subscription count across all configured tariff plans including zero-subscriber plans
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 bg-slate-50/70">
                  <th className="py-2.5 px-4">Plan Name</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4 text-right">Fee</th>
                  <th className="py-2.5 px-4 text-right">Subscriptions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {data.dbmsAnalytics.planUtilization.map((pu) => (
                  <tr key={pu.plan_id}>
                    <td className="py-2.5 px-4 font-semibold text-[#0F213A]">{pu.plan_name}</td>
                    <td className="py-2.5 px-4 text-slate-600">{pu.service_type}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">{formatCurrency(pu.monthly_fee)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-[#0F213A] tabular-nums">
                      {pu.subscription_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Customer Billing Ledger View */}
      <div className="bg-white border border-[#DCE3EC] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#DCE3EC]">
          <h2 className="text-sm font-bold text-[#0F213A]">
            Customer Billing Ledger (SQL View: v_customer_billing_overview)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Consolidated LEFT JOIN summary across all customers, invoices, and settlements
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 bg-slate-50/70">
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Account Status</th>
                <th className="py-2.5 px-4 text-right">Total Bills</th>
                <th className="py-2.5 px-4 text-right">Total Billed</th>
                <th className="py-2.5 px-4 text-right">Total Paid</th>
                <th className="py-2.5 px-4 text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {data.dbmsAnalytics.customerLedger.map((row) => {
                const outstanding = Math.max(0, row.total_billed - row.total_paid);
                return (
                  <tr key={row.customer_id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-[#0F213A]">{row.full_name}</div>
                      <div className="text-slate-500">{row.email}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <StatusText status={row.account_status} />
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">{row.total_bills}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">{formatCurrency(row.total_billed)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-700 tabular-nums">
                      {formatCurrency(row.total_paid)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-[#0F213A] tabular-nums">
                      {formatCurrency(outstanding)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
