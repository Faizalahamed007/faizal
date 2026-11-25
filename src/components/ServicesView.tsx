import { useEffect, useState, FormEvent } from 'react';
import { Plus, Search, Pencil, Trash2, X } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Customer, TelecomService } from '../types';
import { StatusText } from './StatusText';

export function ServicesView() {
  const [services, setServices] = useState<TelecomService[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TelecomService | null>(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    service_type: 'Mobile' as 'Mobile' | 'Broadband' | 'Landline',
    service_identifier: '',
    service_area: '',
    status: 'Active' as 'Active' | 'Inactive' | 'Suspended',
  });
  const [deleteTarget, setDeleteTarget] = useState<TelecomService | null>(null);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'All') params.set('service_type', typeFilter);
      if (search.trim()) params.set('search', search.trim());

      const [svcRes, custRes] = await Promise.all([
        apiRequest<{ services: TelecomService[] }>(`/api/services?${params.toString()}`),
        apiRequest<{ customers: Customer[] }>('/api/customers'),
      ]);
      setServices(svcRes.services);
      setCustomers(custRes.customers);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(loadData, 150);
    return () => clearTimeout(t);
  }, [typeFilter, search]);

  function openAdd() {
    setEditing(null);
    setFormData({
      customer_id: customers[0] ? String(customers[0].customer_id) : '',
      service_type: 'Mobile',
      service_identifier: '',
      service_area: '',
      status: 'Active',
    });
    setFormOpen(true);
  }

  function openEdit(svc: TelecomService) {
    setEditing(svc);
    setFormData({
      customer_id: String(svc.customer_id),
      service_type: svc.service_type,
      service_identifier: svc.service_identifier,
      service_area: svc.service_area,
      status: svc.status,
    });
    setFormOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await apiRequest(`/api/services/${editing.service_id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...formData, customer_id: Number(formData.customer_id) }),
        });
      } else {
        await apiRequest('/api/services', {
          method: 'POST',
          body: JSON.stringify({ ...formData, customer_id: Number(formData.customer_id) }),
        });
      }
      setFormOpen(false);
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await apiRequest(`/api/services/${deleteTarget.service_id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#DCE3EC] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search service ID, area, or customer..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A]"
            />
          </div>
          <div className="flex items-center gap-1 p-1 bg-[#EEF2F6] rounded-lg">
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
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0B192C] hover:bg-[#122642] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 text-[#EAB308]" />
          Provision Service
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
                <th className="py-3 px-4">Service ID</th>
                <th className="py-3 px-4">Service Type</th>
                <th className="py-3 px-4">Identifier</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Service Area</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    Loading telecom services...
                  </td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 text-sm">
                    No telecom services found.
                  </td>
                </tr>
              ) : (
                services.map((s) => (
                  <tr key={s.service_id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono text-xs text-slate-500 tabular-nums">
                      SVC-{String(s.service_id).padStart(4, '0')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#0F213A]">{s.service_type}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700">{s.service_identifier}</td>
                    <td className="py-3 px-4 text-sm font-medium text-[#0F213A]">{s.customer_name}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{s.service_area}</td>
                    <td className="py-3 px-4">
                      <StatusText status={s.status} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          className="p-1.5 text-slate-600 hover:text-[#0F213A] hover:bg-slate-100 rounded-md cursor-pointer"
                          title="Edit Service"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(s)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                          title="Delete Service"
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
          <div className="bg-white border border-[#DCE3EC] rounded-xl w-full max-w-md shadow-lg overflow-hidden">
            <div className="px-5 py-4 bg-[#0B192C] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">{editing ? 'Edit Telecom Service' : 'Provision New Service'}</h3>
              <button type="button" onClick={() => setFormOpen(false)} className="text-slate-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F213A] mb-1">Customer</label>
                <select
                  required
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg bg-white focus:outline-none focus:border-[#0F213A]"
                >
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.customer_id} value={c.customer_id}>
                      {c.full_name} ({c.city})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-xs font-semibold text-[#0F213A] mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' | 'Suspended' })
                    }
                    className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg bg-white focus:outline-none focus:border-[#0F213A]"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F213A] mb-1">
                  Service Identifier (optional on create)
                </label>
                <input
                  type="text"
                  required={Boolean(editing)}
                  value={formData.service_identifier}
                  onChange={(e) => setFormData({ ...formData, service_identifier: e.target.value })}
                  placeholder="e.g. FIB-CHN-00912 or MOB-98400-11223"
                  className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F213A] mb-1">Service Area</label>
                <input
                  type="text"
                  required
                  value={formData.service_area}
                  onChange={(e) => setFormData({ ...formData, service_area: e.target.value })}
                  placeholder="e.g. Chennai South"
                  className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A]"
                />
              </div>
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
                  {editing ? 'Update Service' : 'Provision Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE3EC] rounded-xl w-full max-w-sm p-5 shadow-lg">
            <h3 className="text-sm font-bold text-[#0F213A]">Remove Service</h3>
            <p className="text-xs text-slate-600 mt-2">
              Delete service <strong>{deleteTarget.service_identifier}</strong> ({deleteTarget.service_type})?
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
