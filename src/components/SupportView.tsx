import { useEffect, useState, FormEvent } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Customer, SupportTicket, TelecomService } from '../types';
import { StatusText } from './StatusText';

export function SupportView() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<TelecomService[]>([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    service_id: '',
    subject: '',
    issue_description: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High',
  });

  const [deleteTarget, setDeleteTarget] = useState<SupportTicket | null>(null);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const q = statusFilter !== 'All' ? `?status=${encodeURIComponent(statusFilter)}` : '';
      const [tRes, cRes, sRes] = await Promise.all([
        apiRequest<{ tickets: SupportTicket[] }>(`/api/support${q}`),
        apiRequest<{ customers: Customer[] }>('/api/customers'),
        apiRequest<{ services: TelecomService[] }>('/api/services'),
      ]);
      setTickets(tRes.tickets);
      setCustomers(cRes.customers);
      setServices(sRes.services);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [statusFilter]);

  function openNewTicket() {
    setFormData({
      customer_id: customers[0] ? String(customers[0].customer_id) : '',
      service_id: '',
      subject: '',
      issue_description: '',
      priority: 'Medium',
    });
    setFormOpen(true);
  }

  async function handleCreateTicket(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiRequest('/api/support', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: Number(formData.customer_id),
          service_id: formData.service_id ? Number(formData.service_id) : null,
          subject: formData.subject,
          issue_description: formData.issue_description,
          priority: formData.priority,
        }),
      });
      setFormOpen(false);
      await loadAll();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleStatusUpdate(ticketId: number, status: string) {
    setError('');
    try {
      await apiRequest(`/api/support/${ticketId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadAll();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await apiRequest(`/api/support/${deleteTarget.ticket_id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      await loadAll();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const customerServices = services.filter((s) => String(s.customer_id) === formData.customer_id);

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#DCE3EC] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-[#EEF2F6] rounded-lg self-start overflow-x-auto">
          {['All', 'Open', 'Pending', 'In Progress', 'Resolved'].map((st) => (
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
          onClick={openNewTicket}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0B192C] hover:bg-[#122642] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 text-[#EAB308]" />
          Register Complaint
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
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Issue</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    Loading support queue...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500 text-sm">
                    No support tickets found.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.ticket_id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono text-xs text-slate-500 tabular-nums">
                      TKT-{String(t.ticket_id).padStart(4, '0')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#0F213A]">{t.customer_name}</div>
                      <div className="text-xs text-slate-500">
                        {t.service_identifier ? `${t.service_type} · ${t.service_identifier}` : t.customer_phone}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      <div className="font-semibold text-[#0F213A] text-xs">{t.subject}</div>
                      <div className="text-xs text-slate-500 line-clamp-1">{t.issue_description}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Priority: {t.priority}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums">{t.created_at}</td>
                    <td className="py-3 px-4">
                      <StatusText status={t.status} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          aria-label={`Update status for ticket ${t.ticket_id}`}
                          value={t.status}
                          onChange={(e) => handleStatusUpdate(t.ticket_id, e.target.value)}
                          className="px-2.5 py-1.5 text-xs font-medium border border-[#DCE3EC] rounded-md bg-white text-[#0F213A] focus:outline-none focus:border-[#0F213A]"
                        >
                          <option value="Open">Open</option>
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(t)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                          title="Delete Ticket"
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
              <h3 className="text-sm font-bold">Register Customer Complaint</h3>
              <button type="button" onClick={() => setFormOpen(false)} className="text-slate-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F213A] mb-1">Customer</label>
                <select
                  required
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value, service_id: '' })}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F213A] mb-1">Affected Service</label>
                  <select
                    value={formData.service_id}
                    onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg bg-white focus:outline-none focus:border-[#0F213A]"
                  >
                    <option value="">General Account</option>
                    {customerServices.map((s) => (
                      <option key={s.service_id} value={s.service_id}>
                        {s.service_type} — {s.service_identifier}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F213A] mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value as 'Low' | 'Medium' | 'High' })
                    }
                    className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg bg-white focus:outline-none focus:border-[#0F213A]"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F213A] mb-1">Issue Subject</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g. Broadband packet loss in evening hours"
                  className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F213A] mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  required
                  value={formData.issue_description}
                  onChange={(e) => setFormData({ ...formData, issue_description: e.target.value })}
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
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE3EC] rounded-xl w-full max-w-sm p-5 shadow-lg">
            <h3 className="text-sm font-bold text-[#0F213A]">Delete Support Ticket</h3>
            <p className="text-xs text-slate-600 mt-2">
              Delete ticket <strong>TKT-{String(deleteTarget.ticket_id).padStart(4, '0')}</strong> ({deleteTarget.subject}
              )?
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
