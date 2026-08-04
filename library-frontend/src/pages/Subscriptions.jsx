import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { Award, Check, Edit3, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { selectUserRole } from '../store/authSlice.js'
import Button from '../components/Button.jsx'
import Modal from '../components/Modal.jsx'
import FormInput from '../components/FormInput.jsx'
import { CardSkeleton } from '../components/PageSkeleton.jsx'
import { getApiErrorMessage, subscriptionService, userSubscriptionService } from '../services/api.js'

const emptyPlan = {
  name: '', description: '', maxBooks: 3, maxLoanDays: 14,
  price: 0, validityDays: 30, maxRenewals: 0,
  priorityReservation: false, fineExempt: false,
}

export default function Subscriptions() {
  const role = useSelector(selectUserRole)
  const isAdmin = role === 'ADMIN'
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyPlan)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = isAdmin ? await subscriptionService.getAllPlans() : await subscriptionService.getPlans()
      setPlans(data)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyPlan)
    setModalOpen(true)
  }

  const openEdit = (plan) => {
    setEditing(plan)
    setForm({
      name: plan.name, description: plan.description || '',
      maxBooks: plan.maxBooks, maxLoanDays: plan.maxLoanDays,
      price: plan.price, validityDays: plan.validityDays,
      maxRenewals: plan.maxRenewals,
      priorityReservation: plan.priorityReservation,
      fineExempt: plan.fineExempt,
    })
    setModalOpen(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        maxBooks: Number(form.maxBooks),
        maxLoanDays: Number(form.maxLoanDays),
        validityDays: Number(form.validityDays),
        maxRenewals: Number(form.maxRenewals),
      }
      if (editing) {
        await subscriptionService.updatePlan(editing.id, { ...editing, ...payload })
        toast.success('Plan updated')
      } else {
        await subscriptionService.createPlan(payload)
        toast.success('Plan created')
      }
      setModalOpen(false)
      load()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (plan) => {
    if (!confirm(`Retire plan "${plan.name}"?`)) return
    try {
      await subscriptionService.deletePlan(plan.id)
      toast.success('Plan retired')
      load()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    }
  }

  const handlePurchase = async (planId) => {
    try {
      const sub = await userSubscriptionService.purchase(planId)
      toast.success(`Purchased ${sub.plan?.name || 'plan'} — pending payment`)
      load()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    }
  }

  const statusColor = (status) => {
    if (status === 'ACTIVE') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-100'
    if (status === 'INACTIVE') return 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-100'
    return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Subscription Plans</h1>
          <p className="text-sm text-gray-500">{isAdmin ? 'Manage membership plans and pricing' : 'Choose a plan that suits you'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" type="button" icon={RefreshCw} onClick={load} loading={loading}>Refresh</Button>
          {isAdmin && <Button icon={Plus} onClick={openCreate}>Add Plan</Button>}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 dark:border-gray-800 dark:bg-gray-900">
          <Award className="h-10 w-10 text-gray-400" />
          <p className="mt-3 text-lg font-semibold text-gray-800 dark:text-gray-100">No plans defined</p>
          {isAdmin && <Button className="mt-4" icon={Plus} onClick={openCreate}>Create first plan</Button>}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const isPopular = plan.price === Math.max(...plans.map((p) => p.price))
            const features = [
              { text: `Up to ${plan.maxBooks} books at a time`, included: true },
              { text: `${plan.maxLoanDays}-day loan period`, included: true },
              { text: `${plan.maxRenewals} renewals allowed`, included: plan.maxRenewals > 0 },
              { text: 'Priority reservations', included: plan.priorityReservation },
              { text: 'Fine exempt', included: plan.fineExempt },
            ]
            return (
              <div key={plan.id} className="aura h-full">
                <article className="relative flex h-full flex-col rounded-[calc(1rem-2px)] border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900">
                  {isAdmin && (
                    <div className="absolute right-3 top-3 z-10 flex gap-1">
                      <button type="button" onClick={() => openEdit(plan)} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"><Edit3 className="h-4 w-4" /></button>
                      <button type="button" onClick={() => handleDelete(plan)} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {isPopular && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-700 dark:text-amber-100">
                        Most Popular
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusColor(plan.status)}`}>{plan.status}</span>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-2">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{plan.name}</h3>
                    <div className="text-right">
                      <span className="text-xl font-semibold text-gray-900 dark:text-white">₹{plan.price}</span>
                      <p className="text-xs text-gray-400">/{plan.validityDays} days</p>
                    </div>
                  </div>
                  {plan.description && <p className="mt-1 text-xs text-gray-500">{plan.description}</p>}
                  <ul className="mt-6 flex flex-col gap-2 text-xs">
                    {features.map((f) => (
                      <li key={f.text} className={f.included ? '' : 'opacity-50'}>
                        <Check className={`me-2 inline-block size-4 ${f.included ? 'text-emerald-600' : 'text-gray-400'}`} />
                        <span className={f.included ? '' : 'line-through'}>{f.text}</span>
                      </li>
                    ))}
                  </ul>
                  {!isAdmin && plan.status === 'ACTIVE' && (
                    <div className="mt-6">
                      <Button className="w-full" onClick={() => handlePurchase(plan.id)}>Subscribe</Button>
                    </div>
                  )}
                </article>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Plan' : 'Create Plan'} size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="button" loading={saving} onClick={save}>Save</Button>
          </div>
        }>
        <div className="grid gap-4 md:grid-cols-2">
          <FormInput label="Name" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          <FormInput label="Price (₹)" type="number" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} />
          <FormInput label="Max Books" type="number" value={form.maxBooks} onChange={(e) => setForm(f => ({ ...f, maxBooks: e.target.value }))} />
          <FormInput label="Max Loan Days" type="number" value={form.maxLoanDays} onChange={(e) => setForm(f => ({ ...f, maxLoanDays: e.target.value }))} />
          <FormInput label="Validity (days)" type="number" value={form.validityDays} onChange={(e) => setForm(f => ({ ...f, validityDays: e.target.value }))} />
          <FormInput label="Max Renewals" type="number" value={form.maxRenewals} onChange={(e) => setForm(f => ({ ...f, maxRenewals: e.target.value }))} />
          <div className="md:col-span-2">
            <FormInput label="Description" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex items-center gap-4 md:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.priorityReservation} onChange={(e) => setForm(f => ({ ...f, priorityReservation: e.target.checked }))} />
              Priority reservations
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.fineExempt} onChange={(e) => setForm(f => ({ ...f, fineExempt: e.target.checked }))} />
              Fine exempt
            </label>
          </div>
        </div>
      </Modal>
    </div>
  )
}
