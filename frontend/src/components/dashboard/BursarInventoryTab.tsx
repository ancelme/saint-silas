import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Boxes, PackagePlus } from 'lucide-react';
import { createStockItem, fetchInventory, recordStockMovement } from '../../services/api';

interface StockItem {
  id: string; name: string; category: string; unit: string; quantity: number; reorderLevel: number; unitCost: number; location: string;
}
interface StockMovement { id: string; itemName: string; type: 'IN' | 'OUT'; quantity: number; unitCost: number; referenceNo: string; recipient: string; notes: string; recordedBy: string; createdAt: string; }

export const BursarInventoryTab: React.FC = () => {
  const [items, setItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [itemForm, setItemForm] = useState({ name: '', category: '', unit: 'pieces', quantity: '0', reorderLevel: '0', unitCost: '0', location: '' });
  const [movementForm, setMovementForm] = useState({ itemId: '', type: 'IN' as 'IN' | 'OUT', quantity: '', unitCost: '', referenceNo: '', recipient: '', notes: '' });

  const load = async () => {
    try { setLoading(true); const data = await fetchInventory(); setItems(data.items); setMovements(data.movements); setError(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load stock records.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const addItem = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await createStockItem({ ...itemForm, quantity: Number(itemForm.quantity), reorderLevel: Number(itemForm.reorderLevel), unitCost: Number(itemForm.unitCost) });
      setItemForm({ name: '', category: '', unit: 'pieces', quantity: '0', reorderLevel: '0', unitCost: '0', location: '' }); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to add stock item.'); } finally { setSaving(false); }
  };
  const moveStock = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await recordStockMovement({ ...movementForm, quantity: Number(movementForm.quantity), unitCost: movementForm.unitCost === '' ? undefined : Number(movementForm.unitCost) });
      setMovementForm({ itemId: '', type: 'IN', quantity: '', unitCost: '', referenceNo: '', recipient: '', notes: '' }); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to record stock movement.'); } finally { setSaving(false); }
  };

  const stockValue = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const lowStock = items.filter(item => item.quantity <= item.reorderLevel);
  const inputClass = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900';

  return <div className="space-y-6">
    <div><h2 className="text-xl font-bold text-slate-900 dark:text-white">Stock In & Stock Out</h2><p className="text-sm text-slate-500">Control inventory quantities, issue stock, and review movement history.</p></div>
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><Boxes className="text-blue-600" size={20} /><div className="mt-2 text-sm text-slate-500">Stock items</div><strong className="text-2xl">{items.length}</strong></div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><Boxes className="text-emerald-600" size={20} /><div className="mt-2 text-sm text-slate-500">Inventory value</div><strong className="text-2xl">{stockValue.toLocaleString()} RWF</strong></div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><AlertTriangle className="text-amber-600" size={20} /><div className="mt-2 text-sm text-slate-500">Low stock</div><strong className="text-2xl">{lowStock.length}</strong></div>
    </div>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-5 lg:grid-cols-3">
      <form onSubmit={addItem} className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"><h3 className="mb-4 flex gap-2 font-bold"><PackagePlus size={18}/> Add stock item</h3><div className="space-y-3"><input required placeholder="Item name" value={itemForm.name} onChange={e=>setItemForm({...itemForm,name:e.target.value})} className={inputClass}/><input required placeholder="Category" value={itemForm.category} onChange={e=>setItemForm({...itemForm,category:e.target.value})} className={inputClass}/><div className="grid grid-cols-2 gap-2"><input required placeholder="Unit" value={itemForm.unit} onChange={e=>setItemForm({...itemForm,unit:e.target.value})} className={inputClass}/><input type="number" min="0" placeholder="Opening qty" value={itemForm.quantity} onChange={e=>setItemForm({...itemForm,quantity:e.target.value})} className={inputClass}/></div><div className="grid grid-cols-2 gap-2"><input type="number" min="0" placeholder="Reorder level" value={itemForm.reorderLevel} onChange={e=>setItemForm({...itemForm,reorderLevel:e.target.value})} className={inputClass}/><input type="number" min="0" placeholder="Unit cost" value={itemForm.unitCost} onChange={e=>setItemForm({...itemForm,unitCost:e.target.value})} className={inputClass}/></div><input placeholder="Storage location" value={itemForm.location} onChange={e=>setItemForm({...itemForm,location:e.target.value})} className={inputClass}/><button disabled={saving} className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">Add item</button></div></form>
      <form onSubmit={moveStock} className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 lg:col-span-2"><h3 className="mb-4 flex gap-2 font-bold"><ArrowDownToLine size={18}/> Record stock movement</h3><div className="grid gap-3 sm:grid-cols-2"><select required value={movementForm.itemId} onChange={e=>setMovementForm({...movementForm,itemId:e.target.value})} className={inputClass}><option value="">Select item</option>{items.map(item=><option key={item.id} value={item.id}>{item.name} ({item.quantity} {item.unit})</option>)}</select><select value={movementForm.type} onChange={e=>setMovementForm({...movementForm,type:e.target.value as 'IN'|'OUT'})} className={inputClass}><option value="IN">Stock in / Received</option><option value="OUT">Stock out / Issued</option></select><input required type="number" min="0.01" step="any" placeholder="Quantity" value={movementForm.quantity} onChange={e=>setMovementForm({...movementForm,quantity:e.target.value})} className={inputClass}/><input type="number" min="0" placeholder="Unit cost (stock in)" value={movementForm.unitCost} onChange={e=>setMovementForm({...movementForm,unitCost:e.target.value})} className={inputClass}/><input placeholder="Reference / invoice" value={movementForm.referenceNo} onChange={e=>setMovementForm({...movementForm,referenceNo:e.target.value})} className={inputClass}/><input placeholder="Recipient / supplier" value={movementForm.recipient} onChange={e=>setMovementForm({...movementForm,recipient:e.target.value})} className={inputClass}/><textarea placeholder="Notes" value={movementForm.notes} onChange={e=>setMovementForm({...movementForm,notes:e.target.value})} className={`${inputClass} sm:col-span-2`} /><button disabled={saving || !items.length} className="rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-2">Record {movementForm.type === 'IN' ? 'stock in' : 'stock out'}</button></div></form>
    </div>
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"><div className="border-b px-4 py-3 font-bold">Inventory balance</div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900"><tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">Location</th><th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3 text-right">Unit value</th></tr></thead><tbody>{loading ? <tr><td colSpan={4} className="p-8 text-center">Loading stock...</td></tr> : items.map(item=>{const low=item.quantity<=item.reorderLevel; return <tr key={item.id} className="border-t border-slate-100 dark:border-slate-700"><td className="px-4 py-3 font-medium">{item.name}<div className="text-xs text-slate-500">{item.category}</div></td><td className="px-4 py-3">{item.location || '-'}</td><td className={`px-4 py-3 text-right font-bold ${low?'text-red-600':''}`}>{item.quantity.toLocaleString()} {item.unit}{low&&' • Low'}</td><td className="px-4 py-3 text-right">{item.unitCost.toLocaleString()} RWF</td></tr>})}</tbody></table></div></div>
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"><div className="border-b px-4 py-3 font-bold">Recent movements</div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Item</th><th className="px-4 py-3">Type</th><th className="px-4 py-3 text-right">Quantity</th><th className="px-4 py-3">Reference</th></tr></thead><tbody>{movements.map(movement=> <tr key={movement.id} className="border-t border-slate-100 dark:border-slate-700"><td className="px-4 py-3">{new Date(movement.createdAt).toLocaleString()}</td><td className="px-4 py-3 font-medium">{movement.itemName}</td><td className="px-4 py-3">{movement.type === 'IN' ? <span className="inline-flex gap-1 text-emerald-700"><ArrowDownToLine size={16}/> Stock in</span> : <span className="inline-flex gap-1 text-red-700"><ArrowUpFromLine size={16}/> Stock out</span>}</td><td className="px-4 py-3 text-right font-bold">{movement.quantity.toLocaleString()}</td><td className="px-4 py-3">{movement.referenceNo || '-'}</td></tr>)}</tbody></table></div></div>
  </div>;
};
