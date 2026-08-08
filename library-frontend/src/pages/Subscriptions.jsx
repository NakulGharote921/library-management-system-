import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { Award, Check, Edit3, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { selectUserRole } from '../store/authSlice.js'
import Button from '../components/Button.jsx'
import Modal from '../components/Modal.jsx'
import FormInput from '../components/FormInput.jsx'
import { CardSkeleton } from '../components/PageSkeleton.jsx'
import { getApiErrorMessage, subscriptionService, userSubscriptionService } from '../services/api.js'

const emptyPlan = {
  name: '', description: '', maxBooks: '', maxLoanDays: '',
  price: 0, validityDays: '', maxRenewals: 0, maxReservations: 0,
  priorityReservation: false, fineExempt: false, featured: false,
  displayOrder: 0, status: 'ACTIVE', features: '',
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex items-center gap-2.5 text-sm font-medium text-gray-700 transition hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
    >
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
          checked ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-700'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </span>
      {label}
    </button>
  )
}

export default function Subscriptions() {
  const role = useSelector(selectUserRole)
  const isAdmin = role === 'ADMIN'
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyPlan)
  const [errors, setErrors] = useState({})
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
    setErrors({})
    setModalOpen(true)
  }

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((er) => ({ ...er, [key]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Plan name is required'
    if (form.price === '' || Number.isNaN(Number(form.price)) || Number(form.price) < 0) e.price = 'Enter a valid price'
    if (form.maxBooks === '' || Number.isNaN(Number(form.maxBooks)) || Number(form.maxBooks) < 1) e.maxBooks = 'At least 1'
    if (form.maxLoanDays === '' || Number.isNaN(Number(form.maxLoanDays)) || Number(form.maxLoanDays) < 1) e.maxLoanDays = 'At least 1 day'
    if (form.validityDays === '' || Number.isNaN(Number(form.validityDays)) || Number(form.validityDays) < 1) e.validityDays = 'At least 1 day'
    if (form.maxRenewals !== '' && (Number.isNaN(Number(form.maxRenewals)) || Number(form.maxRenewals) < 0)) e.maxRenewals = 'Cannot be negative'
    if (form.maxReservations !== '' && (Number.isNaN(Number(form.maxReservations)) || Number(form.maxReservations) < 0)) e.maxReservations = 'Cannot be negative'
    return e
  }

  const openEdit = (plan) => {
    setEditing(plan)
    setForm({
      name: plan.name, description: plan.description || '',
      maxBooks: plan.maxBooks, maxLoanDays: plan.maxLoanDays,
      price: plan.price, validityDays: plan.validityDays,
      maxRenewals: plan.maxRenewals, maxReservations: plan.maxReservations ?? 0,
      priorityReservation: Boolean(plan.priorityReservation),
      fineExempt: Boolean(plan.fineExempt),
      featured: Boolean(plan.featured),
      displayOrder: plan.displayOrder ?? 0,
      status: plan.status || 'ACTIVE',
      features: plan.features || '',
    })
    setErrors({})
    setModalOpen(true)
  }

  const save = async () => {
    const e = validate()
    if (Object.keys(e).length) {
      setErrors(e)
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        maxBooks: Number(form.maxBooks),
        maxLoanDays: Number(form.maxLoanDays),
        validityDays: Number(form.validityDays),
        maxRenewals: Number(form.maxRenewals),
        maxReservations: Number(form.maxReservations),
        displayOrder: Number(form.displayOrder),
        featured: Boolean(form.featured),
        status: form.status,
        features: typeof form.features === 'string' ? form.features.trim() : form.features,
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
    if (status === 'ACTIVE') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
    if (status === 'INACTIVE') return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
  }

  const statusDot = (status) => {
    if (status === 'ACTIVE') return 'bg-emerald-500'
    if (status === 'INACTIVE') return 'bg-gray-400'
    return 'bg-gray-300'
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 dark:border-gray-800 dark:bg-gray-900">
          <Award className="h-10 w-10 text-gray-400" />
          <p className="mt-3 text-lg font-semibold text-gray-800 dark:text-gray-100">No plans defined</p>
          {isAdmin && <Button className="mt-4" icon={Plus} onClick={openCreate}>Create first plan</Button>}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {plans.map((plan) => {
            const isPopular = Boolean(plan.featured)
            const customFeatures = typeof plan.features === 'string'
              ? plan.features.split(/\r?\n/).map((f) => f.trim()).filter(Boolean)
              : Array.isArray(plan.features) ? plan.features : []
            const rows = customFeatures.length
              ? customFeatures.map((text) => ({ label: text, value: null, included: true }))
              : [
                  { label: 'Max Books', value: plan.maxBooks, included: true },
                  { label: 'Loan Days', value: plan.maxLoanDays, included: true },
                  { label: 'Renewals', value: plan.maxRenewals, included: plan.maxRenewals > 0 },
                  { label: 'Reservations', value: plan.maxReservations ?? 0, included: (plan.maxReservations ?? 0) > 0 },
                ]
            return (
              <div key={plan.id} className="aura flex w-full max-w-[360px] justify-self-center">
                <article className="flex min-h-[240px] w-full flex-col gap-4 overflow-hidden rounded-2xl border border-gray-100 bg-white px-6 py-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {isPopular && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          Most Popular
                        </span>
                      )}
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusColor(plan.status)}`}>{plan.status}</span>
                    </div>
                    {isAdmin && (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          title="Edit plan"
                          aria-label="Edit plan"
                          onClick={() => openEdit(plan)}
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Retire plan"
                          aria-label="Retire plan"
                          onClick={() => handleDelete(plan)}
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{plan.name}</h3>
                      {plan.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{plan.description}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">₹{plan.price}</p>
                      <p className="text-sm text-gray-400">/{plan.validityDays} days</p>
                    </div>
                  </div>

                  <ul className="flex flex-col gap-2">
                    {rows.map((row) => (
                      <li
                        key={row.label}
                        className={`flex items-center gap-2 text-sm ${row.included ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}
                      >
                        <Check className={`h-4 w-4 shrink-0 ${row.included ? 'text-emerald-600' : 'text-gray-300 dark:text-gray-600'}`} />
                        <span className={row.included ? '' : 'line-through'}>
                          {row.label}{row.value != null ? `: ${row.value}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto">
                    {!isAdmin && plan.status === 'ACTIVE' ? (
                      <Button className="w-full" onClick={() => handlePurchase(plan.id)}>Subscribe</Button>
                    ) : (
                      <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-xs text-gray-400 dark:border-gray-800">
                        <span className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${statusDot(plan.status)}`} />
                          <span className="font-medium uppercase tracking-wide">{plan.status}</span>
                        </span>
                        {plan.createdAt && (
                          <span>
                            Created{' '}
                            {new Date(plan.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
        size="xl"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" loading={saving} onClick={save}>
              {editing ? 'Update Plan' : 'Save Plan'}
            </Button>
          </div>
        }
      >
        
        <div className="grid gap-6 md:grid-cols-2">
          <FormInput label="Plan Name" required error={errors.name} value={form.name} onChange={(e) => setField('name', e.target.value)} />
          <FormInput label="Price (₹)" type="number" required error={errors.price} value={form.price} onChange={(e) => setField('price', e.target.value)} />
          <FormInput label="Max Books" type="number" required error={errors.maxBooks} value={form.maxBooks} onChange={(e) => setField('maxBooks', e.target.value)} />
          <FormInput label="Max Loan Days" type="number" required error={errors.maxLoanDays} value={form.maxLoanDays} onChange={(e) => setField('maxLoanDays', e.target.value)} />
          <FormInput label="Validity (Days)" type="number" required error={errors.validityDays} value={form.validityDays} onChange={(e) => setField('validityDays', e.target.value)} />
          <FormInput label="Max Renewals" type="number" error={errors.maxRenewals} value={form.maxRenewals} onChange={(e) => setField('maxRenewals', e.target.value)} />
          <FormInput label="Max Reservations" type="number" error={errors.maxReservations} value={form.maxReservations} onChange={(e) => setField('maxReservations', e.target.value)} />
          <FormInput label="Display Order" type="number" value={form.displayOrder} onChange={(e) => setField('displayOrder', e.target.value)} />
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Status</span>
            <select
              value={form.status}
              onChange={(e) => setField('status', e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              {editing?.status === 'RETIRED' ? <option value="RETIRED">Retired</option> : null}
            </select>
          </label>
          <FormInput label="Description" value={form.description} onChange={(e) => setField('description', e.target.value)} />
          <div className="md:col-span-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Features (one per line)</span>
              <textarea
                rows={3}
                value={form.features}
                onChange={(e) => setField('features', e.target.value)}
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
                placeholder={'Up to 5 books at a time\nPriority pickups'}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 md:col-span-2">
            <Toggle checked={Boolean(form.priorityReservation)} onChange={(v) => setField('priorityReservation', v)} label="Priority reservations" />
            <Toggle checked={Boolean(form.fineExempt)} onChange={(v) => setField('fineExempt', v)} label="Fine exempt" />
            <Toggle checked={Boolean(form.featured)} onChange={(v) => setField('featured', v)} label="Featured (Most Popular)" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
