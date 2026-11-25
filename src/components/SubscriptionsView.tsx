import { useEffect, useState, FormEvent } from 'react';
import { Plus, RefreshCw, X } from 'lucide-react';
import { apiRequest, formatCurrency } from '../lib/api';
import { Customer, Plan, Subscription, TelecomService } from '../types';
import { StatusText } from './StatusText';

export function SubscriptionsView() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [services, setServices] = useState<TelecomService[]>([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    customer_id: '',
    plan_id: '',
    service_id: '',
    start_date: new Date().toISOString().slice(0, 10),
  });

  const [renewTarget, setRenewTarget] = useState<Subscription | null>(null);
  const [generateRenewalBill, setGenerateRenewalBill] = useState(true);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const q = statusFilter !== 'All' ? `?status=${statusFilter}` : '';
      const [subRes, custRes, planRes, svcRes] = await Promise.all([
        apiRequest<{ subscriptions: Subscription[] }>(`/api/subscriptions${q}`),
        apiRequest<{ customers: Customer[] }>('/api/customers'),
        apiRequest<{ plans: Plan[] }>('/api/plans'),
        apiRequest<{ services: TelecomService[] }>('/api/services'),
      ]);
      setSubscriptions(subRes.subscriptions);
      setCustomers(custRes.customers);
      setPlans(planRes.plans.filter((p) => p.is_active === 1));
      setServices(svcRes.services);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [statusFilter]);

  function openAssign() {
    setAssignForm({
      customer_id: customers[0] ? String(customers[0].customer_id) : '',
      plan_id: plans[0] ? String(plans[0].plan_id) : '',
      service_id: '',
      start_date: new Date().toISOString().slice(0, 10),
    });
    setAssignOpen(true);
  }

  async function handleAssign(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiRequest('/api/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: Number(assignForm.customer_id),
          plan_id: Number(assignForm.plan_id),
          service_id: assignForm.service_id ? Number(assignForm.service_id) : null,
          start_date: assignForm.start_date,
        }),
      });
      setAssignOpen(false);
      await loadAll();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleRenew() {
    if (!renewTarget) return;
    setError('');
    try {
      await apiRequest(`/api/subscriptions/${renewTarget.subscription_id}/renew`, {
        method: 'PUT',
        body: JSON.stringify({ generate_bill: generateRenewalBill }),
      });
      setRenewTarget(null);
      await loadAll();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleStatusChange(subId: number, status: string) {
    try {
      await apiRequest(`/api/subscriptions/${subId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadAll();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const customerServices = services.filter((s) => String(s.customer_id) === assignForm.customer_id);

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#DCE3EC] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-[#EEF2F6] rounded-lg self-start overflow-x-auto">
          {['All', 'Active', 'Renewed', 'Expired', 'Cancelled'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === st ? 'bg-white text-[#0F213A] shadow-xs' : 'text-slate-600 hover:text-[#0F213A]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={openAssign}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0B192C] hover:bg-[#122642] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 text-[#EAB308]" />
          Assign Plan
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-[#DCE3EC] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#DCE3EC] bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Subscription ID</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Plan Name</th>
                <th className="py-3 px-4">Start Date</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    Loading subscriptions...
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 text-sm">
                    No subscriptions match this filter.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr key={sub.subscription_id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono text-xs text-slate-500 tabular-nums">
                      SUB-{String(sub.subscription_id).padStart(4, '0')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#0F213A]">{sub.customer_name}</div>
                      {sub.service_identifier && (
                        <div className="text-xs font-mono text-slate-500">{sub.service_identifier}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#0F213A]">{sub.plan_name}</div>
                      <div className="text-xs text-slate-500 font-mono tabular-nums">
                        {sub.service_type} · {formatCurrency(sub.monthly_fee || 0)}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700 tabular-nums">{sub.start_date}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700 tabular-nums">{sub.expiry_date}</td>
                    <td className="py-3 px-4">
                      <StatusText status={sub.status} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRenewTarget(sub);
                            setGenerateRenewalBill(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#0F213A] bg-[#EEF2F6] hover:bg-[#EAB308]/20 rounded-md cursor-pointer whitespace-nowrap"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Renew
                        </button>
                        {sub.status !== 'Cancelled' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(sub.subscription_id, 'Cancelled')}
                            className="px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Plan Modal */}
      {assignOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE3EC] rounded-xl w-full max-w-md shadow-lg overflow-hidden">
            <div className="px-5 py-4 bg-[#0B192C] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Assign Subscription Plan</h3>
              <button type="button" onClick={() => setAssignOpen(false)} className="text-slate-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAssign} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F213A] mb-1">Customer</label>
                <select
                  required
                  value={assignForm.customer_id}
                  onChange={(e) => setAssignForm({ ...assignForm, customer_id: e.target.value, service_id: '' })}
                  className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg bg-white focus:outline-none focus:border-[#0F213A]"
                >
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.customer_id} value={c.customer_id}>
                      {c.full_name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F213A] mb-1">Telecom Plan</label>
                <select
                  required
                  value={assignForm.plan_id}
                  onChange={(e) => setAssignForm({ ...assignForm, plan_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg bg-white focus:outline-none focus:border-[#0F213A]"
                >
                  <option value="">Select plan...</option>
                  {plans.map((p) => (
                    <option key={p.plan_id} value={p.plan_id}>
                      {p.plan_name} ({p.service_type}) — {formatCurrency(p.monthly_fee)} / {p.validity_days}d
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F213A] mb-1">
                  Linked Service Line (optional)
                </label>
                <select
                  value={assignForm.service_id}
                  onChange={(e) => setAssignForm({ ...assignForm, service_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg bg-white focus:outline-none focus:border-[#0F213A]"
                >
                  <option value="">No specific service line</option>
                  {customerServices.map((s) => (
                    <option key={s.service_id} value={s.service_id}>
                      {s.service_type} — {s.service_identifier}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F213A] mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={assignForm.start_date}
                  onChange={(e) => setAssignForm({ ...assignForm, start_date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A]"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 border border-[#DCE3EC] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0B192C] hover:bg-[#122642] rounded-lg cursor-pointer"
                >
                  Assign Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Renew Subscription Modal */}
      {renewTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE3EC] rounded-xl w-full max-w-md p-5 shadow-lg">
            <h3 className="text-sm font-bold text-[#0F213A]">Renew Subscription</h3>
            <p className="text-xs text-slate-600 mt-2">
              Extend <strong>{renewTarget.plan_name}</strong> for <strong>{renewTarget.customer_name}</strong> by{' '}
              {renewTarget.validity_days ?? 30} days.
            </p>
            <label className="flex items-center gap-2 text-xs font-medium text-[#0F213A] mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={generateRenewalBill}
                onChange={(e) => setGenerateRenewalBill(e.target.checked)}
              />
              Also generate a renewal bill ({formatCurrency(renewTarget.monthly_fee || 0)}) inside transaction
            </label>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setRenewTarget(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 border border-[#DCE3EC] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenew}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0B192C] hover:bg-[#122642] rounded-lg cursor-pointer"
              >
                Confirm Renewal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
