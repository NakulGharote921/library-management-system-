import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, RefreshCw, X } from 'lucide-react'
import Button from '../components/Button.jsx'
import { paymentService } from '../services/api.js'

export default function CashfreePaymentSuccess() {
  const navigate = useNavigate()
  const [state, setState] = useState('verifying')
  const [details, setDetails] = useState(null)
  const timerRef = useRef(null)
  const orderIdRef = useRef(null)

  const verify = useCallback(async () => {
    const orderId = new URLSearchParams(window.location.search).get('order_id')
    orderIdRef.current = orderId || null
    if (!orderId) {
      setState('failed')
      return
    }
    setState('verifying')
    try {
      const res = await paymentService.verify(orderId)
      if (res?.success && res?.paymentStatus === 'SUCCESS' && res?.membershipActivated) {
        setState('success')
        setDetails({ amount: res.amount, currency: res.currency })
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => navigate('/member/dashboard', { replace: true }), 1000)
      } else if (res?.paymentStatus === 'PENDING') {
        setState('pending')
      } else {
        setState('failed')
      }
    } catch (err) {
      console.debug('Payment verification failed on success page', err)
      setState('failed')
    }
  }, [navigate])

  useEffect(() => {
    if (window.self !== window.top) {
      window.top.location.href = window.location.href
      return
    }
    verify()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [verify])

  const goToPlans = () => navigate('/membership')

  const amountText = details?.amount != null
    ? `₹${Number(details.amount).toFixed(2)}${details.currency ? ` ${details.currency}` : ''} paid successfully`
    : null

  return (
    <div className="flex min-h-[60vh] items-center justify-center py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {state === 'verifying' && (
          <>
            <RefreshCw className="mx-auto h-10 w-10 animate-spin text-primary-600 dark:text-primary-400" />
            <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-gray-50">Verifying your payment</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Please wait while we confirm your payment with Cashfree.
            </p>
          </>
        )}
        {state === 'success' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-gray-50">Payment Successful</h2>
            {amountText && <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">{amountText}</p>}
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Your membership has been activated.</p>
            <p className="mt-4 text-sm font-medium text-primary-600 dark:text-primary-400">
              Redirecting to your dashboard...
            </p>
          </>
        )}
        {state === 'pending' && (
          <>
            <RefreshCw className="mx-auto h-10 w-10 animate-spin text-primary-600 dark:text-primary-400" />
            <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-gray-50">Payment Processing</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Your payment is still being processed. Please wait while we confirm your payment.
            </p>
            <Button className="mt-6 w-full" variant="secondary" onClick={goToPlans}>
              Back to Membership Plans
            </Button>
          </>
        )}
        {state === 'failed' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
              <X className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-gray-50">Payment Verification Failed</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              We could not verify your payment. Your membership has not been activated.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button className="flex-1" variant="primary" onClick={verify}>
                Try Again
              </Button>
              <Button className="flex-1" variant="secondary" onClick={goToPlans}>
                Back to Membership Plans
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
