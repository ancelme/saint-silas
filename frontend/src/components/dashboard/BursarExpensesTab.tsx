import React, { useEffect, useState } from 'react';
import { Banknote, Plus, ReceiptText, TrendingDown } from 'lucide-react';
import { Expense } from '../../types';
import { createExpense, fetchExpenses } from '../../services/api';
import { ShareToAdminButton } from '../common/ShareToAdminButton';

const categories = ['Salaries', 'Utilities', 'Meals & Feeding', 'Learning Materials', 'Transport', 'Maintenance', 'Administration', 'Other'];

export const BursarExpensesTab: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', category: categories[0], amount: '', date: new Date().toISOString().slice(0, 10), receiptNo: '', notes: '' });

  const load = async () => {
    try { setLoading(true); setExpenses(await fetchExpenses()); setError(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load expenses.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const thisMonth = expenses.filter(expense => expense.date?.startsWith(new Date().toISOString().slice(0, 7))).reduce((sum, expense) => sum + expense.amount, 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true); setError('');
    try {
      await createExpense({ ...form, amount: Number(form.amount) });
      setForm({ title: '', category: categories[0], amount: '', date: new Date().toISOString().slice(0, 10), receiptNo: '', notes: '' });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to record expense.'); }
    finally { setSaving(false); }
  };

  return <div className="space-y-6">
    <div><h2 className="text-xl font-bold text-slate-900 dark:text-white">Expenses & Expenditure</h2><p className="text-sm text-slate-500">Record and review operational school spending.</p></div>
    <div className="grid gap-4 sm:grid-cols-3">
      {[['Total recorded', total, TrendingDown], ['This month', thisMonth, Banknote], ['Transactions', expenses.length, ReceiptText]].map(([label, value, Icon]: any) => <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><div className="flex items-center justify-between"><span className="text-sm text-slate-500">{label}</span><Icon size={18} className="text-blue-600" /></div><strong className="mt-2 block text-2xl text-slate-900 dark:text-white">{typeof value === 'number' && label !== 'Transactions' ? `${value.toLocaleString()} RWF` : value}</strong></div>)}
    </div>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form onSubmit={submit} className="h-fit rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-4 flex items-center gap-2 font-bold"><Plus size={18} /> Record expense</h3>
        <div className="space-y-3">
          <input required placeholder="Expense description" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" />
          <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900">{categories.map(category => <option key={category}>{category}</option>)}</select>
          <input required type="number" min="1" placeholder="Amount (RWF)" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" />
          <input required type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" />
          <input placeholder="Receipt number" value={form.receiptNo} onChange={e => setForm({...form, receiptNo: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" />
          <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" />
          <button disabled={saving} className="w-full rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving...' : 'Record expense'}</button>
        </div>
      </form>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900"><tr><th className="px-4 py-3">Description</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Date</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-right">Share</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading expenses...</td></tr> : expenses.map(expense => <tr key={expense.id} className="border-t border-slate-100 dark:border-slate-700"><td className="px-4 py-3 font-medium">{expense.title}<div className="text-xs text-slate-500">{expense.receiptNo}</div></td><td className="px-4 py-3">{expense.category}</td><td className="px-4 py-3">{expense.date}</td><td className="px-4 py-3 text-right font-semibold">{expense.amount.toLocaleString()} RWF</td><td className="px-4 py-3 text-right"><ShareToAdminButton label="Share" subject={`Expense: ${expense.title}`} body={`Description: ${expense.title}\nCategory: ${expense.category}\nDate: ${expense.date}\nAmount: ${expense.amount.toLocaleString()} RWF\nReceipt: ${expense.receiptNo || 'Not provided'}\nNotes: ${expense.notes || 'None'}`} /></td></tr>)}{!loading && expenses.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">No expenses recorded.</td></tr>}</tbody></table></div>
      </div>
    </div>
  </div>;
};
