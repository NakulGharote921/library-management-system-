import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Award, BookOpen, Check, CircleCheck, Crown, RefreshCw, X } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '../components/Button.jsx'
import { CardSkeleton } from '../components/PageSkeleton.jsx'
import { getApiErrorMessage, paymentService, subscriptionService, userSubscriptionService } from '../services/api.js'
import { parsePlanFeatures } from '../utils/planFeatures.js'

function PlanCheckItem({ text, included }) {
  return (
    <li className={`flex items-center ${included ? '' : 'line-through decoration-gray-400 dark:decoration-gray-500'}`}>
      <CircleCheck className={`me-1.5 h-5 w-5 shrink-0 ${included ? 'text-primary-600 dark:text-primary-400' : 'text-gray-300 dark:text-gray-600'}`} />
      <span className={included ? '' : 'text-gray-400 dark:text-gray-500'}>{text}</span>
    </li>
  )
}

export default function MembershipPlans() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState([])
  const [activeSub, setActiveSub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(null)
  const payingRef = useRef(false)
  const settledRef = useRef(false)
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
    settledRef.current = false
    setPurchasing(planId)
    const finish = () => {
      payingRef.current = false
      setPurchasing(null)
    }
    try {
      let sub
      try {
        sub = await userSubscriptionService.purchase(planId)
      } catch (err) {
        console.debug('Subscription purchase failed for plan', planId, err)
        showErrorOnce(getApiErrorMessage(err))
        finish()
        load()
        return
      }
      let order
      try {
        order = await paymentService.createSubscriptionOrder(sub.id)
      } catch (err) {
        console.debug('Order creation failed for subscription', sub.id, err)
        showErrorOnce('Unable to create payment order. Please try again.')
        finish()
        load()
        return
      }
      console.debug('Cashfree order created for subscription', sub.id, { orderId: order.orderId, amount: order.amount, currency: order.currency })

      if (!order.amount || Number(order.amount) <= 0) {
        toast.success(`${sub.plan?.name || 'Plan'} activated! You can now borrow books.`)
        finish()
        load()
        return
      }

      if (!order.paymentSessionId) {
        console.warn('Cashfree order missing paymentSessionId', order)
        showErrorOnce('Unable to start payment. Please try again.')
        finish()
        load()
        return
      }

      let cashfree
      try {
        cashfree = window.Cashfree({ mode: import.meta.env.VITE_CASHFREE_MODE || 'sandbox' })
      } catch (err) {
        console.debug('Cashfree SDK could not be initialized', err)
        showErrorOnce('Payment could not be started. Please try again.')
        finish()
        load()
        return
      }

      const onSuccess = async (data) => {
        if (settledRef.current) return
        settledRef.current = true
        try {
          const cfOrderId = data?.order?.orderId || order.orderId
          const cfPaymentId = data?.payment?.cfPaymentId
          await paymentService.verify(cfOrderId, cfPaymentId)
          toast.success(`${sub.plan?.name || 'Plan'} activated! You can now borrow books.`)
        } catch (err) {
          console.debug('Payment verification failed for subscription', sub.id, err)
          showErrorOnce('Payment verification failed. Please contact support.')
        } finally {
          finish()
          load()
        }
      }

      cashfree.checkout({
        paymentSessionId: order.paymentSessionId,
        onSuccess,
        onFailure: (data) => {
          if (settledRef.current) return
          settledRef.current = true
          console.debug('Cashfree payment failed for subscription', sub.id, data)
          showErrorOnce('Payment failed. Please try again.')
          finish()
          load()
        },
        onClose: () => {
          if (settledRef.current) return
          settledRef.current = true
          finish()
          load()
        },
      })
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
            const status = plan.status || 'ACTIVE'
            const featureList = parsePlanFeatures(plan.features)
            const visibleFeatures = featureList.slice(0, 4)
            const hasMoreFeatures = featureList.length > 4

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
                    <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-700 dark:text-emerald-100'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {status}
                    </span>
                  </div>

                  <h5 className="mb-4 text-xl font-medium text-gray-900 dark:text-gray-50">
                    {plan.name}
                    {plan.name === 'Student' && <i className="fi fi-rs-badge ml-2 text-amber-500" aria-hidden="true" />}
                  </h5>
                  {plan.description && <p className="-mt-3 mb-4 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{plan.description}</p>}

                  <div className="flex items-baseline text-gray-900 dark:text-white">
                    <span className="text-5xl font-extrabold tracking-tight">{isFree ? 'Free' : `₹${plan.price}`}</span>
                    <span className="ms-2 text-sm font-medium text-gray-500 dark:text-gray-400">/{plan.validityDays} days</span>
                  </div>

                  <ul role="list" className="my-6 space-y-4 text-sm text-gray-600 dark:text-gray-300">
                    <PlanCheckItem text={`${plan.maxBooks} books at a time`} included={plan.maxBooks > 0} />
                    <PlanCheckItem text={`${plan.maxLoanDays}-day loan period`} included={plan.maxLoanDays > 0} />
                    <PlanCheckItem text={`${plan.maxRenewals} renewals`} included={plan.maxRenewals > 0} />
                    <PlanCheckItem text={`${plan.maxReservations} reservations`} included={plan.maxReservations > 0} />
                    <PlanCheckItem text="Priority reservations" included={Boolean(plan.priorityReservation)} />
                    <PlanCheckItem text="Fine exemption" included={Boolean(plan.fineExempt)} />
                    {visibleFeatures.map((f) => (
                      <PlanCheckItem key={f} text={f} included />
                    ))}
                  </ul>

                  {featureList.length === 0 && (
                    <p className="mt-3 text-xs italic text-gray-400 dark:text-gray-500">No additional features</p>
                  )}
                  {hasMoreFeatures && (
                    <button
                      type="button"
                      onClick={() => document.getElementById(`features-dialog-${plan.id}`)?.showModal()}
                      className="mt-2 self-start text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
                    >
                      View all {featureList.length} features
                    </button>
                  )}

                  <div className="mt-6 flex flex-1 flex-col justify-end">
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

                  <dialog
                    id={`features-dialog-${plan.id}`}
                    onClick={(e) => {
                      if (e.target === document.getElementById(`features-dialog-${plan.id}`)) document.getElementById(`features-dialog-${plan.id}`)?.close()
                    }}
                    className="m-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl backdrop:bg-gray-950/50 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">{plan.name} — All Features</h3>
                      <button
                        type="button"
                        onClick={() => document.getElementById(`features-dialog-${plan.id}`)?.close()}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                        aria-label="Close"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <ul className="mt-4 flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
                      {featureList.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </dialog>
                </article>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}