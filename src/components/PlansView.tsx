import { useEffect, useState, FormEvent } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { apiRequest, formatCurrency } from '../lib/api';
import { Plan } from '../types';
import { StatusText } from './StatusText';

export function PlansView() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('All');
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    plan_name: '',
    service_type: 'Mobile' as 'Mobile' | 'Broadband' | 'Landline',
    data_limit_gb: '100',
    call_limit_mins: '1000',
    validity_days: '30',
    monthly_fee: '499',
    description: '',
    is_active: true,
  });
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);

  async function loadPlans() {
    setLoading(true);
    setError('');
    try {
      const q = typeFilter !== 'All' ? `?service_type=${typeFilter}` : '';
      const res = await apiRequest<{ plans: Plan[] }>(`/api/plans${q}`);
      setPlans(res.plans);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlans();
  }, [typeFilter]);

  function openAdd() {
    setEditing(null);
    setFormData({
      plan_name: '',
      service_type: 'Mobile',
      data_limit_gb: '100',
      call_limit_mins: '1000',
      validity_days: '30',
      monthly_fee: '499',
      description: '',
      is_active: true,
    });
    setFormOpen(true);
  }

  function openEdit(p: Plan) {
    setEditing(p);
    setFormData({
      plan_name: p.plan_name,
      service_type: p.service_type,
      data_limit_gb: String(p.data_limit_gb),
      call_limit_mins: String(p.call_limit_mins),
      validity_days: String(p.validity_days),
      monthly_fee: String(p.monthly_fee),
      description: p.description,
      is_active: p.is_active === 1,
    });
    setFormOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...formData,
        data_limit_gb: Number(formData.data_limit_gb),
        call_limit_mins: Number(formData.call_limit_mins),
        validity_days: Number(formData.validity_days),
        monthly_fee: Number(formData.monthly_fee),
      };
      if (editing) {
        await apiRequest(`/api/plans/${editing.plan_id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiRequest('/api/plans', { method: 'POST', body: JSON.stringify(payload) });
      }
      setFormOpen(false);
      await loadPlans();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await apiRequest(`/api/plans/${deleteTarget.plan_id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      await loadPlans();
    } catch (err) {
      setError((err as Error).message);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#DCE3EC] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-[#EEF2F6] rounded-lg self-start">
          {['All', 'Mobile', 'Broadband', 'Landline'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                typeFilter === t ? 'bg-white text-[#0F213A] shadow-xs' : 'text-slate-600 hover:text-[#0F213A]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0B192C] hover:bg-[#122642] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 text-[#EAB308]" />
          Create Plan
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
                <th className="py-3 px-4">Plan ID</th>
                <th className="py-3 px-4">Plan Name</th>
                <th className="py-3 px-4">Service Type</th>
                <th className="py-3 px-4 text-right">Data Limit</th>
                <th className="py-3 px-4 text-right">Call Limit</th>
                <th className="py-3 px-4 text-right">Validity</th>
                <th className="py-3 px-4 text-right">Monthly Fee</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                    Loading tariff plans...
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500 text-sm">
                    No plans configured for this category.
                  </td>
                </tr>
              ) : (
                plans.map((p) => (
                  <tr key={p.plan_id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono text-xs text-slate-500 tabular-nums">
                      PLN-{String(p.plan_id).padStart(3, '0')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#0F213A]">{p.plan_name}</div>
                      <div className="text-xs text-slate-500">{p.active_subscribers ?? 0} active subscribers</div>
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-700">{p.service_type}</td>
                    <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-700">
                      {p.data_limit_gb > 0 ? `${p.data_limit_gb} GB` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-700">
                      {p.call_limit_mins > 0 ? `${p.call_limit_mins} mins` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-700">
                      {p.validity_days} days
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-[#0F213A] tabular-nums">
                      {formatCurrency(p.monthly_fee)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusText status={p.is_active ? 'Active' : 'Inactive'} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="p-1.5 text-slate-600 hover:text-[#0F213A] hover:bg-slate-100 rounded-md cursor-pointer"
                          title="Edit Plan"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(p)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                          title="Delete Plan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE3EC] rounded-xl w-full max-w-lg shadow-lg overflow-hidden">
            <div className="px-5 py-4 bg-[#0B192C] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">{editing ? 'Edit Telecom Plan' : 'Create New Plan'}</h3>
              <button type="button" onClick={() => setFormOpen(false)} className="text-slate-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F213A] mb-1">Plan Name</label>
                  <input
                    type="text"
                    required
                    value={formData.plan_name}
                    onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F213A] mb-1">Service Type</label>
                  <select
                    value={formData.service_type}
                    onChange={(e) =>
                      setFormData({ ...formData, service_type: e.target.value as 'Mobile' | 'Broadband' | 'Landline' })
                    }
                    className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg bg-white focus:outline-none focus:border-[#0F213A]"
                  >
                    <option value="Mobile">Mobile</option>
                    <option value="Broadband">Broadband</option>
                    <option value="Landline">Landline</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F213A] mb-1">Data (GB)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={formData.data_limit_gb}
                    onChange={(e) => setFormData({ ...formData, data_limit_gb: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F213A] mb-1">Calls (Mins)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.call_limit_mins}
                    onChange={(e) => setFormData({ ...formData, call_limit_mins: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F213A] mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.validity_days}
                    onChange={(e) => setFormData({ ...formData, validity_days: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F213A] mb-1">Monthly Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={formData.monthly_fee}
                    onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F213A] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A]"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-[#0F213A] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                Plan is active and available for new subscriptions
              </label>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 border border-[#DCE3EC] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0B192C] hover:bg-[#122642] rounded-lg cursor-pointer"
                >
                  {editing ? 'Update Plan' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE3EC] rounded-xl w-full max-w-sm p-5 shadow-lg">
            <h3 className="text-sm font-bold text-[#0F213A]">Delete Plan</h3>
            <p className="text-xs text-slate-600 mt-2">
              Delete plan <strong>{deleteTarget.plan_name}</strong>? Plans currently referenced by subscriptions cannot
              be removed.
            </p>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 border border-[#DCE3EC] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
