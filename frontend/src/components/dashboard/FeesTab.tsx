import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { FeeInvoice, FeePaymentRequest, Student } from '../../types';
import { Wallet, CheckCircle2, X } from 'lucide-react';
import { fetchPaymentRequests, reviewPaymentRequest, submitParentPaymentRequest } from '../../services/api';

type PaymentMethod = 'MTN Mobile Money' | 'Airtel Money' | 'Bank Transfer' | 'Cash';

interface FeesTabProps {
  fees: FeeInvoice[];
  students?: Student[];
  onRecordPayment: (invoiceId: string, amount: number, method: PaymentMethod, referenceNo?: string, phoneNumber?: string) => Promise<string>;
  onAddFeeInvoice?: (invoice: FeeInvoice) => void;
  onUpdateFeeInvoice?: (invoice: FeeInvoice) => void;
  onDeleteFeeInvoice?: (id: string) => void;
}

export const FeesTab: React.FC<FeesTabProps> = ({ fees, students = [], onRecordPayment }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const canRecordPayments = user?.role === 'admin' || user?.role === 'accountant';
  const isParent = user?.role === 'parent';
  const [activeInvoice, setActiveInvoice] = useState<FeeInvoice | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('MTN Mobile Money');
  const [payerPhone, setPayerPhone] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [payAmount, setPayAmount] = useState<number>(0);
  const [receiptData, setReceiptData] = useState<{
    referenceNo: string;
    invoiceNo: string;
    studentName: string;
    amount: number;
    method: PaymentMethod;
    date: string;
  } | null>(null);
  const [paymentError, setPaymentError] = useState('');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [selectedParentStudent, setSelectedParentStudent] = useState('');
  const [selectedParentInvoice, setSelectedParentInvoice] = useState('');
  const [parentPayMethod, setParentPayMethod] = useState<PaymentMethod>('MTN Mobile Money');
  const [parentPayAmount, setParentPayAmount] = useState(0);
  const [parentPaymentReference, setParentPaymentReference] = useState('');
  const [parentPayerPhone, setParentPayerPhone] = useState('');
  const [parentRequestError, setParentRequestError] = useState('');
  const [parentRequestMessage, setParentRequestMessage] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [paymentRequests, setPaymentRequests] = useState<FeePaymentRequest[]>([]);
  const [paymentRequestError, setPaymentRequestError] = useState('');
  const [reviewingRequestId, setReviewingRequestId] = useState('');
  const [feeOverrides, setFeeOverrides] = useState<Record<string, Partial<FeeInvoice>>>({});

  const visibleFees = fees.map(invoice => ({ ...invoice, ...feeOverrides[invoice.id] }));
  const parentInvoices = visibleFees.filter(invoice =>
    invoice.studentId === selectedParentStudent &&
    (invoice.balance ?? (invoice.amountTotal - invoice.amountPaid)) > 0
  );
  const currentParentInvoice = parentInvoices.find(invoice => invoice.id === selectedParentInvoice);

  useEffect(() => {
    if (!canRecordPayments) return;
    let isCurrent = true;
    fetchPaymentRequests()
      .then(requests => {
        if (isCurrent) setPaymentRequests(requests);
      })
      .catch(error => {
        if (isCurrent) setPaymentRequestError(error instanceof Error ? error.message : 'Failed to load payment requests.');
      });
    return () => {
      isCurrent = false;
    };
  }, [canRecordPayments]);

  const totalBilled = visibleFees.reduce((acc, f) => acc + f.amountTotal, 0);
  const totalPaid = visibleFees.reduce((acc, f) => acc + f.amountPaid, 0);
  const totalBalance = totalBilled - totalPaid;

  const formatRWF = (n: number) => {
    return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 })
      .format(n)
      .replace('RWF', '')
      .trim() + ' RWF';
  };

  const openPaymentModal = (invoice: FeeInvoice) => {
    setActiveInvoice(invoice);
    const bal = invoice.balance ?? (invoice.amountTotal - invoice.amountPaid);
    setPayAmount(bal);
    setPaymentError('');
    setPaymentReference('');
    setPayerPhone('');
  };

  const handleParentPaymentRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentParentInvoice || parentPayAmount <= 0 || isSubmittingRequest) return;
    setIsSubmittingRequest(true);
    setParentRequestError('');
    setParentRequestMessage('');
    try {
      const result = await submitParentPaymentRequest({
        invoiceId: currentParentInvoice.id,
        amount: parentPayAmount,
        paymentMethod: parentPayMethod,
        referenceNo: parentPaymentReference.trim() || undefined,
        phoneNumber: parentPayerPhone.trim() || undefined,
      });
      setParentRequestMessage(result.message);
      setParentPaymentReference('');
      setParentPayerPhone('');
      setParentPayAmount(0);
    } catch (error) {
      setParentRequestError(error instanceof Error ? error.message : 'Unable to submit payment details.');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleReviewPaymentRequest = async (request: FeePaymentRequest, decision: 'Verified' | 'Rejected') => {
    setReviewingRequestId(request.id);
    setPaymentRequestError('');
    try {
      const result = await reviewPaymentRequest(request.id, decision);
      setPaymentRequests(previous => previous.filter(item => item.id !== request.id));
      if (decision === 'Verified' && result.invoiceId && result.amountPaid !== undefined && result.newBalance !== undefined && result.feeStatus) {
        setFeeOverrides(previous => ({
          ...previous,
          [result.invoiceId as string]: {
            amountPaid: result.amountPaid,
            balance: result.newBalance,
            status: result.feeStatus,
            paymentMethod: request.paymentMethod,
          },
        }));
      }
    } catch (error) {
      setPaymentRequestError(error instanceof Error ? error.message : 'Unable to review payment request.');
    } finally {
      setReviewingRequestId('');
    }
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvoice || payAmount <= 0 || isRecordingPayment) return;

    setIsRecordingPayment(true);
    setPaymentError('');
    try {
      const referenceNo = await onRecordPayment(
        activeInvoice.id,
        payAmount,
        payMethod,
        paymentReference.trim() || undefined,
        payerPhone.trim() || undefined,
      );
      setReceiptData({
        referenceNo,
        invoiceNo: activeInvoice.invoiceNumber || activeInvoice.invoiceNo || activeInvoice.id,
        studentName: activeInvoice.studentName,
        amount: payAmount,
        method: payMethod,
        date: new Date().toLocaleString(),
      });
      setActiveInvoice(null);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Unable to record this payment.');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t('dashFees')}
          </h2>
          <p className="text-xs text-slate-500">
            View tuition billed, fees paid, and the remaining balance for each pupil.
          </p>
        </div>
      </div>

      {isParent && (
        <section className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Submit Payment Details</h3>
            <p className="text-xs text-slate-500 mt-1">
              Select the pupil and invoice this payment is for. The school must verify the payment before the balance changes.
            </p>
          </div>
          {parentRequestMessage && (
            <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{parentRequestMessage}</p>
          )}
          {parentRequestError && (
            <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{parentRequestError}</p>
          )}
          <form onSubmit={handleParentPaymentRequest} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Pupil
              <select
                required
                value={selectedParentStudent}
                onChange={e => {
                  const studentId = e.target.value;
                  setSelectedParentStudent(studentId);
                  setSelectedParentInvoice(visibleFees.find(invoice =>
                    invoice.studentId === studentId &&
                    (invoice.balance ?? invoice.amountTotal - invoice.amountPaid) > 0
                  )?.id || '');
                  setParentRequestMessage('');
                  setParentRequestError('');
                }}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
              >
                <option value="">Select your pupil</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>{student.firstName} {student.lastName} — {student.grade}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Fee invoice
              <select
                required
                value={selectedParentInvoice}
                onChange={e => {
                  setSelectedParentInvoice(e.target.value);
                  setParentPayAmount(0);
                  setParentRequestMessage('');
                  setParentRequestError('');
                }}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
              >
                <option value="">Select an invoice</option>
                {parentInvoices.map(invoice => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNumber || invoice.invoiceNo || invoice.id} — Balance {formatRWF(invoice.balance ?? invoice.amountTotal - invoice.amountPaid)}
                  </option>
                ))}
              </select>
            </label>
            {currentParentInvoice && (
              <>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Payment method
                  <select
                    value={parentPayMethod}
                    onChange={e => setParentPayMethod(e.target.value as PaymentMethod)}
                    className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option>MTN Mobile Money</option>
                    <option>Airtel Money</option>
                    <option>Bank Transfer</option>
                    <option>Cash</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Amount paid (RWF)
                  <input
                    type="number"
                    required
                    min={1}
                    max={currentParentInvoice.balance ?? currentParentInvoice.amountTotal - currentParentInvoice.amountPaid}
                    value={parentPayAmount || ''}
                    onChange={e => setParentPayAmount(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                  />
                </label>
                {(parentPayMethod === 'MTN Mobile Money' || parentPayMethod === 'Airtel Money') && (
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Payer phone number
                    <input
                      type="tel"
                      value={parentPayerPhone}
                      onChange={e => setParentPayerPhone(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                    />
                  </label>
                )}
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Transaction / receipt reference
                  <input
                    type="text"
                    maxLength={100}
                    value={parentPaymentReference}
                    onChange={e => setParentPaymentReference(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                  />
                </label>
                <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center gap-3">
                  <p className="flex-1 text-[11px] text-amber-700 dark:text-amber-300">
                    This records a payment report only; it does not transfer money or immediately change fees paid.
                  </p>
                  <button
                    type="submit"
                    disabled={isSubmittingRequest || parentPayAmount <= 0}
                    className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {isSubmittingRequest ? 'Submitting...' : 'Send for school verification'}
                  </button>
                </div>
              </>
            )}
          </form>
          {students.length === 0 && (
            <p className="text-xs text-amber-700">No pupils are linked to your parent account yet. Contact the school administrator.</p>
          )}
        </section>
      )}

      {canRecordPayments && (
        <section className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-white">Parent Payment Requests</h3>
          {paymentRequestError && <p role="alert" className="text-xs text-rose-600">{paymentRequestError}</p>}
          {paymentRequests.length === 0 ? (
            <p className="text-xs text-slate-500">No parent payments are waiting for verification.</p>
          ) : paymentRequests.map(request => (
            <div key={request.id} className="flex flex-col sm:flex-row sm:items-center gap-3 border-t border-slate-100 dark:border-slate-700 pt-3">
              <div className="flex-1 text-xs">
                <p className="font-bold text-slate-900 dark:text-white">{request.studentName} — {request.grade} · {request.parentName}</p>
                <p className="text-slate-500">{request.paymentMethod} · {request.referenceNo} · {formatRWF(request.amount)}</p>
                {request.phoneNumber && <p className="text-slate-500">Payer: {request.phoneNumber}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={reviewingRequestId === request.id}
                  onClick={() => handleReviewPaymentRequest(request, 'Verified')}
                  className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  Verify
                </button>
                <button
                  type="button"
                  disabled={reviewingRequestId === request.id}
                  onClick={() => handleReviewPaymentRequest(request, 'Rejected')}
                  className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-xs text-slate-500 font-bold uppercase block mb-1">Total Term Billing</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white">{formatRWF(totalBilled)}</span>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-xs text-slate-500 font-bold uppercase block mb-1">Collected Revenue</span>
          <span className="text-2xl font-black text-emerald-600">{formatRWF(totalPaid)}</span>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-xs text-slate-500 font-bold uppercase block mb-1">Outstanding Balance</span>
          <span className="text-2xl font-black text-rose-600">{formatRWF(totalBalance)}</span>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850 text-slate-500 font-semibold">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Total Billed</th>
                <th className="py-3 px-4">Paid</th>
                <th className="py-3 px-4">Balance</th>
                <th className="py-3 px-4">Last Payment Method</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {visibleFees.map(inv => {
                const bal = inv.balance ?? (inv.amountTotal - inv.amountPaid);
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750">
                    <td className="py-3 px-4 font-mono font-bold text-slate-600 dark:text-slate-300">
                      {inv.invoiceNumber || inv.invoiceNo}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {inv.studentName}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {inv.grade}
                    </td>
                    <td className="py-3 px-4 font-bold">
                      {formatRWF(inv.amountTotal)}
                    </td>
                    <td className="py-3 px-4 text-emerald-600 font-bold">
                      {formatRWF(inv.amountPaid)}
                    </td>
                    <td className="py-3 px-4 font-bold text-rose-600">
                      {formatRWF(bal)}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {inv.paymentMethod || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {inv.dueDate}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        inv.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'Partial'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {bal > 0 && canRecordPayments ? (
                        <button
                          type="button"
                          onClick={() => openPaymentModal(inv)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        >
                          Record Payment
                        </button>
                      ) : bal <= 0 ? (
                        <span className="text-[11px] font-semibold text-emerald-600 flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Cleared
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">Contact the school bursar</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verified payment recording modal; no payment gateway is connected. */}
      {activeInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
            <button
              type="button"
              onClick={() => setActiveInvoice(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                Record Verified Payment
              </span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Settle School Fees
              </h3>
              <p className="text-xs text-slate-500">
                Invoice {activeInvoice.invoiceNumber || activeInvoice.invoiceNo || activeInvoice.id} • {activeInvoice.studentName}
              </p>
            </div>

            {/* Payment Method Selector */}
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Record a payment only after the school has received or verified it. This form does not process online payments.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'MTN Mobile Money', label: 'MTN MoMo', color: 'border-yellow-400 bg-yellow-50/40 text-yellow-800 dark:text-yellow-300' },
                { id: 'Airtel Money', label: 'Airtel Money', color: 'border-rose-400 bg-rose-50/40 text-rose-800 dark:text-rose-300' },
                { id: 'Bank Transfer', label: 'Bank of Kigali', color: 'border-blue-400 bg-blue-50/40 text-blue-800 dark:text-blue-300' },
                { id: 'Cash', label: 'Cash', color: 'border-emerald-400 bg-emerald-50/40 text-emerald-800 dark:text-emerald-300' },
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPayMethod(m.id as PaymentMethod)}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                    payMethod === m.id
                      ? `${m.color} ring-2 ring-emerald-500`
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-4">
              {(payMethod === 'MTN Mobile Money' || payMethod === 'Airtel Money') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payer phone number (optional)
                  </label>
                  <input
                    type="tel"
                    value={payerPhone}
                    onChange={e => setPayerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment reference (optional)
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={paymentReference}
                  onChange={e => setPaymentReference(e.target.value)}
                  placeholder="MoMo transaction ID, bank reference, or receipt number"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Amount (RWF)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={activeInvoice.balance ?? (activeInvoice.amountTotal - activeInvoice.amountPaid)}
                  value={payAmount}
                  onChange={e => setPayAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 text-sm font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  Remaining balance: {formatRWF(activeInvoice.balance ?? (activeInvoice.amountTotal - activeInvoice.amountPaid))}
                </span>
              </div>

              {paymentError && (
                <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{paymentError}</p>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isRecordingPayment}
                  className="w-full py-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Wallet className="w-4 h-4" />
                  <span>{isRecordingPayment ? 'Recording…' : `Record ${formatRWF(payAmount)} payment`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment receipt modal */}
      {receiptData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md rounded-3xl bg-white text-slate-900 p-6 sm:p-8 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setReceiptData(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1 border-b border-slate-200 pb-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Payment Recorded</h3>
              <p className="text-xs text-slate-500 font-mono">{receiptData.referenceNo}</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Student:</span>
                <span className="font-bold">{receiptData.studentName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Invoice:</span>
                <span className="font-mono font-bold">{receiptData.invoiceNo}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-bold">{receiptData.method}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-black text-emerald-700 text-sm">{formatRWF(receiptData.amount)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Recorded at:</span>
                <span className="font-mono text-[11px]">{receiptData.date}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setReceiptData(null);
              }}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
