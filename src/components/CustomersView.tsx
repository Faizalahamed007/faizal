import { useEffect, useState, FormEvent } from 'react';
import { Plus, Search, Eye, Pencil, Trash2, X } from 'lucide-react';
import { apiRequest, formatCurrency } from '../lib/api';
import { Customer, TelecomService, Subscription, Bill, SupportTicket } from '../types';
import { StatusText } from './StatusText';

interface CustomerDetailPayload {
  customer: Customer;
  services: TelecomService[];
  subscriptions: Subscription[];
  bills: Bill[];
  tickets: SupportTicket[];
}

export function CustomersView() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    city: 'Chennai',
    status: 'Active' as 'Active' | 'Inactive' | 'Suspended',
  });
  const [saving, setSaving] = useState(false);

  const [detailData, setDetailData] = useState<CustomerDetailPayload | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  async function loadCustomers() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'All') params.set('status', statusFilter);
      const res = await apiRequest<{ customers: Customer[] }>(`/api/customers?${params.toString()}`);
      setCustomers(res.customers);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers();
    }, 150);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  function openAddModal() {
    setEditing(null);
    setFormData({ full_name: '', email: '', phone: '', address: '', city: 'Chennai', status: 'Active' });
    setFormOpen(true);
  }

  function openEditModal(c: Customer) {
    setEditing(c);
    setFormData({
      full_name: c.full_name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      city: c.city,
      status: c.status,
    });
    setFormOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await apiRequest(`/api/customers/${editing.customer_id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await apiRequest('/api/customers', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      setFormOpen(false);
      await loadCustomers();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleViewDetails(c: Customer) {
    try {
      const res = await apiRequest<CustomerDetailPayload>(`/api/customers/${c.customer_id}`);
      setDetailData(res);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await apiRequest(`/api/customers/${deleteTarget.customer_id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      await loadCustomers();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white border border-[#DCE3EC] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone, or ID..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A]"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#EEF2F6] rounded-lg">
            {['All', 'Active', 'Inactive', 'Suspended'].map((st) => (
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
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0B192C] hover:bg-[#122642] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 text-[#EAB308]" />
          Add Customer
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs font-medium text-rose-700">
          {error}
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-white border border-[#DCE3EC] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#DCE3EC] bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    Loading customer directory...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 text-sm">
                    No customers match the current search or filter.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.customer_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-slate-500 tabular-nums">
                      CUST-{String(c.customer_id).padStart(4, '0')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#0F213A]">{c.full_name}</div>
                      <div className="text-xs text-slate-500">
                        {c.service_count ?? 0} services · {c.unpaid_bills ?? 0} open bills
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700">{c.email}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                      {c.phone}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 max-w-xs truncate">
                      {c.address}, {c.city}
                    </td>
                    <td className="py-3 px-4">
                      <StatusText status={c.status} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleViewDetails(c)}
                          title="View Customer Profile"
                          className="p-1.5 text-slate-600 hover:text-[#0F213A] hover:bg-slate-100 rounded-md cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(c)}
                          title="Edit Customer"
                          className="p-1.5 text-slate-600 hover:text-[#0F213A] hover:bg-slate-100 rounded-md cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(c)}
                          title="Delete Customer"
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
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

      {/* Add / Edit Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE3EC] rounded-xl w-full max-w-lg shadow-lg overflow-hidden">
            <div className="px-5 py-4 bg-[#0B192C] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">{editing ? 'Edit Customer' : 'Add New Customer'}</h3>
              <button type="button" onClick={() => setFormOpen(false)} className="text-slate-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F213A] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F213A] mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F213A] mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91-98400-00000"
                    className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F213A] mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F213A] mb-1">Address</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F213A] mb-1">Account Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' | 'Suspended' })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A] bg-white"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-[#0F213A] border border-[#DCE3EC] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0B192C] hover:bg-[#122642] rounded-lg cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {detailData && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE3EC] rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-lg overflow-hidden">
            <div className="px-5 py-4 bg-[#0B192C] text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold">{detailData.customer.full_name}</h3>
                <p className="text-xs text-slate-300 font-mono">
                  CUST-{String(detailData.customer.customer_id).padStart(4, '0')} · {detailData.customer.phone}
                </p>
              </div>
              <button type="button" onClick={() => setDetailData(null)} className="text-slate-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-slate-500 block">Email</span>
                  <span className="font-medium text-[#0F213A]">{detailData.customer.email}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">City</span>
                  <span className="font-medium text-[#0F213A]">{detailData.customer.city}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status</span>
                  <StatusText status={detailData.customer.status} />
                </div>
                <div>
                  <span className="text-slate-500 block">Joined</span>
                  <span className="font-mono text-[#0F213A]">{detailData.customer.created_at}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#0F213A] mb-2">Provisioned Services ({detailData.services.length})</h4>
                {detailData.services.length === 0 ? (
                  <p className="text-slate-500">No services assigned.</p>
                ) : (
                  <div className="border border-[#DCE3EC] rounded-lg divide-y divide-slate-100">
                    {detailData.services.map((s) => (
                      <div key={s.service_id} className="px-3 py-2 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-[#0F213A]">{s.service_type}</span> ·{' '}
                          <span className="font-mono text-slate-600">{s.service_identifier}</span>
                          <span className="text-slate-500"> ({s.service_area})</span>
                        </div>
                        <StatusText status={s.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-[#0F213A] mb-2">
                  Active & Past Subscriptions ({detailData.subscriptions.length})
                </h4>
                {detailData.subscriptions.length === 0 ? (
                  <p className="text-slate-500">No subscriptions found.</p>
                ) : (
                  <div className="border border-[#DCE3EC] rounded-lg divide-y divide-slate-100">
                    {detailData.subscriptions.map((sub) => (
                      <div key={sub.subscription_id} className="px-3 py-2 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-[#0F213A]">{sub.plan_name}</span>
                          <span className="text-slate-500 font-mono ml-2">
                            {sub.start_date} → {sub.expiry_date}
                          </span>
                        </div>
                        <StatusText status={sub.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-[#0F213A] mb-2">Invoices ({detailData.bills.length})</h4>
                {detailData.bills.length === 0 ? (
                  <p className="text-slate-500">No invoices generated.</p>
                ) : (
                  <div className="border border-[#DCE3EC] rounded-lg divide-y divide-slate-100">
                    {detailData.bills.map((b) => (
                      <div key={b.bill_id} className="px-3 py-2 flex items-center justify-between">
                        <div>
                          <span className="font-mono font-semibold text-[#0F213A]">{b.bill_number}</span>
                          <span className="text-slate-500 ml-2">Period {b.billing_period}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-semibold tabular-nums">{formatCurrency(b.amount)}</span>
                          <StatusText status={b.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE3EC] rounded-xl w-full max-w-sm p-5 shadow-lg">
            <h3 className="text-sm font-bold text-[#0F213A]">Delete Customer Account</h3>
            <p className="text-xs text-slate-600 mt-2">
              Are you sure you want to delete <strong>{deleteTarget.full_name}</strong>? Associated services,
              subscriptions, bills, and tickets will be removed.
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
