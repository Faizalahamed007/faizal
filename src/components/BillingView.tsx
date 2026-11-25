import { useEffect, useState, FormEvent } from 'react';
import { Plus, CreditCard, Smartphone, Banknote, X, CheckCircle2 } from 'lucide-react';
import { apiRequest, formatCurrency } from '../lib/api';
import { Bill, Customer, Payment, Subscription } from '../types';
import { StatusText } from './StatusText';

export function BillingView() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [activeTab, setActiveTab] = useState<'bills' | 'payments'>('bills');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [generateOpen, setGenerateOpen] = useState(false);
  const [billForm, setBillForm] = useState({
    customer_id: '',
    subscription_id: '',
    billing_period: new Date().toISOString().slice(0, 7),
    amount: '599',
    due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  });

  const [payTarget, setPayTarget] = useState<Bill | null>(null);
  const [payMode, setPayMode] = useState<'UPI' | 'Card' | 'Cash'>('UPI');
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const q = statusFilter !== 'All' ? `?status=${statusFilter}` : '';
      const [billRes, custRes, subRes] = await Promise.all([
        apiRequest<{ bills: Bill[]; payments: Payment[] }>(`/api/billing${q}`),
        apiRequest<{ customers: Customer[] }>('/api/customers'),
        apiRequest<{ subscriptions: Subscription[] }>('/api/subscriptions'),
      ]);
      setBills(billRes.bills);
      setPayments(billRes.payments);
      setCustomers(custRes.customers);
      setSubscriptions(subRes.subscriptions);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [statusFilter]);

  function openGenerate() {
    const firstCust = customers[0];
    setBillForm({
      customer_id: firstCust ? String(firstCust.customer_id) : '',
      subscription_id: '',
      billing_period: new Date().toISOString().slice(0, 7),
      amount: '599',
      due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    });
    setGenerateOpen(true);
  }

  async function handleGenerateBill(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      const res = await apiRequest<{ bill_number: string }>('/api/billing', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: Number(billForm.customer_id),
          subscription_id: billForm.subscription_id ? Number(billForm.subscription_id) : null,
          billing_period: billForm.billing_period,
          amount: Number(billForm.amount),
          due_date: billForm.due_date,
        }),
      });
      setGenerateOpen(false);
      setSuccessMsg(`Generated invoice ${res.bill_number}.`);
      await loadAll();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function openPaymentModal(bill: Bill) {
    const remaining = Math.max(0, bill.amount - (bill.total_paid || 0));
    setPayTarget(bill);
    setPayMode('UPI');
    setPayAmount(String(remaining > 0 ? remaining : bill.amount));
    setPayNotes('');
  }

  async function handleRecordPayment(e: FormEvent) {
    e.preventDefault();
    if (!payTarget) return;
    setError('');
    setSuccessMsg('');
    try {
      const res = await apiRequest<{ transaction_ref: string }>(`/api/billing/${payTarget.bill_id}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          amount_paid: Number(payAmount),
          payment_mode: payMode,
          notes: payNotes,
        }),
      });
      setPayTarget(null);
      setSuccessMsg(`Recorded ${payMode} payment (${res.transaction_ref}) and updated bill status.`);
      await loadAll();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const customerSubs = subscriptions.filter((s) => String(s.customer_id) === billForm.customer_id);

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#DCE3EC] rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#EEF2F6] rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('bills')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                activeTab === 'bills' ? 'bg-white text-[#0F213A] shadow-xs' : 'text-slate-600'
              }`}
            >
              Customer Bills ({bills.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('payments')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                activeTab === 'payments' ? 'bg-white text-[#0F213A] shadow-xs' : 'text-slate-600'
              }`}
            >
              Payment Ledger ({payments.length})
            </button>
          </div>

          {activeTab === 'bills' && (
            <div className="flex items-center gap-1 p-1 bg-[#EEF2F6] rounded-lg">
              {['All', 'Paid', 'Unpaid', 'Partial', 'Overdue'].map((st) => (
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
          )}
        </div>

        <button
          type="button"
          onClick={openGenerate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0B192C] hover:bg-[#122642] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 text-[#EAB308]" />
          Generate Bill
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs font-medium text-rose-700">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {activeTab === 'bills' ? (
        <div className="bg-white border border-[#DCE3EC] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DCE3EC] bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Bill Number</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Billing Period</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Payment Mode</th>
                  <th className="py-3 px-4">Payment Status</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                      Loading billing records...
                    </td>
                  </tr>
                ) : bills.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500 text-sm">
                      No bills found for the selected filter.
                    </td>
                  </tr>
                ) : (
                  bills.map((b) => {
                    const paidAmt = b.total_paid || 0;
                    return (
                      <tr key={b.bill_id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-[#0F213A]">
                          {b.bill_number}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#0F213A]">{b.customer_name}</div>
                          <div className="text-xs text-slate-500 font-mono">{b.customer_phone}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-700">{b.billing_period}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="font-mono font-semibold text-[#0F213A] tabular-nums">
                            {formatCurrency(b.amount)}
                          </div>
                          {paidAmt > 0 && paidAmt < b.amount && (
                            <div className="text-[11px] font-mono text-emerald-700 tabular-nums">
                              Paid: {formatCurrency(paidAmt)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700">
                          {b.latest_payment_mode ? b.latest_payment_mode : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <StatusText status={b.status} />
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums">{b.due_date}</td>
                        <td className="py-3 px-4 text-right">
                          {b.status !== 'Paid' ? (
                            <button
                              type="button"
                              onClick={() => openPaymentModal(b)}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0B192C] hover:bg-[#122642] rounded-md cursor-pointer whitespace-nowrap"
                            >
                              Record Payment
                            </button>
                          ) : (
                            <span className="text-xs font-mono text-slate-400">Settled</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#DCE3EC] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DCE3EC] bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Transaction Ref</th>
                  <th className="py-3 px-4">Bill Number</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {payments.map((p) => (
                  <tr key={p.payment_id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-[#0F213A]">{p.transaction_ref}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">{p.bill_number}</td>
                    <td className="py-3 px-4 font-medium text-[#0F213A]">{p.customer_name}</td>
                    <td className="py-3 px-4 text-xs font-semibold text-slate-700">{p.payment_mode}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                      {formatCurrency(p.amount_paid)}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums">{p.payment_date}</td>
                    <td className="py-3 px-4 text-xs text-slate-500">{p.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generate Bill Modal */}
      {generateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE3EC] rounded-xl w-full max-w-md shadow-lg overflow-hidden">
            <div className="px-5 py-4 bg-[#0B192C] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Generate Customer Bill</h3>
              <button type="button" onClick={() => setGenerateOpen(false)} className="text-slate-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleGenerateBill} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F213A] mb-1">Customer</label>
                <select
                  required
                  value={billForm.customer_id}
                  onChange={(e) => setBillForm({ ...billForm, customer_id: e.target.value, subscription_id: '' })}
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
                <label className="block text-xs font-semibold text-[#0F213A] mb-1">Subscription (optional)</label>
                <select
                  value={billForm.subscription_id}
                  onChange={(e) => {
                    const sub = customerSubs.find((s) => String(s.subscription_id) === e.target.value);
                    setBillForm({
                      ...billForm,
                      subscription_id: e.target.value,
                      amount: sub?.monthly_fee ? String(sub.monthly_fee) : billForm.amount,
                    });
                  }}
                  className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg bg-white focus:outline-none focus:border-[#0F213A]"
                >
                  <option value="">General invoice (no linked subscription)</option>
                  {customerSubs.map((s) => (
                    <option key={s.subscription_id} value={s.subscription_id}>
                      {s.plan_name} — {formatCurrency(s.monthly_fee || 0)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F213A] mb-1">Billing Period</label>
                  <input
                    type="month"
                    required
                    value={billForm.billing_period}
                    onChange={(e) => setBillForm({ ...billForm, billing_period: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F213A] mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={billForm.amount}
                    onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F213A] mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={billForm.due_date}
                  onChange={(e) => setBillForm({ ...billForm, due_date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A]"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setGenerateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 border border-[#DCE3EC] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0B192C] hover:bg-[#122642] rounded-lg cursor-pointer"
                >
                  Generate Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Simulated Payment Modal */}
      {payTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE3EC] rounded-xl w-full max-w-md shadow-lg overflow-hidden">
            <div className="px-5 py-4 bg-[#0B192C] text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Record Payment</h3>
                <p className="text-xs text-slate-300 font-mono">
                  {payTarget.bill_number} · {payTarget.customer_name}
                </p>
              </div>
              <button type="button" onClick={() => setPayTarget(null)} className="text-slate-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-5 space-y-4">
              <div className="bg-[#EEF2F6] rounded-lg p-3 flex items-center justify-between text-xs">
                <span className="text-slate-600">Total Bill Amount</span>
                <span className="font-mono font-bold text-[#0F213A] tabular-nums">
                  {formatCurrency(payTarget.amount)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F213A] mb-2">Simulated Payment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'UPI' as const, label: 'UPI', icon: Smartphone },
                    { id: 'Card' as const, label: 'Card', icon: CreditCard },
                    { id: 'Cash' as const, label: 'Cash', icon: Banknote },
                  ].map((mode) => {
                    const Icon = mode.icon;
                    const active = payMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setPayMode(mode.id)}
                        className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#0B192C] text-white border-[#0B192C]'
                            : 'bg-white text-slate-700 border-[#DCE3EC] hover:border-[#0F213A]'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${active ? 'text-[#EAB308]' : 'text-slate-500'}`} />
                        {mode.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F213A] mb-1">Amount to Pay (₹)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F213A] mb-1">Payment Notes</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder={`Settled via ${payMode}`}
                  className="w-full px-3 py-2 text-sm border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPayTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 border border-[#DCE3EC] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0B192C] hover:bg-[#122642] rounded-lg cursor-pointer"
                >
                  Confirm {payMode} Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
