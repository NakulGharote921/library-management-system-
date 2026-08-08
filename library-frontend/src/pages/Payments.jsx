import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  DollarSign, RefreshCw, AlertTriangle, CheckCircle, Clock,
  Download, CreditCard, Crown, Printer, Receipt
} from 'lucide-react'
import { useSelector } from 'react-redux'
import { selectUserRole } from '../store/authSlice.js'
import Button from '../components/Button.jsx'
import Modal from '../components/Modal.jsx'
import PageSkeleton from '../components/PageSkeleton.jsx'
import { getApiErrorMessage, fineService, paymentService } from '../services/api.js'

const TYPE_ICONS = { FINE: DollarSign, SUBSCRIPTION: Crown }
const TYPE_COLORS = {
  FINE: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300',
  SUBSCRIPTION: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300',
}
const STATUS_FILLED = {
  SUCCESS: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-700 dark:text-emerald-100',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-700 dark:text-emerald-100',
  REFUNDED: 'bg-amber-100 text-amber-700 dark:bg-amber-700 dark:text-amber-100',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-700 dark:text-amber-100',
  UNPAID: 'bg-amber-100 text-amber-700 dark:bg-amber-700 dark:text-amber-100',
  WAIVED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-100',
  CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-100',
}
const STATUS_OUTLINE = {
  SUCCESS: 'border border-emerald-500 text-emerald-700 dark:text-emerald-100',
  PAID: 'border border-emerald-500 text-emerald-700 dark:text-emerald-100',
  REFUNDED: 'border border-amber-500 text-amber-700 dark:text-amber-100',
  FAILED: 'border border-red-500 text-red-700 dark:text-red-100',
  PENDING: 'border border-amber-500 text-amber-700 dark:text-amber-100',
  UNPAID: 'border border-amber-500 text-amber-700 dark:text-amber-100',
  WAIVED: 'border border-gray-500 text-gray-700 dark:text-gray-300',
  CANCELLED: 'border border-gray-500 text-gray-700 dark:text-gray-300',
}

function StatusIcon({ status }) {
  if (status === 'SUCCESS' || status === 'PAID') return <CheckCircle className="-ms-1 me-1.5 size-4" />
  if (status === 'REFUNDED') return <Receipt className="-ms-1 me-1.5 size-4" />
  if (status === 'FAILED') return <AlertTriangle className="-ms-1 me-1.5 size-4" />
  if (status === 'PENDING' || status === 'UNPAID') return <Clock className="-ms-1 me-1.5 size-4" />
  return <AlertTriangle className="-ms-1 me-1.5 size-4" />
}

function StatusLabel({ status }) {
  if (status === 'SUCCESS' || status === 'PAID') return 'Paid'
  if (status === 'REFUNDED') return 'Refunded'
  if (status === 'FAILED') return 'Failed'
  if (status === 'PENDING' || status === 'UNPAID') return 'Pending'
  return status
}

