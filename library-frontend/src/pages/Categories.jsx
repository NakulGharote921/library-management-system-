import { useEffect, useState } from 'react'
import { Plus, FolderOpen, Pencil, Trash2, Check, RefreshCw, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { selectUserRole } from '../store/authSlice.js'
import Button from '../components/Button.jsx'
import Modal from '../components/Modal.jsx'
import { CardSkeleton } from '../components/PageSkeleton.jsx'
import { getApiErrorMessage } from '../services/api.js'
import { useCategories } from '../store/CategoryContext.js'
import { categoryIcon, categoryColor, ICON_OPTIONS, COLOR_OPTIONS } from '../constants/categoryIcons.js'

const EMPTY_FORM = { name: '', description: '', iconName: 'FolderOpen', color: 'violet' }

export default function Categories() {
  const role = useSelector(selectUserRole)
  const isAdmin = role === 'ADMIN'
  const { categories, loading, error, refresh, createCategory, updateCategory, deleteCategory } = useCategories()

  const [addOpen, setAddOpen] = useState(false)
  const [editingCat, setEditingCat] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (error && !loading) {
      toast.error(getApiErrorMessage(error))
    }
  }, [error, loading])

  const openAdd = () => {
    setEditingCat(null)
    setForm(EMPTY_FORM)
    setAddOpen(true)
  }

  const openEdit = (cat) => {
    setEditingCat(cat)
    setForm({
      name: cat.name || '',
      description: cat.description || '',
      iconName: cat.iconName || 'FolderOpen',
      color: cat.color || 'violet',
    })
    setAddOpen(true)
  }

  const handleSave = async () => {
    const name = form.name.trim()
    if (!name) return
    setSaving(true)
    try {
      if (editingCat) {
        await updateCategory(editingCat.id, form)
        toast.success(`Category "${name}" updated successfully.`)
      } else {
        await createCategory(form)
        toast.success(`Category "${name}" added successfully.`)
      }
      setAddOpen(false)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteCategory(deleteTarget.id)
      toast.success(`Category "${deleteTarget.name}" removed.`)
      setDeleteTarget(null)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Categories</h1>
          <p className="text-sm text-gray-500">{isAdmin ? 'Manage and browse book categories' : 'Browse books by category'}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button icon={Plus} type="button" onClick={openAdd}>
              Add Category
            </Button>
          )}
          <Button variant="secondary" icon={RefreshCw} type="button" onClick={() => refresh()} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-white py-16 text-center dark:border-red-900/50 dark:bg-gray-900">
          <AlertTriangle className="h-10 w-10 text-red-400" />
          <p className="mt-3 text-lg font-semibold text-gray-800 dark:text-gray-100">Failed to load categories</p>
          <p className="mt-1 max-w-sm text-sm text-gray-500">{getApiErrorMessage(error)}</p>
          <Button variant="secondary" icon={RefreshCw} className="mt-6" onClick={() => refresh()}>
            Try Again
          </Button>
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center dark:border-gray-800 dark:bg-gray-900">
          <FolderOpen className="h-10 w-10 text-gray-400" />
          <p className="mt-3 text-lg font-semibold text-gray-800 dark:text-gray-100">No categories yet</p>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            {isAdmin ? 'Add your first category to organize the catalog.' : 'Categories will appear here once books are added.'}
          </p>
          {isAdmin && (
            <Button icon={Plus} className="mt-6" onClick={openAdd}>
              Add Category
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const Icon = categoryIcon(cat.iconName)
            const color = categoryColor(cat.color)

            return (
              <article
                key={cat.id}
                className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
              >
                <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${color} opacity-10 blur-2xl transition group-hover:opacity-20`} />
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${color} text-white shadow-inner`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{cat.name}</h3>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(cat)}
                        aria-label={`Edit ${cat.name}`}
                        className="rounded-lg p-1.5 text-gray-400 transition hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(cat)}
                        aria-label={`Remove ${cat.name}`}
                        className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                {cat.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{cat.description}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">{cat.count} book{cat.count !== 1 ? 's' : ''} available</p>
              </article>
            )
          })}
        </div>
      )}

      <Modal
        open={!!deleteTarget}
        title="Remove Category"
        size="sm"
        onClose={() => !deleting && setDeleteTarget(null)}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" type="button" disabled={deleting} onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" type="button" loading={deleting} onClick={handleDeleteCategory}>
              Remove
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Are you sure you want to remove the category <strong>{deleteTarget?.name}</strong>? Books in this category will keep their category name.
        </p>
      </Modal>

      <Modal
        open={addOpen}
        title={editingCat ? 'Edit Category' : 'Add Category'}
        size="md"
        onClose={() => setAddOpen(false)}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" type="button" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="button" loading={saving} disabled={!form.name.trim()} onClick={handleSave}>
              {editingCat ? 'Save Changes' : 'Add Category'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">Category Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g., Fantasy, Romance, Sports..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-gray-800 dark:bg-gray-900"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional short description..."
              rows={2}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-gray-800 dark:bg-gray-900"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">Icon</label>
            <div className="grid max-h-48 grid-cols-8 gap-1.5 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-900">
              {ICON_OPTIONS.map((name) => {
                const Icon = categoryIcon(name)
                return (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => setForm((f) => ({ ...f, iconName: name }))}
                    className={`flex h-10 items-center justify-center rounded-lg border transition ${
                      form.iconName === name
                        ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-300'
                        : 'border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">Color</label>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_OPTIONS.map((c) => {
                const gradient = categoryColor(c)
                const selected = form.color === c
                return (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-white transition ${
                      selected ? 'ring-2 ring-gray-900 ring-offset-2 dark:ring-white' : 'hover:scale-110'
                    }`}
                  >
                    {selected && <Check className="h-4 w-4" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
