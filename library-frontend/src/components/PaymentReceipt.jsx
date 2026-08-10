import { BookOpen, CheckCircle2 } from 'lucide-react'

const BRAND = '#2563EB'

function parseDate(value) {
  if (value == null || value === '') return null
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const dt = new Date(value)
  return Number.isNaN(dt.getTime()) ? null : dt
}

function fmtDate(value) {
  const d = parseDate(value)
  return d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
}

function fmtMoney(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return '₹0.00'
  const n = Number(amount)
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function safe(value) {
  if (value == null) return null
  const s = String(value).trim()
  return s === '' ? null : s
}

function InfoItem({ label, children }) {
  return (
    <div>
      <dt className="text-[11px] text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-800">{children}</dd>
    </div>
  )
}

export default function PaymentReceipt({ txn, memberName, memberEmail }) {
  const isSubscription = (txn.type || txn.paymentType) === 'SUBSCRIPTION'
  const sub = txn.subscription
  const plan = sub?.plan
  const status = txn.status === 'PAID' ? 'SUCCESS' : txn.status
  const paid = status === 'SUCCESS' || status === 'PAID'
  const receiptNumber = isSubscription ? `SUB-${sub?.id || txn.id}` : `FIN-${txn.fineId || txn.id}`
  const name = safe(memberName) || safe(txn.user?.name) || 'Member'
  const email = safe(memberEmail) || safe(txn.user?.email)
  const planName = isSubscription ? safe(plan?.name) || 'Membership' : safe(txn.label) || 'Fine Payment'
  const description = safe(txn.label) || safe(txn.description) || planName
  const detail = safe(txn.detail)
  const txDate = txn.date || txn.createdAt || txn.completedAt
  const orderId = safe(sub?.cashfreeOrderId) || safe(txn.cashfreeOrderId) || safe(txn.orderId)
  const paymentId = safe(sub?.cashfreePaymentId) || safe(txn.cashfreePaymentId) || safe(txn.paymentId)
  const validityDays = safe(plan?.validityDays)
  const maxBooks = safe(plan?.maxBooks)
  const maxLoanDays = safe(plan?.maxLoanDays)
  const purchasedOn = sub?.startDate || txDate
  const expiresOn = sub?.endDate
  const money = fmtMoney(txn.amount)
  const method = safe(txn.paymentMethod) || 'Manual'

  return (
    <div className="receipt w-full bg-white text-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: BRAND }}>
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-xl font-extrabold leading-tight text-slate-900">KodNest</p>
            <p className="text-[13px] font-semibold text-slate-600">Library Management System</p>
            <p className="text-[11px] text-slate-400">Digital Library Platform</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold uppercase tracking-[0.25em]" style={{ color: BRAND }}>Payment Receipt</p>
          <div className="mt-2 space-y-0.5 text-xs text-slate-600">
            <p>
              <span className="text-slate-400">Receipt No:</span>{' '}
              <span className="font-mono font-semibold text-slate-800">{receiptNumber}</span>
            </p>
            {fmtDate(txDate) && (
              <p>
                <span className="text-slate-400">Date:</span> <span className="font-semibold text-slate-800">{fmtDate(txDate)}</span>
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 h-1.5 w-full rounded-full" style={{ backgroundColor: BRAND }} />

      <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Billed To</p>
        <dl className="mt-2.5 grid gap-x-6 gap-y-2 sm:grid-cols-3">
          <InfoItem label="Member Name">{name}</InfoItem>
          {email && <InfoItem label="Email"><span className="break-all font-medium">{email}</span></InfoItem>}
          <InfoItem label="Membership">{planName}</InfoItem>
        </dl>
      </div>

      <div className="mt-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-widest text-slate-400">
              <th className="pb-2 font-semibold">Description</th>
              <th className="pb-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2.5">
                <p className="font-medium text-slate-800">{description}</p>
                {detail && <p className="mt-0.5 text-xs text-slate-400">{detail}</p>}
              </td>
              <td className="py-2.5 text-right font-semibold text-slate-800">{money}</td>
            </tr>
            <tr className="border-t border-dashed border-slate-200">
              <td className="py-1.5 text-slate-500">Subtotal</td>
              <td className="py-1.5 text-right text-slate-700">{money}</td>
            </tr>
            <tr>
              <td className="py-1.5 text-slate-500">Discount</td>
              <td className="py-1.5 text-right text-slate-700">{fmtMoney(0)}</td>
            </tr>
            <tr className="border-t-2 border-slate-800">
              <td className="py-2.5 text-sm font-bold uppercase tracking-wide text-slate-900">Total Paid</td>
              <td className="py-2.5 text-right text-base font-extrabold" style={{ color: BRAND }}>{money}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Payment Details</p>
        <dl className="mt-2.5 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 py-0.5">
            <dt className="text-slate-500">Payment Status</dt>
            <dd>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                  paid ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> {paid ? 'Paid' : safe(txn.status) || 'Completed'}
              </span>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-0.5">
            <dt className="text-slate-500">Payment Method</dt>
            <dd className="font-medium text-slate-800">{method}</dd>
          </div>
          {orderId && (
            <div className="flex items-center justify-between gap-3 py-0.5">
              <dt className="text-slate-500">Payment Reference</dt>
              <dd className="font-mono text-[11px] font-medium text-slate-800">{orderId}</dd>
            </div>
          )}
          {paymentId && (
            <div className="flex items-center justify-between gap-3 py-0.5">
              <dt className="text-slate-500">Gateway Reference</dt>
              <dd className="font-mono text-[11px] font-medium text-slate-800">{paymentId}</dd>
            </div>
          )}
          {fmtDate(txDate) && (
            <div className="flex items-center justify-between gap-3 py-0.5">
              <dt className="text-slate-500">Payment Date</dt>
              <dd className="font-medium text-slate-800">{fmtDate(txDate)}</dd>
            </div>
          )}
        </dl>
      </div>

      {isSubscription && (
        <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Membership Details</p>
          <dl className="mt-2.5 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            <InfoItem label="Plan">{planName}</InfoItem>
            {validityDays != null && <InfoItem label="Validity">{validityDays} Days</InfoItem>}
            {fmtDate(purchasedOn) && <InfoItem label="Membership Started">{fmtDate(purchasedOn)}</InfoItem>}
            {fmtDate(expiresOn) && <InfoItem label="Membership Ends">{fmtDate(expiresOn)}</InfoItem>}
            {maxBooks != null && <InfoItem label="Books You Can Borrow">{maxBooks}</InfoItem>}
            {maxLoanDays != null && <InfoItem label="Loan Period">{maxLoanDays} Days</InfoItem>}
          </dl>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
        <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Payment Successful
        </p>
        <p className="mt-0.5 text-xs text-emerald-600">
          {isSubscription ? 'Your membership has been activated successfully.' : 'Your payment has been processed successfully.'}
        </p>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-4 text-center">
        <p className="text-xs font-medium text-slate-600">Thank you for choosing KodNest Library.</p>
        <p className="mt-0.5 text-[11px] text-slate-400">For support: support@kodnest.com</p>
        <p className="mt-1.5 text-[10px] text-slate-300">This is a computer-generated receipt and does not require a signature.</p>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-slate-300">KodNest • Library Management System</p>
      </div>
    </div>
  )
}
