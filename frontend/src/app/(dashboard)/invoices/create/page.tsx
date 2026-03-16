'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Navbar from '@/components/layout/Navbar';
import api from '@/lib/api';
import { Client } from '@/types';
import { toast } from 'sonner';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clientId: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    taxRate: 0,
    discount: 0,
    notes: '',
  });
  const [items, setItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unitPrice: 0 },
  ]);

  useEffect(() => {
    api.get('/clients', { params: { limit: 100 } }).then((res) => setClients(res.data.clients));
  }, []);

  const addItem = () => setItems([...items, { description: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, key: keyof LineItem, value: string | number) => {
    const updated = [...items];
    (updated[i] as any)[key] = value;
    setItems(updated);
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discounted = subtotal - form.discount;
  const taxAmount = (discounted * form.taxRate) / 100;
  const total = discounted + taxAmount;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

  const handleSubmit = async () => {
    if (!form.clientId) return toast.error('Please select a client');
    if (items.some((i) => !i.description)) return toast.error('All items need a description');

    setSaving(true);
    try {
      await api.post('/invoices', {
        ...form,
        issueDate: new Date(form.issueDate).toISOString(),
        dueDate: new Date(form.dueDate).toISOString(),
        taxRate: Number(form.taxRate),
        discount: Number(form.discount),
        items: items.map((i) => ({
          ...i,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        })),
      });
      toast.success('Invoice created!');
      router.push('/invoices');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <Navbar title="Create Invoice" />
      <div className="p-8 max-w-4xl">

        {/* Back */}
        <Link href="/invoices" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={16} /> Back to Invoices
        </Link>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="col-span-2 space-y-6">

            {/* Client & Dates */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Invoice Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                  <select value={form.clientId}
                    onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">Select a client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                  <input type="date" value={form.issueDate}
                    onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input type="date" value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Line Items</h3>
              <div className="space-y-3">
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <input value={item.description}
                        onChange={(e) => updateItem(i, 'description', e.target.value)}
                        placeholder="Description"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div className="col-span-2">
                      <input type="number" value={item.quantity}
                        onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                        placeholder="Qty"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div className="col-span-3">
                      <input type="number" value={item.unitPrice}
                        onChange={(e) => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)}
                        placeholder="Unit Price"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div className="col-span-1 text-sm text-gray-600 text-right font-medium">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {items.length > 1 && (
                        <button onClick={() => removeItem(i)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={addItem}
                className="mt-3 flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium">
                <Plus size={15} /> Add Item
              </button>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Notes</h3>
              <textarea value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3} placeholder="Payment terms, thank you message..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-4">Summary</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tax Rate (%)</label>
                  <input type="number" value={form.taxRate}
                    onChange={(e) => setForm({ ...form, taxRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Discount ($)</label>
                  <input type="number" value={form.discount}
                    onChange={(e) => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
                </div>
                {form.discount > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Discount</span><span>- {formatCurrency(form.discount)}</span>
                  </div>
                )}
                {form.taxRate > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tax ({form.taxRate}%)</span><span>{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
                  <span>Total</span><span>{formatCurrency(total)}</span>
                </div>
              </div>
              <button onClick={handleSubmit} disabled={saving}
                className="w-full mt-5 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60">
                {saving ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}