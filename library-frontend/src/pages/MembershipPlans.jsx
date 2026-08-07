import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Award, Check, Crown, RefreshCw, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '../components/Button.jsx'
import { CardSkeleton } from '../components/PageSkeleton.jsx'
import { getApiErrorMessage, paymentService, subscriptionService, userSubscriptionService } from '../services/api.js'

export default function MembershipPlans() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState([])
  const [activeSub, setActiveSub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(null)
  const payingRef = useRef(false)
  const rzpSettledRef = useRef(false)
  const lastErrorToastRef = useRef({ msg: '', at: 0 })

  const showErrorOnce = useCallback((msg) => {
    const now = Date.now()
    if (lastErrorToastRef.current.msg === msg && now - lastErrorToastRef.current.at < 2500) return
    lastErrorToastRef.current = { msg, at: now }
    toast.error(msg)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [plansData, activeData] = await Promise.all([
        subscriptionService.getPlans(),
        userSubscriptionService.getActive().catch(() => null),
      ])
      setPlans(plansData)
      setActiveSub(activeData || null)
    } catch (e) {
      showErrorOnce(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [showErrorOnce])

  useEffect(() => { load() }, [load])

  const handlePurchase = async (planId) => {
    if (payingRef.current) return
    payingRef.current = true
    rzpSettledRef.current = false
    setPurchasing(planId)
    const finish = () => {
      payingRef.current = false
      setPurchasing(null)
    }
    try {
      const sub = await userSubscriptionService.purchase(planId)
      const order = await paymentService.createSubscriptionOrder(sub.id)
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
        amount: order.amount * 100,
        currency: order.currency || 'INR',
        name: 'Library Management',
        description: `${sub.plan?.name || 'Membership'} Plan`,
        order_id: order.razorpayOrderId,
        handler: async (response) => {
          if (rzpSettledRef.current) return
          rzpSettledRef.current = true
          try {
            await paymentService.verify(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
            )
            toast.success(`${sub.plan?.name || 'Plan'} activated! You can now borrow books.`)
          } catch (err) {
            showErrorOnce(getApiErrorMessage(err))
          } finally {
            finish()
            load()
          }
        },
        modal: {
          ondismiss: () => {
            if (rzpSettledRef.current) return
            rzpSettledRef.current = true
            finish()
            load()
          },
        },
        prefill: { contact: '', email: '' },
        theme: { color: '#6366f1' },
      }
      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (response) => {
        if (rzpSettledRef.current) return
        rzpSettledRef.current = true
        showErrorOnce(`Payment failed: ${response.error.description}`)
        finish()
        load()
      })
      rzp.open()
    } catch (e) {
      showErrorOnce(getApiErrorMessage(e))
      finish()
      load()
    }
  }

  const daysLeft = activeSub
    ? Math.max(0, Math.ceil((new Date(activeSub.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Membership Plans</h1>
          <p className="text-sm text-gray-500">Choose a plan that suits your reading needs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" type="button" icon={RefreshCw} onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Active Subscription Banner */}
      {activeSub && (
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100/50 p-5 dark:border-emerald-800 dark:from-emerald-950 dark:to-emerald-900/50">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25">
                <Crown className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Active Plan</p>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">{activeSub.plan?.name || 'Active'} Membership</h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <span>Started {new Date(activeSub.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span>Expires {new Date(activeSub.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span className="font-semibold text-emerald-600">{daysLeft} days remaining</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm text-gray-500">{activeSub.plan?.maxBooks || 0} books allowed</p>
                <p className="text-sm text-gray-500">{activeSub.plan?.maxLoanDays || 0}-day loan period</p>
              </div>
              <Button variant="primary" size="sm" type="button" icon={BookOpen} onClick={() => navigate('/books')}>
                Browse Books
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-20 dark:border-gray-800 dark:bg-gray-900">
          <Award className="h-12 w-12 text-gray-300" />
          <p className="mt-4 text-lg font-semibold text-gray-600 dark:text-gray-400">No plans available</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const isCurrentPlan = activeSub?.plan?.id === plan.id
            const isFree = plan.price === 0
            const isPopular = Boolean(plan.featured) && !isCurrentPlan
            const customFeatures = typeof plan.features === 'string'
              ? plan.features.split(/\r?\n/).map((f) => f.trim()).filter(Boolean)
              : Array.isArray(plan.features) ? plan.features : []
            const features = customFeatures.length
              ? customFeatures.map((text) => ({ text, included: true }))
              : [
                  { text: `Up to ${plan.maxBooks} books at a time`, included: true },
                  { text: `${plan.maxLoanDays}-day loan period`, included: true },
                  { text: plan.maxRenewals > 0 ? `Up to ${plan.maxRenewals} renewals` : 'Renewals', included: plan.maxRenewals > 0 },
                  { text: `Up to ${plan.maxReservations ?? 0} reservations`, included: (plan.maxReservations ?? 0) > 0 },
                  { text: 'Priority reservations', included: plan.priorityReservation },
                  { text: 'Fine exempt', included: plan.fineExempt },
                ]

            return (
              <div key={plan.id} className="relative h-full">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-[conic-gradient(from_0deg,#f59e0b,#ef4444,#a855f7,#3b82f6,#10b981,#f59e0b)] opacity-25 blur-2xl"
                />
                <article className={`relative flex h-full flex-col rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:bg-gray-900 ${
                  isCurrentPlan
                    ? 'border-emerald-300 ring-2 ring-emerald-400/50 dark:border-emerald-700'
                    : isPopular
                    ? 'border-amber-200 dark:border-amber-800'
                    : 'border-gray-100 dark:border-gray-800'
                }`}>
                  <div className="flex flex-wrap items-center gap-2">
                    {isCurrentPlan && (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-700 dark:text-emerald-100">
                        Current Plan
                      </span>
                    )}
                    {isPopular && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-700 dark:text-amber-100">
                        Most Popular
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-baseline justify-between gap-2">
                    <h2 className="flex items-center text-2xl font-bold text-gray-900 dark:text-gray-50">
                      {plan.name}
                      {plan.name === 'Student' && <i className="fi fi-rs-badge ml-2 text-amber-500" aria-hidden="true" />}
                    </h2>
                    <span className="text-xl font-semibold text-gray-900 dark:text-white">₹{plan.price}</span>
                  </div>
                  <p className="text-xs text-gray-400">/{plan.validityDays} days</p>
                  {plan.description && <p className="mt-1 text-xs text-gray-500">{plan.description}</p>}

                  <ul className="mt-6 flex flex-1 flex-col gap-2 text-xs">
                    {features.map((f) => (
                      <li key={f.text} className={f.included ? '' : 'opacity-50'}>
                        <Check className={`me-2 inline-block size-4 ${f.included ? 'text-emerald-600' : 'text-gray-400'}`} />
                        <span className={f.included ? '' : 'line-through'}>{f.text}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6">
                    {isCurrentPlan ? (
                      <Button className="w-full" variant="secondary" disabled>
                        <Check className="h-4 w-4" /> Active
                      </Button>
                    ) : isFree ? (
                      <Button className="w-full" variant="secondary" onClick={() => handlePurchase(plan.id)} disabled={purchasing !== null} loading={purchasing === plan.id}>
                        Subscribe
                      </Button>
                    ) : (
                      <Button className="w-full" variant="primary" onClick={() => handlePurchase(plan.id)} disabled={purchasing !== null} loading={purchasing === plan.id}>
                        Subscribe
                      </Button>
                    )}
                  </div>
                </article>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}