export default function Payments() {
  const role = useSelector(selectUserRole)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState(null)
  const [tab, setTab] = useState('all')
  const [typeFilter, setTypeFilter] = useState('')
  const [receiptTxn, setReceiptTxn] = useState(null)
  const receiptRef = useRef(null)
  const payingRef = useRef(false)
  const rzpSettledRef = useRef(false)
  const lastErrorToastRef = useRef({ msg: '', at: 0 })

  const showErrorOnce = useCallback((msg) => {
    const now = Date.now()
    if (lastErrorToastRef.current.msg === msg && now - lastErrorToastRef.current.at < 2500) return
    lastErrorToastRef.current = { msg, at: now }
    toast.error(msg)
  }, [])

  const load = useCallback(async (background) => {
    if (!background) setLoading(true)
    try {
      const statusParam = tab === 'pending' ? 'PENDING' : tab === 'success' ? 'SUCCESS' : undefined
      const [txnData, fineData] = await Promise.all([
        paymentService.getHistory({ status: statusParam, paymentType: typeFilter || undefined }),
        fineService.getMy().catch(() => []),
      ])
      const fines = fineData || []
      const fineById = new Map(fines.map((f) => [f.id, f]))
      const txnFineIds = new Set(txnData.map((t) => t.fine?.id).filter(Boolean))
      const enrichedTxns = txnData.map((t) => {
        const f = t.fine?.id != null ? fineById.get(t.fine.id) : null
        if (!f) return t
        return { ...t, label: `Fine — ${f.reason || `Fine #${f.id}`}`, detail: f.issuedBook?.book?.title || '' }
      })
      const fineRows = fines
        .filter((f) => !txnFineIds.has(f.id))
        .map((f) => ({
          id: `fine-${f.id}`,
          type: 'FINE',
          label: `Fine — ${f.reason || `Fine #${f.id}`}`,
          detail: f.issuedBook?.book?.title || '',
          amount: f.amount,
          status: f.status === 'UNPAID' ? 'PENDING' : f.status === 'PAID' ? 'SUCCESS' : f.status,
          date: f.createdAt,
          fineId: f.id,
          fine: f,
        }))
      setTransactions([...enrichedTxns, ...fineRows])
    } catch (e) {
      showErrorOnce(getApiErrorMessage(e))
    } finally {
      if (!background) setLoading(false)
    }
  }, [tab, typeFilter, showErrorOnce])

  useEffect(() => {
    ;(async () => {
      load()
    })()
  }, [load])

  const visibleTransactions = useMemo(() => {
    let result = transactions
    if (tab === 'success') {
      result = result.filter((t) => t.status === 'SUCCESS' || t.status === 'PAID')
    } else if (tab === 'pending') {
      result = result.filter((t) => t.status === 'PENDING' || t.status === 'FAILED')
    }
    if (typeFilter) {
      result = result.filter((t) => (t.type || t.paymentType) === typeFilter)
    }
    result.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
    return result
  }, [transactions, tab, typeFilter])

  const handlePay = async (fineId) => {
    if (payingRef.current) return
    payingRef.current = true
    rzpSettledRef.current = false
    setPayingId(fineId)
    const finish = () => {
      payingRef.current = false
      setPayingId(null)
    }
    try {
      const order = await paymentService.createOrder(fineId)
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TNDP3B2d4nerAJ',
        amount: order.amount * 100,
        currency: order.currency || 'INR',
        name: 'Library Management',
        description: `Fine #${fineId}`,
        order_id: order.razorpayOrderId,
        handler: async (response) => {
          if (rzpSettledRef.current) return
          rzpSettledRef.current = true
          try {
            const updated = await paymentService.verify(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
            )
            setTransactions((prev) =>
              prev.map((t) =>
                (t.fineId === fineId || t.fine?.id === fineId)
                  ? { ...t, status: 'SUCCESS', razorpayPaymentId: updated.razorpayPaymentId, razorpayOrderId: updated.razorpayOrderId, completedAt: updated.completedAt }
                  : t
              )
            )
            toast.success('Payment successful')
          } catch (err) {
            showErrorOnce(getApiErrorMessage(err))
          } finally {
            finish()
            load(true)
          }
        },
        modal: {
          ondismiss: () => {
            if (rzpSettledRef.current) return
            rzpSettledRef.current = true
            finish()
          },
        },
        prefill: { contact: '', email: '' },
        theme: { color: '#6366f1' },
      }
      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (response) => {
        if (rzpSettledRef.current) return
        rzpSettledRef.current = true
        const failedOrderId = response?.error?.metadata?.order_id || order.razorpayOrderId
        paymentService.markFailed(failedOrderId).catch(() => {})
        showErrorOnce(`Payment failed: ${response?.error?.description || 'Payment was not completed'}`)
        finish()
      })
      rzp.open()
    } catch (e) {
      showErrorOnce(getApiErrorMessage(e))
      finish()
      load(true)
    }
  }

  const handlePrint = () => {
    const el = receiptRef.current
    if (!el) return
    const win = window.open('', '', 'width=800,height=600')
    if (!win) return
    win.document.write(`<html><head><title>Receipt</title><style>
      body { font-family: system-ui, sans-serif; padding: 40px; color: #1f2937; }
      h1 { font-size: 20px; margin: 0 0 4px; }
      .meta { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
      table { width: 100%; border-collapse: collapse; font-size: 14px; }
      td { padding: 8px 0; }
      td:last-child { text-align: right; font-weight: 600; }
      .divider { border-top: 1px dashed #d1d5db; }
      .total td { padding-top: 12px; font-size: 16px; }
      .footer { margin-top: 32px; font-size: 12px; color: #9ca3af; text-align: center; }
    </style></head><body>${el.innerHTML}</body></html>`)
    win.document.close()
    win.print()
  }

  const handleWaive = async (fineId) => {
    const reason = prompt('Reason for waiving this fine:')
    if (!reason) return
    try {
      await fineService.waive(fineId, reason)
      setTransactions((prev) =>
        prev.map((t) =>
          (t.fineId === fineId || t.fine?.id === fineId)
            ? { ...t, status: 'WAIVED' }
            : t
        )
      )
      toast.success('Fine waived')
      load(true)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    }
  }

  const renderActions = (txn, isPendingFine, fineId) => (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {isPendingFine && role !== 'ADMIN' && (
        <Button size="sm" variant="primary" type="button" disabled={payingId !== null} loading={payingId === fineId} onClick={() => handlePay(fineId)}>
          Pay Now
        </Button>
      )}
      {isPendingFine && role === 'ADMIN' && (
        <Button size="sm" variant="secondary" type="button" onClick={() => handleWaive(fineId)}>
          Waive
        </Button>
      )}
      {(txn.status === 'SUCCESS' || txn.status === 'PAID') && (
        <button
          type="button"
          onClick={() => setReceiptTxn(txn)}
          className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-500 transition hover:bg-primary-50 hover:text-primary-700 dark:bg-gray-800 dark:hover:bg-primary-950 dark:hover:text-primary-300"
        >
          <Download className="h-3 w-3" /> Receipt
        </button>
      )}
    </div>
  )

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Payments</h1>
          <p className="text-sm text-gray-500">Payment history for fines and memberships</p>
        </div>
        <Button variant="secondary" type="button" icon={RefreshCw} onClick={() => load()} loading={loading}>
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {['all', 'success', 'pending'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                tab === t ? 'bg-primary-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        >
          <option value="">All Types</option>
          <option value="FINE">Fine Payments</option>
          <option value="SUBSCRIPTION">Membership Payments</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <PageSkeleton />
        </div>
      ) : visibleTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center dark:border-gray-800 dark:bg-gray-900">
          <CreditCard className="h-10 w-10 text-gray-400" />
          <p className="mt-3 text-lg font-semibold text-gray-800 dark:text-gray-100">No payments found</p>
          <p className="mt-1 text-sm text-gray-500">All transactions will appear here.</p>
        </div>
      ) : (
        <>
        <div className="hidden overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Description</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-400">Amount</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {visibleTransactions.map((txn) => {
                const TypeIcon = TYPE_ICONS[txn.type || txn.paymentType] || DollarSign
                const typeColor = TYPE_COLORS[txn.type || txn.paymentType] || TYPE_COLORS.FINE
                const statusColor = STATUS_FILLED[txn.status] || STATUS_FILLED.PENDING
                const date = new Date(txn.date || txn.createdAt || txn.completedAt)
                const isPendingFine = (txn.type || txn.paymentType) === 'FINE' && (txn.status === 'PENDING' || txn.status === 'FAILED')
                const fineId = txn.fineId || txn.fine?.id

                return (
                  <tr key={txn.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-400">
                      {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${typeColor}`}>
                        <TypeIcon className="h-3 w-3" />
                        {(txn.type || txn.paymentType) === 'SUBSCRIPTION' ? 'Membership' : 'Fine'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-50">{txn.label || txn.description || `${txn.paymentType || txn.type} Payment`}</p>
                      {txn.detail && <p className="text-xs text-gray-500">{txn.detail}</p>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-50">
                      ₹{txn.amount}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-sm whitespace-nowrap ${statusColor}`}>
                        <StatusIcon status={txn.status} />
                        <p className="text-sm whitespace-nowrap"><StatusLabel status={txn.status} /></p>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{renderActions(txn, isPendingFine, fineId)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 md:hidden">
          {visibleTransactions.map((txn) => {
            const TypeIcon = TYPE_ICONS[txn.type || txn.paymentType] || DollarSign
            const typeColor = TYPE_COLORS[txn.type || txn.paymentType] || TYPE_COLORS.FINE
            const statusColor = STATUS_FILLED[txn.status] || STATUS_FILLED.PENDING
            const date = new Date(txn.date || txn.createdAt || txn.completedAt)
            const isPendingFine = (txn.type || txn.paymentType) === 'FINE' && (txn.status === 'PENDING' || txn.status === 'FAILED')
            const fineId = txn.fineId || txn.fine?.id

            return (
              <div key={txn.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-50">{txn.label || txn.description || `${txn.paymentType || txn.type} Payment`}</p>
                    {txn.detail && <p className="mt-0.5 text-xs text-gray-500">{txn.detail}</p>}
                  </div>
                  <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor}`}>
                    <StatusIcon status={txn.status} />
                    <StatusLabel status={txn.status} />
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${typeColor}`}>
                      <TypeIcon className="h-3 w-3" />
                      {(txn.type || txn.paymentType) === 'SUBSCRIPTION' ? 'Membership' : 'Fine'}
                    </span>
                    <span className="shrink-0 text-xs text-gray-500">
                      {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <span className="shrink-0 font-semibold text-gray-900 dark:text-gray-50">₹{txn.amount}</span>
                </div>
                <div className="mt-3">{renderActions(txn, isPendingFine, fineId)}</div>
              </div>
            )
          })}
          </div>
        </>
      )}
      {/* Receipt Modal */}
      <Modal
        open={!!receiptTxn}
        onClose={() => setReceiptTxn(null)}
        title="Payment Receipt"
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" size="sm" type="button" icon={Printer} onClick={handlePrint}>
              Print
            </Button>
            <Button variant="primary" size="sm" type="button" onClick={() => setReceiptTxn(null)}>
              Close
            </Button>
          </div>
        }
      >
        {receiptTxn && (
          <div ref={receiptRef} className="space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">Library Management System</h2>
              <p className="text-xs text-gray-400">Payment Receipt</p>
            </div>

            <div className="rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-800/50">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-500">Receipt No.</p>
                  <p className="font-medium text-gray-900 dark:text-gray-50">
                    {receiptTxn.type === 'FINE' ? `FIN-${receiptTxn.fineId || receiptTxn.id}` : `SUB-${receiptTxn.subscription?.id || receiptTxn.id}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="font-medium text-gray-900 dark:text-gray-50">
                    {new Date(receiptTxn.date || receiptTxn.createdAt || receiptTxn.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Description</p>
                  <p className="font-medium text-gray-900 dark:text-gray-50">{receiptTxn.label || receiptTxn.description || `${receiptTxn.type || receiptTxn.paymentType} Payment`}</p>
                </div>
                {receiptTxn.detail && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Details</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{receiptTxn.detail}</p>
                  </div>
                )}
              </div>
            </div>

            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 text-gray-500">Type</td>
                  <td className="py-2 text-right font-medium text-gray-900 dark:text-gray-50">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_COLORS[receiptTxn.type || receiptTxn.paymentType] || TYPE_COLORS.FINE}`}>
                      {(receiptTxn.type || receiptTxn.paymentType) === 'SUBSCRIPTION' ? 'Membership' : 'Fine Payment'}
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 text-gray-500">Amount</td>
                  <td className="py-2 text-right text-lg font-bold text-gray-900 dark:text-gray-50">₹{receiptTxn.amount}</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 text-gray-500">Status</td>
                  <td className="py-2 text-right">
                    <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-sm whitespace-nowrap ${STATUS_OUTLINE[receiptTxn.status] || STATUS_OUTLINE.PENDING}`}>
                      <StatusIcon status={receiptTxn.status} />
                      <p className="text-sm whitespace-nowrap"><StatusLabel status={receiptTxn.status} /></p>
                    </span>
                  </td>
                </tr>
                {receiptTxn.razorpayOrderId && (
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 text-xs text-gray-400">Order ID</td>
                    <td className="py-2 text-right text-xs text-gray-500 font-mono">{receiptTxn.razorpayOrderId}</td>
                  </tr>
                )}
                {receiptTxn.razorpayPaymentId && (
                  <tr>
                    <td className="py-2 text-xs text-gray-400">Payment ID</td>
                    <td className="py-2 text-right text-xs text-gray-500 font-mono">{receiptTxn.razorpayPaymentId}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="pt-2 text-center text-xs text-gray-400">
              Thank you for using Library Management System
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}